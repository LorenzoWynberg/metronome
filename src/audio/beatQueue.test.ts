import { describe, expect, it } from 'vitest';
import { createBeatQueue, type BeatEvent } from './beatQueue';

const ev = (beat: number, audioTime: number): BeatEvent => ({
  beat,
  audioTime,
  level: beat === 0 ? 'strong' : 'normal',
  beatsPerBar: 4,
});

describe('beat queue', () => {
  it('returns due entries in push order', () => {
    const q = createBeatQueue();
    q.push(ev(0, 1));
    q.push(ev(1, 1.5));
    q.push(ev(2, 2));
    expect(q.takeDue(1.5)).toEqual([ev(0, 1), ev(1, 1.5)]);
  });

  it('removes what it returns and keeps entries not yet due', () => {
    const q = createBeatQueue();
    q.push(ev(0, 1));
    q.push(ev(1, 2));
    expect(q.takeDue(1)).toEqual([ev(0, 1)]);
    expect(q.takeDue(1)).toEqual([]);
    expect(q.takeDue(2)).toEqual([ev(1, 2)]);
  });

  it('returns nothing when no entry is due', () => {
    const q = createBeatQueue();
    q.push(ev(0, 3));
    expect(q.takeDue(2.9)).toEqual([]);
    expect(q.takeDue(3)).toEqual([ev(0, 3)]);
  });

  it('clear() empties it', () => {
    const q = createBeatQueue();
    q.push(ev(0, 1));
    q.push(ev(1, 2));
    q.clear();
    expect(q.takeDue(Infinity)).toEqual([]);
  });
});
