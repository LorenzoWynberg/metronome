// Test doubles for the audio layer: a controllable AudioContext and a tick
// source fired by hand. Imported by tests only; nothing here makes sound.

import type { TickSource } from './scheduler';
import { TICK_MS } from './scheduler';

type ParamCall = [
  method: 'set' | 'linear' | 'exponential',
  value: number,
  time: number,
];

export class FakeAudioParam {
  readonly calls: ParamCall[] = [];
  setValueAtTime(value: number, time: number): this {
    this.calls.push(['set', value, time]);
    return this;
  }
  linearRampToValueAtTime(value: number, time: number): this {
    this.calls.push(['linear', value, time]);
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    this.calls.push(['exponential', value, time]);
    return this;
  }
  /** The highest value any call sets or ramps to. */
  peak(): number {
    return Math.max(...this.calls.map((c) => c[1]));
  }
}

class FakeNode {
  readonly connections: unknown[] = [];
  connect<T>(destination: T): T {
    this.connections.push(destination);
    return destination;
  }
}

export class FakeOscillator extends FakeNode {
  readonly frequency = new FakeAudioParam();
  readonly startCalls: number[] = [];
  /** Each `stop` call's argument; `undefined` means "stop now". */
  readonly stopCalls: (number | undefined)[] = [];
  start(time: number): void {
    this.startCalls.push(time);
  }
  stop(time?: number): void {
    this.stopCalls.push(time);
  }
  get startTime(): number {
    return this.startCalls[0] ?? Number.NaN;
  }
  /** The frequency the click was set to. */
  get pitch(): number {
    return this.frequency.calls[0]?.[1] ?? Number.NaN;
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeAudioParam();
}

type ContextState = AudioContextState | 'interrupted';

export class FakeAudioContext {
  currentTime = 0;
  state: ContextState;
  readonly destination = { name: 'destination' };
  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  resumeCalls = 0;
  closeCalls = 0;
  /** Replaces `resume()`'s behaviour, e.g. one that never settles or rejects. */
  resumeImpl: (() => Promise<void>) | undefined;
  private readonly listeners: (() => void)[] = [];

  constructor(state: ContextState = 'suspended') {
    this.state = state;
  }

  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  async resume(): Promise<void> {
    this.resumeCalls++;
    if (this.resumeImpl) return this.resumeImpl();
    this.changeState('running');
  }
  async close(): Promise<void> {
    this.closeCalls++;
    this.changeState('closed');
  }
  addEventListener(type: string, listener: () => void): void {
    if (type === 'statechange') this.listeners.push(listener);
  }
  removeEventListener(type: string, listener: () => void): void {
    if (type !== 'statechange') return;
    const i = this.listeners.indexOf(listener);
    if (i >= 0) this.listeners.splice(i, 1);
  }
  /** How many `statechange` listeners are attached. */
  get listenerCount(): number {
    return this.listeners.length;
  }
  /** Sets the state and dispatches `statechange`, as a browser does. */
  changeState(state: ContextState): void {
    if (state === this.state) return;
    this.state = state;
    for (const l of [...this.listeners]) l();
  }
  startTimes(): number[] {
    return this.oscillators.map((o) => o.startTime);
  }
  /** The fake typed as the real thing, for code that takes an AudioContext. */
  asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}

export class ManualTickSource implements TickSource {
  running = false;
  intervalMs: number | undefined;
  startCalls = 0;
  stopCalls = 0;
  onTickCalls = 0;
  disposeCalls = 0;
  disposed = false;
  private cb: (() => void) | undefined;
  private errorCb: ((error: unknown) => void) | undefined;

  start(intervalMs: number): void {
    this.running = true;
    this.intervalMs = intervalMs;
    this.startCalls++;
  }
  stop(): void {
    this.running = false;
    this.stopCalls++;
  }
  dispose(): void {
    this.running = false;
    this.disposed = true;
    this.disposeCalls++;
  }
  onTick(cb: () => void): void {
    this.cb = cb;
    this.onTickCalls++;
  }
  onError(cb: (error: unknown) => void): void {
    this.errorCb = cb;
  }
  /** Reports a failure, as a worker that failed to load would. */
  fail(error: unknown = new Error('tick source failed')): void {
    this.errorCb?.(error);
  }
  /** Delivers one tick, whether or not the source is started. */
  fire(): void {
    this.cb?.();
  }
}

/**
 * Advances the fake clock by `seconds` in `TICK_MS` steps, firing a tick at
 * each step and calling `afterTick` after it.
 */
export function runFor(
  ctx: FakeAudioContext,
  ticks: ManualTickSource,
  seconds: number,
  afterTick?: () => void,
): void {
  const steps = Math.round((seconds * 1000) / TICK_MS);
  for (let i = 0; i < steps; i++) {
    ctx.currentTime += TICK_MS / 1000;
    ticks.fire();
    afterTick?.();
  }
}
