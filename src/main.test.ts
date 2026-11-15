// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Store } from './state/store';

vi.mock('@fontsource-variable/inter', () => ({}));
vi.mock('@fontsource-variable/jetbrains-mono', () => ({}));

const createEngine = vi.fn((store: Store) => {
  void store;
  return {
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    dispose: vi.fn(),
    onError: vi.fn(() => () => undefined),
    currentTime: vi.fn(() => 0),
    beatQueue: {
      push: vi.fn(),
      clear: vi.fn(),
      peek: vi.fn(() => []),
      prune: vi.fn(),
      drain: vi.fn(() => []),
    },
  };
});
vi.mock('./audio/engine', () => ({ createEngine }));

beforeEach(() => {
  vi.resetModules();
  createEngine.mockClear();
  document.body.innerHTML = '';
});

describe('main', () => {
  it('creates the engine once and mounts hero, indicator and controls', async () => {
    document.body.innerHTML =
      '<section id="bpm-hero"></section><div id="beat-indicator"></div><div id="controls"></div>';
    const { store } = await import('./state/store');
    await import('./main');

    expect(createEngine).toHaveBeenCalledOnce();
    expect(createEngine).toHaveBeenCalledWith(store);
    expect(document.getElementById('bpm-hero')?.textContent).toContain('120');
    expect(document.getElementById('controls')?.textContent).toContain('Start');
  });

  it('does not throw when the mount points are missing', async () => {
    await expect(import('./main')).resolves.toBeDefined();
  });
});
