import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../state/store';
import { createEngine, RESUME_TIMEOUT_MS } from './engine';
import type { SchedulerWorkerRequest } from './scheduler.worker';
import { FakeAudioContext, ManualTickSource, runFor } from './testing';

function setup(
  initialState: ConstructorParameters<typeof FakeAudioContext>[0] = 'suspended',
) {
  const store = createStore();
  const ctx = new FakeAudioContext(initialState);
  const ticks = new ManualTickSource();
  const createContext = vi.fn(() => ctx.asAudioContext());
  const createTickSource = vi.fn(() => ticks);
  // `resume()` is bounded by a signal the test aborts by hand.
  const timeouts: { ms: number; abort: () => void }[] = [];
  const timeoutSignal = vi.fn((ms: number) => {
    const controller = new AbortController();
    timeouts.push({ ms, abort: () => controller.abort() });
    return controller.signal;
  });
  const engine = createEngine(store, {
    createContext,
    createTickSource,
    timeoutSignal,
  });
  return {
    store,
    ctx,
    ticks,
    engine,
    createContext,
    createTickSource,
    timeouts,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('engine', () => {
  it('creates no AudioContext or tick source before the first start()', () => {
    const { engine, createContext, createTickSource } = setup();
    expect(createContext).not.toHaveBeenCalled();
    expect(createTickSource).not.toHaveBeenCalled();
    expect(engine.currentTime()).toBe(0);
  });

  it('start() creates the context, resumes it when suspended, starts ticking and sets running', async () => {
    const { store, ctx, ticks, engine, createContext } = setup('suspended');
    ctx.currentTime = 3;
    await engine.start();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.resumeCalls).toBe(1);
    expect(ticks.running).toBe(true);
    expect(store.getState().running).toBe(true);
    expect(engine.currentTime()).toBe(3);
    expect(ctx.startTimes()).toHaveLength(1);
    expect(ctx.startTimes()[0]).toBeCloseTo(3.05, 9);
  });

  it('does not resume a context that is already running', async () => {
    const { ctx, engine } = setup('running');
    await engine.start();
    expect(ctx.resumeCalls).toBe(0);
  });

  it('a second start() makes no second context and no duplicate beats', async () => {
    const { ctx, ticks, engine, createContext } = setup('suspended');
    // Twice before the first resolves, then again while running.
    await Promise.all([engine.start(), engine.start()]);
    await engine.start();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ctx.resumeCalls).toBe(1);
    expect(ticks.startCalls).toBe(1);
    expect(ctx.oscillators).toHaveLength(1);
    runFor(ctx, ticks, 1);
    const times = ctx.startTimes();
    expect(new Set(times).size).toBe(times.length);
  });

  it('start() asks for the playback audio session when navigator.audioSession exists', async () => {
    const audioSession = { type: 'auto' };
    vi.stubGlobal('navigator', { audioSession });
    const { engine } = setup();
    await engine.start();
    expect(audioSession.type).toBe('playback');
  });

  it('start() works when navigator.audioSession is absent', async () => {
    vi.stubGlobal('navigator', {});
    const { store, engine } = setup();
    await expect(engine.start()).resolves.toBeUndefined();
    expect(store.getState().running).toBe(true);
  });

  it.each(['suspended', 'interrupted', 'closed'] as const)(
    'stops when the context becomes %s during playback',
    async (state) => {
      const { store, ctx, ticks, engine } = setup();
      await engine.start();
      ctx.changeState(state);

      expect(ticks.running).toBe(false);
      expect(store.getState().running).toBe(false);
      runFor(ctx, ticks, 1);
      expect(ctx.oscillators).toHaveLength(1);
    },
  );

  it('stop() stops ticking, cuts future clicks, empties the beat queue and clears running', async () => {
    const { store, ctx, ticks, engine } = setup();
    await engine.start();
    runFor(ctx, ticks, 1); // beats at 0.05, 0.55, 1.05; now 1.0
    const [past, , future] = ctx.oscillators;

    engine.stop();

    expect(ticks.running).toBe(false);
    expect(future?.startTime).toBeGreaterThan(ctx.currentTime);
    expect(future?.stopCalls).toEqual([expect.any(Number), undefined]);
    expect(past?.stopCalls).toHaveLength(1);
    expect(engine.beatQueue.takeDue(Infinity)).toEqual([]);
    expect(store.getState().running).toBe(false);
  });

  it('stops when something else sets running: false in the store', async () => {
    const { store, ctx, ticks, engine } = setup();
    await engine.start();
    runFor(ctx, ticks, 0.2);

    store.setState({ running: false });

    expect(ticks.running).toBe(false);
    expect(engine.beatQueue.takeDue(Infinity)).toEqual([]);
  });

  it('a stop() during the resume of a start() keeps it stopped', async () => {
    const { store, ticks, engine } = setup('suspended');
    const starting = engine.start();
    engine.stop();
    await starting;

    expect(ticks.running).toBe(false);
    expect(store.getState().running).toBe(false);
  });

  it('can start again after stopping, reusing the context', async () => {
    const { ctx, ticks, engine, createContext } = setup();
    await engine.start();
    engine.stop();
    ctx.currentTime = 5;
    await engine.start();

    expect(createContext).toHaveBeenCalledTimes(1);
    expect(ticks.running).toBe(true);
    expect(ctx.startTimes().at(-1)).toBeCloseTo(5.05, 9);
  });

  it('can start again after the tick source failed to start', async () => {
    const { store, ticks, engine } = setup();
    const startTicks = ticks.start.bind(ticks);
    ticks.start = () => {
      throw new Error('worker blocked');
    };
    await expect(engine.start()).rejects.toThrow('worker blocked');
    expect(store.getState().running).toBe(false);

    ticks.start = startTicks;
    await engine.start();
    expect(ticks.running).toBe(true);
    expect(store.getState().running).toBe(true);
  });

  it('resumes an interrupted context before playing', async () => {
    const { store, ctx, engine } = setup('interrupted');
    await engine.start();
    expect(ctx.resumeCalls).toBe(1);
    expect(store.getState().running).toBe(true);
  });

  it('rejects, and leaves running false, when the context does not start', async () => {
    const { store, ctx, ticks, engine } = setup('interrupted');
    ctx.resume = async () => {
      ctx.resumeCalls++; // iOS keeps the context interrupted
    };
    await expect(engine.start()).rejects.toThrow(/interrupted/);
    expect(ticks.running).toBe(false);
    expect(store.getState().running).toBe(false);
  });

  it('replaces a closed context on the next start()', async () => {
    const store = createStore();
    const first = new FakeAudioContext('running');
    const second = new FakeAudioContext('running');
    const contexts = [first, second];
    const sources: ManualTickSource[] = [];
    const createTickSource = vi.fn(() => {
      // The old source is gone before the next one is made.
      expect(sources.at(-1)?.disposeCalls ?? 1).toBe(1);
      const source = new ManualTickSource();
      sources.push(source);
      return source;
    });
    const engine = createEngine(store, {
      createContext: () => contexts.shift()!.asAudioContext(),
      createTickSource,
    });
    await engine.start();
    first.changeState('closed');
    expect(store.getState().running).toBe(false);

    await engine.start();
    expect(store.getState().running).toBe(true);
    expect(second.oscillators).toHaveLength(1);
    expect(sources).toHaveLength(2);
    expect(sources[0]?.disposed).toBe(true);
    expect(sources[0]?.disposeCalls).toBe(1);
    expect(sources[1]?.disposed).toBe(false);
    expect(first.listenerCount).toBe(0);
  });

  it('closes the context when the tick source throws and makes a fresh one on retry', async () => {
    const store = createStore();
    const first = new FakeAudioContext('running');
    const second = new FakeAudioContext('running');
    const contexts = [first, second];
    const closed: FakeAudioContext[] = [];
    for (const c of contexts) {
      Object.assign(c, {
        close: () => {
          closed.push(c);
          return Promise.resolve();
        },
        removeEventListener: () => undefined,
      });
    }
    let calls = 0;
    const createContext = vi.fn(() => contexts.shift()!.asAudioContext());
    const engine = createEngine(store, {
      createContext,
      createTickSource: () => {
        if (calls++ === 0) throw new Error('worker blocked');
        return new ManualTickSource();
      },
    });
    await expect(engine.start()).rejects.toThrow(/worker blocked/);
    expect(closed).toEqual([first]);
    expect(store.getState().running).toBe(false);

    await engine.start();
    expect(createContext).toHaveBeenCalledTimes(2);
    expect(closed).toEqual([first]);
    expect(store.getState().running).toBe(true);
  });

  it('stop() still clears the queue and sets running false when the tick source throws', async () => {
    const { store, ticks, engine } = setup('running');
    await engine.start();
    ticks.stop = () => {
      throw new Error('stop failed');
    };
    expect(() => engine.stop()).toThrow(/stop failed/);
    expect(store.getState().running).toBe(false);
    expect(engine.beatQueue.takeDue(Infinity)).toEqual([]);
  });

  it('stops when the tick source fails during playback', async () => {
    const { store, ctx, ticks, engine } = setup();
    await engine.start();
    ticks.fail();

    expect(ticks.running).toBe(false);
    expect(store.getState().running).toBe(false);
    expect(engine.beatQueue.takeDue(Infinity)).toEqual([]);
    runFor(ctx, ticks, 1);
    expect(ctx.oscillators).toHaveLength(1);
  });
});

