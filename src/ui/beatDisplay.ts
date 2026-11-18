import type { BeatEvent } from '../audio/beatQueue';

export type BeatDisplay = { text: string; isDownbeat: boolean };

/**
 * The counter's text: the 1-based beat, clamped to the current meter so a
 * queued beat from the previous meter never reads past the bar.
 */
export function beatDisplay(
  event: Pick<BeatEvent, 'beat'> | null,
  currentBeatsPerBar: number,
): BeatDisplay {
  if (!event) return { text: '–', isDownbeat: false };
  const n = Math.min(event.beat + 1, currentBeatsPerBar);
  return { text: String(n), isDownbeat: n === 1 };
}
