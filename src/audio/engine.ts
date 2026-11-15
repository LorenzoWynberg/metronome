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
    if (audio) return audio;
    const ctx = createContext();
    ctx.addEventListener('statechange', () => {
      // Suspended, interrupted (iOS) or closed: show the app as stopped.
      if (playing && ctx.state !== 'running') stop();
    });
    const scheduler = createScheduler({
      ctx,
      store,
      tickSource: createTickSource(),
      queue: beatQueue,
    });
    audio = { ctx, scheduler };
    return audio;
  }

  async function begin(token: number): Promise<void> {
    // Everything up to the first `await` runs inside the caller's gesture.
    preferPlaybackAudioSession();
    const { ctx, scheduler } = ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    if (token !== generation) return;
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
