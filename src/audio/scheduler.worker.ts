/// <reference lib="webworker" />

// Hosts the scheduler's tick in a Web Worker, whose timers browsers do not
// throttle the way they throttle a hidden tab's main thread. It never touches
// audio: it only posts `{ type: 'tick' }` at the requested interval.
// This is the only non-test file in `src/` allowed to use timers.

export type SchedulerWorkerRequest =
  { type: 'start'; intervalMs: number } | { type: 'stop' };

export type SchedulerWorkerMessage = { type: 'tick' };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let timer: ReturnType<typeof setInterval> | undefined;

function clearTimer(): void {
  if (timer === undefined) return;
  clearInterval(timer);
  timer = undefined;
}

scope.onmessage = (event: MessageEvent<SchedulerWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'start') {
    clearTimer();
    const tick: SchedulerWorkerMessage = { type: 'tick' };
    timer = setInterval(() => scope.postMessage(tick), request.intervalMs);
  } else if (request.type === 'stop') {
    clearTimer();
  }
};
