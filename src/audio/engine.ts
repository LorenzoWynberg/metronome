import type { Store } from '../state/store';
import { createBeatQueue, type BeatQueue } from './beatQueue';
import { createScheduler, type Scheduler, type TickSource } from './scheduler';
import { createWorkerTickSource } from './workerTickSource';

export interface Engine {
  /** Starts playback. Call it from a user gesture so audio may start. */
  start(): Promise<void>;
  stop(): void;
  /** The AudioContext clock, or 0 before a context exists. */
  currentTime(): number;
  readonly beatQueue: BeatQueue;
}

export interface EngineDeps {
  createContext?: () => AudioContext;
  createTickSource?: () => TickSource;
}

/** The Audio Session API (Safari); not yet in TypeScript's DOM lib. */
type NavigatorWithAudioSession = Navigator & {
  audioSession?: { type: string };
};

function preferPlaybackAudioSession(): void {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as NavigatorWithAudioSession).audioSession;
  // 'playback' keeps iOS playing the click with the ringer switched to silent.
  if (session) session.type = 'playback';
}

/**
 * Owns the AudioContext lifecycle and keeps the store's `running` flag in
 * step with playback. Nothing audio-related is created until `start()`.
 */
export function createEngine(store: Store, deps: EngineDeps = {}): Engine {
  const createContext = deps.createContext ?? (() => new AudioContext());
  const createTickSource = deps.createTickSource ?? createWorkerTickSource;
  const beatQueue = createBeatQueue();

  let audio: { ctx: AudioContext; scheduler: Scheduler } | undefined;
  let playing = false;
  let pending: Promise<void> | undefined;
  // Bumped by `stop()` so a start still awaiting `resume()` is abandoned.
  let generation = 0;

  function ensureAudio(): { ctx: AudioContext; scheduler: Scheduler } {
    // A closed context can never run again, so the next start gets a new one.
    if (audio && audio.ctx.state !== 'closed') return audio;
    const ctx = createContext();
    ctx.addEventListener('statechange', () => {
      // Suspended, interrupted (iOS) or closed: show the app as stopped.
      if (playing && ctx.state !== 'running') stop();
    });
    const tickSource = createTickSource();
    // A worker that fails to load or crashes sends no more ticks: stop
    // rather than show the app as running in silence.
    tickSource.onError(() => {
      if (playing) stop();
    });
    const scheduler = createScheduler({
      ctx,
      store,
      tickSource,
      queue: beatQueue,
    });
    audio = { ctx, scheduler };
    return audio;
  }

  async function begin(token: number): Promise<void> {
    // Everything up to the first `await` runs inside the caller's gesture.
    preferPlaybackAudioSession();
    const { ctx, scheduler } = ensureAudio();
    // Suspended, or interrupted on iOS: both recover through `resume()`.
    if (ctx.state !== 'running') await ctx.resume();
    if (token !== generation) return;
    if (ctx.state !== 'running') {
      throw new Error(`AudioContext did not start (state: ${ctx.state})`);
    }
    scheduler.start();
    playing = true;
    store.setState({ running: true });
  }

  function start(): Promise<void> {
    if (playing) return Promise.resolve();
    if (pending) return pending;
    const token = generation;
    const run = begin(token).finally(() => {
      if (pending === run) pending = undefined;
    });
    pending = run;
    return run;
  }

  function stop(): void {
    generation++;
    pending = undefined;
    if (!playing) return;
    playing = false;
    audio?.scheduler.stop();
    beatQueue.clear();
    store.setState({ running: false });
  }

  store.subscribe((state) => {
    if (!state.running && playing) stop();
  });

  return {
    start,
    stop,
    currentTime: () => audio?.ctx.currentTime ?? 0,
    beatQueue,
  };
}
