import type { Store } from '../state/store';
import type { BeatEvent, BeatQueue } from './beatQueue';

export type BeatListener = (event: BeatEvent | null) => void;

export interface BeatFeed {
  /** Delivers the latest due beat, or `null` when playback stops. */
  subscribe(cb: BeatListener): () => void;
}

type Source = { currentTime(): number; beatQueue: BeatQueue };

/**
 * The one consumer of the beat queue. While the store is running and at least
 * one view is subscribed it drains the queue against the audio clock once per animation frame and hands only
 * the latest due beat to every subscriber, so a hidden tab never replays a
 * backlog and two views never fight over `takeDue`.
 */
export function createBeatFeed(
  store: Pick<Store, 'getState' | 'subscribe'>,
  { currentTime, beatQueue }: Source,
): BeatFeed {
  const listeners = new Set<BeatListener>();
  let frame: number | null = null;

  const emit = (event: BeatEvent | null): void => {
    for (const cb of [...listeners]) cb(event);
  };

  const tick = (): void => {
    // Schedule first so a throwing subscriber cannot stall the loop.
    frame = requestAnimationFrame(tick);
    const due = beatQueue.takeDue(currentTime());
    const last = due[due.length - 1];
    if (last) emit(last);
  };

  const start = (): void => {
    if (store.getState().running && listeners.size > 0 && frame === null) {
      frame = requestAnimationFrame(tick);
    }
  };

  const sync = (): void => {
    if (store.getState().running) {
      start();
    } else if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      emit(null);
    }
  };

  store.subscribe(sync);
  sync();

  return {
    subscribe(cb) {
      listeners.add(cb);
      start();
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && frame !== null) {
          cancelAnimationFrame(frame);
          frame = null;
        }
      };
    },
  };
}