describe('engine failure paths', () => {
  it('dispose() stops playback, disposes the source, closes the context and drops listeners', async () => {
    const { store, ctx, ticks, engine } = setup();
    const onError = vi.fn();
    engine.onError(onError);
    await engine.start();

    engine.dispose();

    expect(store.getState().running).toBe(false);
    expect(ticks.disposeCalls).toBe(1);
    expect(ctx.closeCalls).toBe(1);
    expect(ctx.listenerCount).toBe(0);
    ticks.fail();
    expect(onError).not.toHaveBeenCalled();
    expect(engine.currentTime()).toBe(0);
  });

  it('dispose() before any start() does not throw', () => {
    const { engine } = setup();
    expect(() => engine.dispose()).not.toThrow();
  });

  it('a tick that throws stops playback, tells onError listeners and ticks no more', async () => {
    const { store, ctx, ticks, engine } = setup();
    const onError = vi.fn();
    const off = engine.onError(onError);
    await engine.start();
    runFor(ctx, ticks, 0.5);
    const failure = new Error('store broke');
    const getState = store.getState;
    store.getState = () => {
      throw failure;
    };

    ctx.currentTime += 0.025;
    ticks.fire();
    store.getState = getState;
    expect(store.getState().running).toBe(false);

    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(ticks.running).toBe(false);
    const scheduled = ctx.oscillators.length;
    runFor(ctx, ticks, 1);
    expect(ctx.oscillators).toHaveLength(scheduled);
    expect(onError).toHaveBeenCalledTimes(1);
    off();
  });

  it('tells onError listeners when the tick source dies, until they unsubscribe', async () => {
    const { ticks, engine } = setup();
    const onError = vi.fn();
    const off = engine.onError(onError);
    await engine.start();
    const failure = new Error('worker crashed');
    ticks.fail(failure);
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);

    off();
    await engine.start();
    ticks.fail();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('a resume that never settles rejects after the timeout and leaves running false', async () => {
    const { store, ctx, ticks, engine, timeouts } = setup('suspended');
    ctx.resumeImpl = () => new Promise<void>(() => undefined);
    const starting = engine.start();
    const settled = expect(starting).rejects.toThrow(/resume timed out/);

    expect(timeouts.map((t) => t.ms)).toEqual([RESUME_TIMEOUT_MS]);
    timeouts[0]?.abort();
    await settled;

    expect(store.getState().running).toBe(false);
    expect(ticks.running).toBe(false);
  });

  it('a resume that settles after the timeout starts nothing', async () => {
    const { store, ctx, ticks, engine, timeouts } = setup('suspended');
    let resolveResume = (): void => undefined;
    ctx.resumeImpl = () =>
      new Promise<void>((resolve) => {
        resolveResume = () => {
          ctx.changeState('running');
          resolve();
        };
      });
    const starting = engine.start();
    const settled = expect(starting).rejects.toThrow(/resume timed out/);
    timeouts[0]?.abort();
    await settled;

    resolveResume();
    await Promise.resolve();
    expect(ticks.running).toBe(false);
    expect(store.getState().running).toBe(false);
  });

  it('a rejected resume rejects the start, leaves running false and allows a retry', async () => {
    const { store, ctx, ticks, engine } = setup('suspended');
    ctx.resumeImpl = () => Promise.reject(new Error('resume blocked'));
    await expect(engine.start()).rejects.toThrow('resume blocked');
    expect(store.getState().running).toBe(false);
    expect(ticks.running).toBe(false);

    ctx.resumeImpl = undefined;
    await engine.start();
    expect(store.getState().running).toBe(true);
  });
});

describe('engine with the default Worker tick source', () => {
  class FakeWorker {
    static instances: FakeWorker[] = [];
    readonly posted: SchedulerWorkerRequest[] = [];
    onmessage: ((event: { data: { type: 'tick' } }) => void) | null = null;
    constructor(
      readonly url: URL | string,
      readonly options?: WorkerOptions,
    ) {
      FakeWorker.instances.push(this);
    }
    postMessage(message: SchedulerWorkerRequest): void {
      this.posted.push(message);
    }
  }

  it('creates the module worker on start(), schedules on its ticks and stops it', async () => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    const store = createStore();
    const ctx = new FakeAudioContext('suspended');
    const engine = createEngine(store, {
      createContext: () => ctx.asAudioContext(),
    });
    expect(FakeWorker.instances).toHaveLength(0);

    await engine.start();

    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0]!;
    expect(String(worker.url)).toMatch(/scheduler\.worker\.ts/);
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.posted).toEqual([{ type: 'start', intervalMs: 25 }]);

    ctx.currentTime = 0.5;
    worker.onmessage?.({ data: { type: 'tick' } });
    expect(ctx.oscillators).toHaveLength(2);

    engine.stop();
    expect(worker.posted.at(-1)).toEqual({ type: 'stop' });
    await engine.start();
    expect(FakeWorker.instances).toHaveLength(1);
  });
});
