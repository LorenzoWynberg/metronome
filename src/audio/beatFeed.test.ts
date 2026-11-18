import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../state/store';
import { createBeatFeed } from './beatFeed';
import { createBeatQueue, type BeatEvent } from './beatQueue';

let pending: Map<number, () => void>;
let nextId: number;
const runFrame = (): void => {
  const cbs = [...pending.values()];
  pending.clear();
  cbs.forEach((cb) => cb());
};

beforeEach(() => {
  pending = new Map();
  nextId = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    pending.set(nextId, cb);
    return nextId++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

const ev = (beat: number, audioTime = 0): BeatEvent => ({
  beat,
  audioTime,
  level: 'normal',
  beatsPerBar: 4,
});

describe('createBeatFeed', () => {
  it('drains once per frame and gives every subscriber the latest beat', () => {
    const store = createStore();
    const beatQueue = createBeatQueue();
    const takeDue = vi.spyOn(beatQueue, 'takeDue');
    const feed = createBeatFeed(store, { currentTime: () => 5, beatQueue });
    const a = vi.fn();
    const b = vi.fn();
    feed.subscribe(a);
    feed.subscribe(b);
    store.setState({ running: true });
    beatQueue.push(ev(0));
    beatQueue.push(ev(1));
    runFrame();
    expect(takeDue).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(expect.objectContaining({ beat: 1 }));
    expect(b).toHaveBeenCalledWith(expect.objectContaining({ beat: 1 }));
  });

  it('sends null and stops the loop when playback stops', () => {
    const store = createStore();
    const feed = createBeatFeed(store, {
      currentTime: () => 0,
      beatQueue: createBeatQueue(),
    });
    const cb = vi.fn();
    feed.subscribe(cb);
    store.setState({ running: true });
    expect(pending.size).toBe(1);
    store.setState({ running: false });
    expect(cb).toHaveBeenCalledWith(null);
    expect(pending.size).toBe(0);
  });

  it('runs no loop while stopped, and none without a subscriber', () => {
    const idle = createStore();
    createBeatFeed(idle, {
      currentTime: () => 0,
      beatQueue: createBeatQueue(),
    });
    expect(pending.size).toBe(0);
    const live = createStore();
    live.setState({ running: true });
    const feed = createBeatFeed(live, {
      currentTime: () => 0,
      beatQueue: createBeatQueue(),
    });
    expect(pending.size).toBe(0);
    feed.subscribe(vi.fn());
    expect(pending.size).toBe(1);
  });

  it('cancels the loop when the last subscriber leaves and resumes on resubscribe', () => {
    const store = createStore();
    const beatQueue = createBeatQueue();
    const feed = createBeatFeed(store, { currentTime: () => 5, beatQueue });
    store.setState({ running: true });
    const off = feed.subscribe(vi.fn());
    expect(pending.size).toBe(1);
    off();
    expect(pending.size).toBe(0);
    beatQueue.push(ev(3));
    const cb = vi.fn();
    feed.subscribe(cb);
    runFrame();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ beat: 3 }));
  });

  it('keeps the loop while another subscriber remains', () => {
    const store = createStore();
    const feed = createBeatFeed(store, {
      currentTime: () => 0,
      beatQueue: createBeatQueue(),
    });
    store.setState({ running: true });
    const offA = feed.subscribe(vi.fn());
    feed.subscribe(vi.fn());
    offA();
    expect(pending.size).toBe(1);
  });

  it('stops delivering after unsubscribe', () => {
    const store = createStore();
    const beatQueue = createBeatQueue();
    const feed = createBeatFeed(store, { currentTime: () => 5, beatQueue });
    const cb = vi.fn();
    feed.subscribe(cb)();
    store.setState({ running: true });
    beatQueue.push(ev(0));
    runFrame();
    expect(cb).not.toHaveBeenCalled();
  });
});
