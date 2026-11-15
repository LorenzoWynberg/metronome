import type { Store } from '../state/store';
import { createBeatQueue, type BeatQueue } from './beatQueue';
import { createScheduler, type Scheduler, type TickSource } from './scheduler';
import { createWorkerTickSource } from './workerTickSource';

export interface Engine {
  /** Starts playback. Call it from a user gesture so audio may start. */
  start(): Promise<void>;
  stop(): void;
  /** Stops playback and releases the AudioContext and the tick source. */
  dispose(): void;
  /**
   * Calls `cb` when playback stops because of a failure (a tick that threw or
   * a tick source that died). Returns a function that removes the callback.
   */
  onError(cb: (error: unknown) => void): () => void;
  /** The AudioContext clock, or 0 before a context exists. */
  currentTime(): number;
  readonly beatQueue: BeatQueue;
}

/** How long `start()` waits for `AudioContext.resume()` before giving up. */
export const RESUME_TIMEOUT_MS = 4000;

interface Audio {
  ctx: AudioContext;
  scheduler: Scheduler;
  tickSource: TickSource;
  /** Removes the `statechange` listener. */
  off(): void;
}

export interface EngineDeps {
  createContext?: () => AudioContext;
  createTickSource?: () => TickSource;
  /**
   * A signal that aborts after `ms`; bounds `resume()`. Defaults to
   * `AbortSignal.timeout`, which keeps timers out of this file.
   */
  timeoutSignal?: (ms: number) => AbortSignal;
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
  const timeoutSignal =
    deps.timeoutSignal ?? ((ms: number) => AbortSignal.timeout(ms));
  const beatQueue = createBeatQueue();

  const errorListeners = new Set<(error: unknown) => void>();
  let audio: Audio | undefined;
  let playing = false;
  let pending: Promise<void> | undefined;
  // Bumped by `stop()` so a start still awaiting `resume()` is abandoned.
  let generation = 0;

  function notify(error: unknown): void {
    for (const cb of [...errorListeners]) {
      try {
        cb(error);
      } catch {
        // One failing listener must not hide the error from the others.
      }
    }
  }

  /** Ends the scheduler, the listener and the tick source of `a`. */
  function release(a: Audio): void {
    try {
      a.scheduler.stop();
    } finally {
      try {
        a.off();
      } finally {
        a.tickSource.dispose();
      }
    }
  }

  function ensureAudio(): Audio {
    if (audio && audio.ctx.state !== 'closed') return audio;
    if (audio) {
      // A closed context can never run again, so the next start gets a new
      // one; end the old tick source first so its Worker is not leaked.
      const old = audio;
      audio = undefined;
      release(old);
    }
    const ctx = createContext();
    const onStateChange = (): void => {
      // Suspended, interrupted (iOS) or closed: show the app as stopped.
      if (playing && ctx.state !== 'running') stop();
    };
    ctx.addEventListener('statechange', onStateChange);
    let scheduler: Scheduler;
    let tickSource: TickSource | undefined;
    try {
      tickSource = createTickSource();
      // A worker that fails to load or crashes sends no more ticks: stop
      // rather than show the app as running in silence.
      tickSource.onError((error) => {
        if (!playing) return;
        stop();
        notify(error);
      });
      scheduler = createScheduler({
        ctx,
        store,
        tickSource,
        queue: beatQueue,
        onError: (error) => {
          stop();
          notify(error);
        },
      });
    } catch (err) {
      // Do not orphan the context or worker: browsers cap how many may be live.
      try {
        tickSource?.dispose();
      } catch {
        // The original error is the one to report.
      }
      ctx.removeEventListener('statechange', onStateChange);
      ctx.close().catch(() => undefined);
      throw err;
    }
    audio = {
      ctx,
      scheduler,
      tickSource,
      off: () => ctx.removeEventListener('statechange', onStateChange),
    };
    return audio;
  }

  /**
   * `resume()` can hang (a blocked or interrupted context). On a timeout or a
   * rejection, `stop()` bumps `generation` so a late resume starts nothing.
   */
  async function resumeWithin(ctx: AudioContext, token: number): Promise<void> {
    const signal = timeoutSignal(RESUME_TIMEOUT_MS);
    let onAbort: (() => void) | undefined;
    const timeout = new Promise<never>((_, reject) => {
      onAbort = () => reject(new Error('AudioContext resume timed out'));
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
      await Promise.race([ctx.resume(), timeout]);
    } catch (error) {
      if (token === generation) stop();
      throw error;
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }

  async function begin(token: number): Promise<void> {
    // Everything up to the first `await` runs inside the caller's gesture.
    preferPlaybackAudioSession();
    const { ctx, scheduler } = ensureAudio();
    // Suspended, or interrupted on iOS: both recover through `resume()`.
    if (ctx.state !== 'running') await resumeWithin(ctx, token);
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
    try {
      audio?.scheduler.stop();
    } finally {
      beatQueue.clear();
      store.setState({ running: false });
    }
  }

  store.subscribe((state) => {
    if (!state.running && playing) stop();
  });

  function dispose(): void {
    const a = audio;
    try {
      stop();
    } finally {
      audio = undefined;
      errorListeners.clear();
      if (a) {
        try {
          release(a);
        } finally {
          a.ctx.close().catch(() => undefined);
        }
      }
    }
  }

  return {
    start,
    stop,
    dispose,
    onError(cb) {
      errorListeners.add(cb);
      return () => {
        errorListeners.delete(cb);
      };
    },
    currentTime: () => audio?.ctx.currentTime ?? 0,
    beatQueue,
  };
}
