import type { AccentLevel } from '../state/meter';

/**
 * Pitch and loudness per accent level. Both fall from `strong` to `normal`,
 * so the bar's downbeat is the highest and loudest click.
 */
export const CLICK_VOICES: Readonly<
  Record<AccentLevel, { frequency: number; peak: number }>
> = {
  strong: { frequency: 1600, peak: 1 },
  medium: { frequency: 1200, peak: 0.7 },
  normal: { frequency: 800, peak: 0.5 },
};

const SILENT = 0.0001; // exponential ramps cannot reach 0
const ATTACK_S = 0.002;
const DECAY_S = 0.05;
/** The oscillator stops this long after the click starts. */
export const CLICK_LENGTH_S = 0.06;

/**
 * Synthesizes one click at `time` (AudioContext clock): an oscillator through
 * a gain envelope with a fast attack and an exponential decay to near silence.
 * The click feeds `output` (the context destination by default).
 * Returns the oscillator so a caller can cut a not-yet-sounded click short.
 */
export function scheduleClick(
  ctx: BaseAudioContext,
  time: number,
  level: AccentLevel,
  output: AudioNode = ctx.destination,
): AudioScheduledSourceNode {
  const { frequency, peak } = CLICK_VOICES[level];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(SILENT, time);
  gain.gain.linearRampToValueAtTime(peak, time + ATTACK_S);
  gain.gain.exponentialRampToValueAtTime(SILENT, time + DECAY_S);

  osc.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + CLICK_LENGTH_S);
  return osc;
}
