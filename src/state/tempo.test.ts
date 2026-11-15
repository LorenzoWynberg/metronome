import { describe, expect, it } from 'vitest';
import {
  clampBpm,
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
  MAX_BPM,
  MIN_BPM,
} from './tempo';

describe('tempo', () => {
  it('exposes the constants', () => {
    expect([MIN_BPM, MAX_BPM, DEFAULT_BPM, DEFAULT_TIME_SIGNATURE]).toEqual([
      40,
      240,
      120,
      '4/4',
    ]);
  });

  it('clamps and rounds', () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(500)).toBe(240);
    expect(clampBpm(120.6)).toBe(121);
  });

  it('falls back to the default for non-finite input', () => {
    expect(clampBpm(NaN)).toBe(120);
    expect(clampBpm(Infinity)).toBe(120);
  });
});
