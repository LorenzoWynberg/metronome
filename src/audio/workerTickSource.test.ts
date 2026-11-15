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
  postMessage(message: SchedulerWorkerRequest): void {
    this.posted.push(message);
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

  it('reports a worker error to its error listener', () => {
    const { source, onError } = setup();
    source.start(25);
    const failure = { message: 'failed to load' };
    FakeWorker.instances[0]!.onerror?.(failure);
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
