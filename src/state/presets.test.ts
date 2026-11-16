import { describe, expect, it } from 'vitest';
import { activePreset, TEMPO_PRESETS } from './presets';
import { MAX_BPM, MIN_BPM } from './tempo';

describe('tempo presets', () => {
  it('lists the six presets in order within range', () => {
    expect(TEMPO_PRESETS.map((p) => [p.name, p.bpm])).toEqual([
      ['Largo', 50],
      ['Adagio', 70],
      ['Andante', 90],
      ['Moderato', 110],
      ['Allegro', 130],
      ['Presto', 170],
    ]);
    for (const p of TEMPO_PRESETS) {
      expect(p.bpm).toBeGreaterThanOrEqual(MIN_BPM);
      expect(p.bpm).toBeLessThanOrEqual(MAX_BPM);
    }
  });

  it('finds the preset matching a bpm exactly', () => {
    for (const p of TEMPO_PRESETS) expect(activePreset(p.bpm)).toBe(p);
    for (const bpm of [40, 100, 120, 240]) {
      expect(activePreset(bpm)).toBeUndefined();
    }
  });
});
