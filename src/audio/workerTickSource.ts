import type { TickSource } from './scheduler';
import type {
  SchedulerWorkerMessage,
  SchedulerWorkerRequest,
} from './scheduler.worker';

/**
 * The production tick source: a Web Worker posts the ticks, so they keep
 * coming while the tab is hidden. The Worker is created on the first `start`.
 */
export function createWorkerTickSource(): TickSource {
  let worker: Worker | undefined;
  let listener: (() => void) | undefined;
  let errorListener: ((error: unknown) => void) | undefined;

  function post(request: SchedulerWorkerRequest): void {
    worker?.postMessage(request);
  }

  return {
    onTick(cb) {
      listener = cb;
    },
    onError(cb) {
      errorListener = cb;
    },
    start(intervalMs) {
      if (!worker) {
        // Keep the `new URL(...)` literal inside `new Worker(...)`: Vite
        // recognises this exact form and emits the worker as its own chunk.
        worker = new Worker(new URL('./scheduler.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.onmessage = (event: MessageEvent<SchedulerWorkerMessage>) => {
          if (event.data.type === 'tick') listener?.();
        };
        // The script failed to load or threw: no more ticks will come from
        // this worker, so drop it and let the next `start` make a fresh one.
        worker.onerror = (event: ErrorEvent) => {
          worker?.terminate();
          worker = undefined;
          errorListener?.(event);
        };
      }
      post({ type: 'start', intervalMs });
    },
    stop() {
      post({ type: 'stop' });
    },
  };
}
