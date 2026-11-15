import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SchedulerWorkerRequest } from './scheduler.worker';
import { createWorkerTickSource } from './workerTickSource';

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly posted: SchedulerWorkerRequest[] = [];
  onmessage: ((event: { data: { type: string } }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  constructor() {
    FakeWorker.instances.push(this);
  }
  terminated = false;
  postMessage(message: SchedulerWorkerRequest): void {
    this.posted.push(message);
  }
  terminate(): void {
    this.terminated = true;
  }
}

function setup() {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
  const source = createWorkerTickSource();
  const onTick = vi.fn();
  const onError = vi.fn();
  source.onTick(onTick);
  source.onError(onError);
  return { source, onTick, onError };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker tick source', () => {
  it('stop() before any start() creates no worker and does not throw', () => {
    const { source } = setup();
    expect(() => source.stop()).not.toThrow();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('calls back only for tick messages', () => {
    const { source, onTick } = setup();
    source.start(25);
    const worker = FakeWorker.instances[0]!;

    worker.onmessage?.({ data: { type: 'other' } });
    expect(onTick).not.toHaveBeenCalled();
    worker.onmessage?.({ data: { type: 'tick' } });
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('reports a worker error and replaces the dead worker on the next start', () => {
    const { source, onError } = setup();
    source.start(25);
    const failed = FakeWorker.instances[0]!;
    const failure = { message: 'failed to load' };
    failed.onerror?.(failure);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(failed.terminated).toBe(true);
    source.start(25);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[1]!.posted).toEqual([
      { type: 'start', intervalMs: 25 },
    ]);
  });

  it('dispose() ends the worker, drops its handlers and stops all callbacks', () => {
    const { source, onTick, onError } = setup();
    source.start(25);
    const worker = FakeWorker.instances[0]!;

    source.dispose();

    expect(worker.terminated).toBe(true);
    expect(worker.posted.at(-1)).toEqual({ type: 'stop' });
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
    expect(onTick).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('start() after dispose() creates no worker, and stop()/dispose() do not throw', () => {
    const { source } = setup();
    source.start(25);
    source.dispose();

    source.start(25);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(() => {
      source.stop();
      source.dispose();
    }).not.toThrow();
  });

  it('dispose() before any start() does not throw and creates no worker', () => {
    const { source } = setup();
    expect(() => source.dispose()).not.toThrow();
    source.start(25);
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
