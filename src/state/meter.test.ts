import { describe, expect, it } from 'vitest';
import { getMeter, isTimeSignature, TIME_SIGNATURES } from './meter';

describe('meter', () => {
  it('lists signatures in order', () => {
    expect(TIME_SIGNATURES).toEqual(['2/4', '3/4', '4/4', '6/8']);
  });

  it('describes each signature', () => {
    expect(getMeter('2/4')).toEqual({
      beatsPerBar: 2,
      accents: ['strong', 'normal'],
      beatUnit: 'quarter',
    });
    expect(getMeter('3/4').accents).toEqual(['strong', 'normal', 'normal']);
    expect(getMeter('4/4').beatsPerBar).toBe(4);
    expect(getMeter('6/8')).toEqual({
      beatsPerBar: 6,
      accents: ['strong', 'normal', 'normal', 'medium', 'normal', 'normal'],
      beatUnit: 'eighth',
    });
  });

  it('has one accent per beat', () => {
    for (const ts of TIME_SIGNATURES) {
      expect(getMeter(ts).accents).toHaveLength(getMeter(ts).beatsPerBar);
    }
  });

  it('guards time signatures', () => {
    expect(isTimeSignature('4/4')).toBe(true);
    expect(isTimeSignature('5/4')).toBe(false);
    expect(isTimeSignature(4)).toBe(false);
  });
});
