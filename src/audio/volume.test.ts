import { describe, expect, it } from 'vitest';
import { volumeToGain } from './volume';

describe('volumeToGain', () => {
  it('maps 0 to silence and 100 to unity', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(100)).toBe(1);
  });

  it('is strictly increasing', () => {
    for (let v = 1; v <= 100; v++) {
      expect(volumeToGain(v)).toBeGreaterThan(volumeToGain(v - 1));
    }
  });
});
