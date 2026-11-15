// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBeatQueue, type BeatEvent } from '../audio/beatQueue';
import { createStore } from '../state/store';
import { mountBeatIndicator } from './beatIndicator';

let pending: Map<number, () => void>;
let nextId: number;
const cancel = vi.fn();

function runFrame(): void {
  const cbs = [...pending.values()];
  pending.clear();
  cbs.forEach((cb) => cb());
}

beforeEach(() => {
  pending = new Map();
  nextId = 1;
  cancel.mockClear();
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    const id = nextId++;
    pending.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancel(id);
    pending.delete(id);
  });
});

afterEach(() => vi.unstubAllGlobals());

function setup(timeSignature: '2/4' | '3/4' | '4/4' | '6/8' = '4/4') {
  const store = createStore();
  store.setState({ timeSignature });
  const beatQueue = createBeatQueue();
  let now = 0;
  const currentTime = vi.fn(() => now);
  const el = document.createElement('div');
  const off = mountBeatIndicator(el, {
    store,
    engine: { currentTime, beatQueue },
  });
  const ev = (e: Partial<BeatEvent> & { beat: number }): BeatEvent => ({
    audioTime: 1,
    level: 'normal',
    beatsPerBar: 4,
    ...e,
  });
  return {
    store,
    beatQueue,
    el,
    off,
    currentTime,
    ev,
    setNow: (t: number) => (now = t),
  };
}

const cells = (el: HTMLElement) => [...el.querySelectorAll('.beat-cell')];
const litIndexes = (el: HTMLElement) =>
  cells(el).flatMap((c, i) => (c.classList.contains('is-lit') ? [i] : []));

describe('mountBeatIndicator', () => {
  it('renders one cell per beat and follows the meter while stopped', () => {
    const { el, store } = setup('4/4');
    expect(cells(el)).toHaveLength(4);
    expect(cells(el).map((c) => (c as HTMLElement).dataset.level)).toEqual([
      'strong',
      'normal',
      'normal',
      'normal',
    ]);
    store.setState({ timeSignature: '6/8' });
    expect(cells(el).map((c) => (c as HTMLElement).dataset.level)).toContain(
      'medium',
    );
    expect(cells(el)).toHaveLength(6);
    store.setState({ timeSignature: '2/4' });
    expect(cells(el)).toHaveLength(2);
    store.setState({ timeSignature: '3/4' });
    expect(cells(el)).toHaveLength(3);
  });

  it('is hidden from assistive tech', () => {
    expect(setup().el.getAttribute('aria-hidden')).toBe('true');
  });

  it('drains the queue against the audio clock and waits for audioTime', () => {
    const { el, store, beatQueue, ev, setNow, currentTime } = setup();
    beatQueue.push(ev({ beat: 1, audioTime: 1 }));
    store.setState({ running: true });
    runFrame();
    expect(currentTime).toHaveBeenCalled();
    expect(litIndexes(el)).toEqual([]);
    setNow(1);
    runFrame();
    expect(litIndexes(el)).toEqual([1]);
  });

  it('lights only the last due beat and moves the light on', () => {
    const { el, store, beatQueue, ev, setNow } = setup();
    store.setState({ running: true });
    beatQueue.push(ev({ beat: 0, audioTime: 1, level: 'strong' }));
    beatQueue.push(ev({ beat: 1, audioTime: 1.5 }));
    beatQueue.push(ev({ beat: 2, audioTime: 2, level: 'medium' }));
    setNow(5);
    runFrame();
    expect(litIndexes(el)).toEqual([2]);
    beatQueue.push(ev({ beat: 3, audioTime: 6 }));
    setNow(6);
    runFrame();
    expect(litIndexes(el)).toEqual([3]);
  });

  it('re-renders when the event bar length differs', () => {
    const { el, store, beatQueue, ev, setNow } = setup('4/4');
    store.setState({ running: true });
    beatQueue.push(ev({ beat: 4, beatsPerBar: 6, audioTime: 0 }));
    setNow(1);
    runFrame();
    expect(cells(el)).toHaveLength(6);
    expect(litIndexes(el)).toEqual([4]);
  });

  it('flashes on the downbeat only', () => {
    const { el, store, beatQueue, ev, setNow } = setup();
    store.setState({ running: true });
    beatQueue.push(ev({ beat: 0, level: 'strong', audioTime: 0 }));
    runFrame();
    expect(el.dataset.flash).toBe('on');
    beatQueue.push(ev({ beat: 1, audioTime: 1 }));
    setNow(1);
    runFrame();
    expect(el.dataset.flash).toBeUndefined();
    const levels = new Set(cells(el).map((c) => (c as HTMLElement).className));
    expect(levels.size).toBeGreaterThan(1);
  });

  it('stops, cancels the frame and unlights when running turns off', () => {
    const { el, store, beatQueue, ev } = setup();
    store.setState({ running: true });
    beatQueue.push(ev({ beat: 0, level: 'strong', audioTime: 0 }));
    runFrame();
    expect(litIndexes(el)).toEqual([0]);
    store.setState({ running: false });
    expect(cancel).toHaveBeenCalled();
    expect(litIndexes(el)).toEqual([]);
    expect(el.dataset.flash).toBeUndefined();
    expect(pending.size).toBe(0);
  });

  it('does no work when nothing is due, and teardown stops the loop', () => {
    const { el, store, off } = setup();
    store.setState({ running: true });
    runFrame();
    expect(litIndexes(el)).toEqual([]);
    expect(pending.size).toBe(1);
    off();
    expect(pending.size).toBe(0);
  });
});

describe('beatIndicator.css', () => {
  const css = readFileSync(
    resolve(import.meta.dirname, '../styles/beatIndicator.css'),
    'utf8',
  );

  it('uses tokens only', () => {
    expect(css).toContain('var(--accent)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?!\s*\{)/);
    expect(css).not.toMatch(/oklch\(|rgb\(|hsl\(/);
  });

  it('drops all motion under prefers-reduced-motion', () => {
    const block = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(block).toMatch(/transition:\s*none/);
    expect(block).toMatch(/animation:\s*none/);
    expect(block).toMatch(/transform:\s*none/);
  });
});
