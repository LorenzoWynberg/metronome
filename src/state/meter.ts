export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';
export type AccentLevel = 'strong' | 'medium' | 'normal';

export interface Meter {
  beatsPerBar: number;
  accents: readonly AccentLevel[];
  beatUnit: 'quarter' | 'eighth';
}

export const TIME_SIGNATURES: readonly TimeSignature[] = [
  '2/4',
  '3/4',
  '4/4',
  '6/8',
];

// The engine plays one click per BPM beat, so seconds per click is always
// `60 / bpm`, whatever the time signature.
const METERS: Record<TimeSignature, Meter> = {
  '2/4': { beatsPerBar: 2, accents: ['strong', 'normal'], beatUnit: 'quarter' },
  '3/4': {
    beatsPerBar: 3,
    accents: ['strong', 'normal', 'normal'],
    beatUnit: 'quarter',
  },
  '4/4': {
    beatsPerBar: 4,
    accents: ['strong', 'normal', 'normal', 'normal'],
    beatUnit: 'quarter',
  },
  '6/8': {
    beatsPerBar: 6,
    accents: ['strong', 'normal', 'normal', 'medium', 'normal', 'normal'],
    beatUnit: 'eighth',
  },
};

export function getMeter(ts: TimeSignature): Meter {
  return METERS[ts];
}

export function isTimeSignature(v: unknown): v is TimeSignature {
  return (
    typeof v === 'string' && (TIME_SIGNATURES as readonly string[]).includes(v)
  );
}
