import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SchedulerWorkerRequest } from './scheduler.worker';

// Node has no worker global scope, so the worker module runs against a stub
// `self` and fake timers.
function loadWorker() {
  const scope = {
    postMessage: vi.fn(),
    onmessage: null as
      ((event: { data: SchedulerWorkerRequest }) => void) | null,
  };
  vi.stubGlobal('self', scope);
  const send = (data: SchedulerWorkerRequest) => scope.onmessage?.({ data });
  return import('./scheduler.worker').then(() => ({ scope, send }));
}

describe('scheduler worker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('posts a tick at each interval after start', async () => {
    const { scope, send } = await loadWorker();
    send({ type: 'start', intervalMs: 25 });
    vi.advanceTimersByTime(24);
    expect(scope.postMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(scope.postMessage).toHaveBeenCalledTimes(1);
    expect(scope.postMessage).toHaveBeenLastCalledWith({ type: 'tick' });
    vi.advanceTimersByTime(75);
    expect(scope.postMessage).toHaveBeenCalledTimes(4);
  });

  it('stops ticking on stop', async () => {
    const { scope, send } = await loadWorker();
    send({ type: 'start', intervalMs: 25 });
    vi.advanceTimersByTime(50);
    send({ type: 'stop' });
    vi.advanceTimersByTime(1000);
    expect(scope.postMessage).toHaveBeenCalledTimes(2);
  });

  it('a second start replaces the timer instead of doubling the ticks', async () => {
    const { scope, send } = await loadWorker();
    send({ type: 'start', intervalMs: 25 });
    send({ type: 'start', intervalMs: 25 });
    vi.advanceTimersByTime(100);
    expect(scope.postMessage).toHaveBeenCalledTimes(4);
  });
});
