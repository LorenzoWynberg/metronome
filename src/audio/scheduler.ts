import { getMeter, type TimeSignature } from '../state/meter';
import type { Store } from '../state/store';
import type { BeatQueue } from './beatQueue';
import { scheduleClick } from './click';

/** How often the tick source wakes the scheduler. */
export const TICK_MS = 25;
/** Every beat due before `currentTime + SCHEDULE_AHEAD_S` is scheduled on a tick. */
export const SCHEDULE_AHEAD_S = 0.1;
/** Gap before the first beat, and before the next beat after falling behind. */
export const START_DELAY_S = 0.05;
/** Queue entries older than `currentTime - QUEUE_RETENTION_S` are dropped. */
export const QUEUE_RETENTION_S = 1;

/** Something that calls back every `intervalMs` while started. */
export interface TickSource {
  start(intervalMs: number): void;
  stop(): void;
  onTick(cb: () => void): void;
  /** Called when the source fails and will deliver no more ticks. */
  onError(cb: (error: unknown) => void): void;
  /** Releases the source for good: no more ticks, and `start` does nothing. */
  dispose(): void;
}

export interface Scheduler {
  start(): void;
  stop(): void;
}

export interface SchedulerDeps {
  ctx: BaseAudioContext;
  store: Pick<Store, 'getState'>;
  tickSource: TickSource;
  queue: BeatQueue;
  /** Where clicks are sent; defaults to the context's destination. */
  output?: AudioNode;
  /** Called when a tick throws; the scheduler has already stopped itself. */
  onError?: (error: unknown) => void;
}

/**
 * A lookahead scheduler: on each tick it schedules, on the audio clock, every
 * beat that falls inside the next `SCHEDULE_AHEAD_S` seconds. Tempo and time
 * signature are read when a beat is scheduled, so a change applies from the
 * next unscheduled beat without a restart.
 */
export function createScheduler({
  ctx,
  store,
  tickSource,
  queue,
  output,
  onError,
}: SchedulerDeps): Scheduler {
  let active = false;
  let firstBeatTime = 0;
  let lastBeatTime: number | undefined;
  let beat = 0;
  let timeSignature: TimeSignature | undefined;
  let scheduled: { node: AudioScheduledSourceNode; time: number }[] = [];

  function tick(): void {
    if (!active) return;
    const now = ctx.currentTime;

    // Keep memory bounded when nothing drains the queue (e.g. a hidden tab).
    queue.takeDue(now - QUEUE_RETENTION_S);
    scheduled = scheduled.filter((s) => s.time >= now);

    for (;;) {
      const state = store.getState();
      let time =
        lastBeatTime === undefined
          ? firstBeatTime
          : lastBeatTime + 60 / state.bpm;
      // A late tick re-anchors instead of playing a burst of past beats.
      if (time < now) time = now + START_DELAY_S;
      if (time >= now + SCHEDULE_AHEAD_S) break;

      if (state.timeSignature !== timeSignature) {
        timeSignature = state.timeSignature;
        beat = 0;
      }
      const meter = getMeter(timeSignature);
      // `beat` is always below `beatsPerBar`; the fallback only satisfies the type.
      const level = meter.accents[beat] ?? 'normal';

      scheduled.push({ node: scheduleClick(ctx, time, level, output), time });
      queue.push({
        beat,
        audioTime: time,
        level,
        beatsPerBar: meter.beatsPerBar,
      });

      lastBeatTime = time;
      beat = (beat + 1) % meter.beatsPerBar;
    }
  }

  /** Stops ticking and silences clicks that are scheduled but not yet heard. */
  function halt(): void {
    active = false;
    try {
      tickSource.stop();
    } finally {
      const now = ctx.currentTime;
      for (const s of scheduled) if (s.time > now) s.node.stop();
      scheduled = [];
    }
  }

  tickSource.onTick(() => {
    try {
      tick();
    } catch (error) {
      // A throwing tick would otherwise leave the app showing "running" while
      // no more beats are scheduled: stop, then tell the owner.
      if (!active) return;
      try {
        halt();
      } catch {
        // The tick's error is the one to report.
      }
      onError?.(error);
    }
  });

  return {
    start() {
      if (active) return;
      active = true;
      firstBeatTime = ctx.currentTime + START_DELAY_S;
      lastBeatTime = undefined;
      beat = 0;
      timeSignature = undefined;
      try {
        tickSource.start(TICK_MS);
        tick();
      } catch (error) {
        // Leave nothing half-started (no click left to sound), so a later
        // `start()` can try again.
        try {
          halt();
        } catch {
          // The start's error is the one to report.
        }
        throw error;
      }
    },
    stop() {
      if (!active) return;
      halt();
    },
  };
}
