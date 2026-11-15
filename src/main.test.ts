// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@fontsource-variable/inter', () => ({}));
vi.mock('@fontsource-variable/jetbrains-mono', () => ({}));

const createEngine = vi.fn((...args: unknown[]) => ({
  args,
  start: vi.fn(async () => undefined),
  stop: vi.fn(),
  dispose: vi.fn(),
  onError: vi.fn(() => () => undefined),
  currentTime: vi.fn(() => 0),
  beatQueue: { push: vi.fn(), takeDue: vi.fn(() => []), clear: vi.fn() },
}));
vi.mock('./audio/engine', () => ({ createEngine }));

beforeEach(() => {
  vi.resetModules();
  createEngine.mockClear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
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
    expect(
      document.getElementById('beat-indicator')?.querySelectorAll('.beat-cell'),
    ).toHaveLength(4);
    const labels = [
      ...(document.getElementById('controls')?.querySelectorAll('button') ??
        []),
    ].map((b) => b.textContent);
    expect(labels).toContain('Start');
  });

  it('does not throw when the mount points are missing', async () => {
    await expect(import('./main')).resolves.toBeDefined();
    expect(createEngine).toHaveBeenCalledOnce();
  });
});
