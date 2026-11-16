export interface TempoPreset {
  readonly name: string;
  readonly bpm: number;
}

export const TEMPO_PRESETS: readonly TempoPreset[] = [
  { name: 'Largo', bpm: 50 },
  { name: 'Adagio', bpm: 70 },
  { name: 'Andante', bpm: 90 },
  { name: 'Moderato', bpm: 110 },
  { name: 'Allegro', bpm: 130 },
  { name: 'Presto', bpm: 170 },
];

export function activePreset(bpm: number): TempoPreset | undefined {
  return TEMPO_PRESETS.find((p) => p.bpm === bpm);
}
