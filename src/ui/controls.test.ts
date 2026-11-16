// @vitest-environment happy-dom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { createStore, type Store } from '../state/store';
import { createTapTempo } from '../state/tapTempo';
import { mountControls } from './controls';

let store: Store;
let engine: {
  start: Mock<() => Promise<void>>;
  stop: Mock<() => void>;
  onError: Mock<(cb: (error: unknown) => void) => () => void>;
};
let failEngine: (error?: unknown) => void;
let offError: Mock<() => void>;
let now: number;
let dispose: () => void;
let root: HTMLElement;

const q = <T extends HTMLElement>(sel: string): T =>
  root.querySelector(sel) as T;
const button = (name: string): HTMLButtonElement =>
  [...root.querySelectorAll('button')].find(
    (b) => b.textContent === name,
  ) as HTMLButtonElement;
const key = (k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (document.activeElement ?? document.body).dispatchEvent(e);
  return e;
};

beforeEach(() => {
  store = createStore();
  engine = {
    start: vi.fn(async () => {
      store.setState({ running: true });
    }),
    stop: vi.fn(() => {
      store.setState({ running: false });
    }),
    onError: vi.fn((cb: (error: unknown) => void) => {
      failEngine = (error = new Error('audio failed')) => {
        store.setState({ running: false });
        cb(error);
      };
      return offError;
    }),
  };
  offError = vi.fn();
  now = 0;
  root = document.createElement('div');
  document.body.append(root);
  dispose = mountControls(root, {
    store,
    engine,
    tapTempo: createTapTempo(() => now),
  });
});

afterEach(() => {
  dispose();
  root.remove();
});

describe('tempo', () => {
  it('slider has attributes and writes live', () => {
    const s = q<HTMLInputElement>('input[type=range]');
    expect([s.min, s.max, s.step]).toEqual(['40', '240', '1']);
    s.value = '150';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.getState().bpm).toBe(150);
    expect(q<HTMLInputElement>('#bpm-number').value).toBe('150');
  });

  it('number commits on Enter/blur, clamps, reverts, no write on typing', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    n.focus();
    n.value = '20';
    n.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.getState().bpm).toBe(120);
    n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(store.getState().bpm).toBe(40);
    expect(n.value).toBe('40');
    expect(q('[role=status]').textContent).toBe('Tempo 40 BPM');
    n.value = '300';
    n.blur();
    expect(store.getState().bpm).toBe(240);
    n.value = '';
    n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(n.value).toBe('240');
  });

  it('number commits on `change` (spinner, arrow keys) and clamps; typing alone does not', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    n.value = '150';
    n.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.getState().bpm).toBe(120);
    expect(n.value).toBe('150');

    n.dispatchEvent(new Event('change', { bubbles: true }));
    expect(store.getState().bpm).toBe(150);
    expect(q('[role=status]').textContent).toBe('Tempo 150 BPM');

    n.value = '999';
    n.dispatchEvent(new Event('change', { bubbles: true }));
    expect(store.getState().bpm).toBe(240);
    expect(n.value).toBe('240');
  });

  it('Enter followed by blur announces the tempo once', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    const status = q('[role=status]');
    n.focus();
    n.value = '90';
    n.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(status.textContent).toBe('Tempo 90 BPM');
    status.textContent = '';
    n.blur();
    expect(status.textContent).toBe('');
    n.focus();
    n.value = '100';
    n.blur();
    expect(status.textContent).toBe('Tempo 100 BPM');
  });

  it('announces a committed tempo again after the slider moved it away', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    const status = q('[role=status]');
    n.focus();
    n.value = '90';
    n.blur();
    const s = q<HTMLInputElement>('input[type=range]');
    s.value = '120';
    s.dispatchEvent(new Event('input'));
    status.textContent = '';
    n.focus();
    n.value = '90';
    n.blur();
    expect(status.textContent).toBe('Tempo 90 BPM');
  });

  it('is not overwritten while focused; steppers adjust by one', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    n.focus();
    n.value = '99';
    store.setState({ bpm: 130 });
    expect(n.value).toBe('99');
    n.blur();
    button('+').click();
    button('−').click();
    button('−').click();
    expect(store.getState().bpm).toBe(98);
    expect(q('[role=status]').textContent).toBe('Tempo 98 BPM');
  });

  it('slider input does not announce', () => {
    const s = q<HTMLInputElement>('input[type=range]');
    s.value = '100';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    expect(q('[role=status]').textContent).toBe('');
  });
});

describe('transport', () => {
  it('Start/Stop follows the store', async () => {
    const b = button('Start');
    b.click();
    expect(engine.start).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(button('Stop').getAttribute('aria-pressed')).toBe('true');
    button('Stop').click();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(button('Start').getAttribute('aria-pressed')).toBe('false');
    store.setState({ running: true });
    store.setState({ running: false });
    expect(button('Start')).toBeTruthy();
  });

  it('radios set the signature without touching the engine', () => {
    store.setState({ running: true });
    const r = root.querySelector<HTMLInputElement>('input[value="6/8"]')!;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    expect(store.getState().timeSignature).toBe('6/8');
    expect(engine.start).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
  });

  it('every control has an accessible name', () => {
    expect(root.querySelector('label[for=bpm-slider]')).toBeTruthy();
    expect(root.querySelector('label[for=bpm-number]')).toBeTruthy();
    expect(root.querySelector('legend')?.textContent).toBe('Time signature');
    expect(root.querySelectorAll('label input[type=radio]')).toHaveLength(4);
  });
});

describe('tap', () => {
  it('button and T set tempo from tap spacing, never starting the engine', () => {
    store.setState({ timeSignature: '6/8' });
    now = 1000;
    button('Tap').click();
    expect(store.getState().bpm).toBe(120);
    now = 1600;
    key('t');
    expect(store.getState().bpm).toBe(100);
    expect(q('[role=status]').textContent).toBe('Tempo 100 BPM');
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('T is ignored on repeat, with modifiers and in the number input', () => {
    now = 1000;
    button('Tap').click();
    now = 1600;
    key('t', { repeat: true });
    key('t', { ctrlKey: true });
    key('t', { metaKey: true });
    key('t', { altKey: true });
    q<HTMLInputElement>('#bpm-number').focus();
    key('t');
    expect(store.getState().bpm).toBe(120);
  });
});

describe('keyboard', () => {
  it('Space toggles once and is cancelled, even on a focused button', () => {
    const b = button('Start');
    b.focus();
    const e = key(' ');
    expect(e.defaultPrevented).toBe(true);
    expect(engine.start).toHaveBeenCalledOnce();
    const up = new KeyboardEvent('keyup', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    b.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);
  });

  it('ignores repeat, modifiers and number-input focus', () => {
    key(' ', { repeat: true });
    key(' ', { ctrlKey: true });
    key(' ', { metaKey: true });
    key(' ', { altKey: true });
    expect(engine.start).not.toHaveBeenCalled();
    const n = q<HTMLInputElement>('#bpm-number');
    n.focus();
    const e = key(' ');
    expect(e.defaultPrevented).toBe(false);
    expect(engine.start).not.toHaveBeenCalled();
  });
});

describe('audio failures', () => {
  const alert = (): HTMLElement => q('[role=alert]');

  it('shows no message until something fails', () => {
    expect(alert().hidden).toBe(true);
    expect(alert().textContent).toBe('');
  });

  it('a rejected start() shows a message and leaves the button on Start', async () => {
    engine.start.mockRejectedValueOnce(new Error('resume timed out'));
    button('Start').click();
    await vi.waitFor(() => expect(alert().hidden).toBe(false));

    expect(alert().textContent).toBe(
      'Could not start audio. Press Start to try again.',
    );
    expect(store.getState().running).toBe(false);
    expect(button('Start').getAttribute('aria-pressed')).toBe('false');
  });

  it('an engine error during playback shows a message', () => {
    button('Start').click();
    expect(store.getState().running).toBe(true);
    failEngine();

    expect(alert().hidden).toBe(false);
    expect(alert().textContent).toBe('Playback stopped after an audio error.');
    expect(button('Start')).toBeDefined();
  });

  it('the message clears when playback starts again', async () => {
    engine.start.mockRejectedValueOnce(new Error('blocked'));
    button('Start').click();
    await vi.waitFor(() => expect(alert().hidden).toBe(false));

    button('Start').click();
    await vi.waitFor(() => expect(store.getState().running).toBe(true));
    expect(alert().hidden).toBe(true);
    expect(alert().textContent).toBe('');
  });

  it('unsubscribes from engine errors when disposed', () => {
    dispose();
    expect(offError).toHaveBeenCalledOnce();
    dispose = () => undefined;
  });
});

describe('presets', () => {
  const presets = (): HTMLButtonElement[] => [
    ...root.querySelectorAll<HTMLButtonElement>('.preset-row button'),
  ];
  const pressed = (): string[] =>
    presets().map((b) => b.getAttribute('aria-pressed') ?? '');

  it('renders a named group of six buttons in order', () => {
    const group = q('[role=group]');
    expect(group.getAttribute('aria-label')).toBe('Tempo presets');
    expect(presets().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Largo 50 BPM',
      'Adagio 70 BPM',
      'Andante 90 BPM',
      'Moderato 110 BPM',
      'Allegro 130 BPM',
      'Presto 170 BPM',
    ]);
    expect(presets().every((b) => b.type === 'button')).toBe(true);
    expect(presets()[0]?.textContent).toBe('Largo50');
  });

  it('click sets bpm, announces, and leaves playback alone', async () => {
    for (const running of [false, true]) {
      store.setState({ running });
      presets().forEach((b, i) => {
        b.click();
        const bpm = [50, 70, 90, 110, 130, 170][i];
        expect(store.getState().bpm).toBe(bpm);
        expect(q('[role=status]').textContent).toBe(`Tempo ${bpm} BPM`);
      });
    }
    expect(engine.start).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
  });

  it('pressed state follows the tempo from any source', () => {
    expect(pressed()).toEqual(Array(6).fill('false'));
    presets()[4]?.click();
    expect(pressed()).toEqual([
      'false',
      'false',
      'false',
      'false',
      'true',
      'false',
    ]);
    const s = q<HTMLInputElement>('input[type=range]');
    s.value = '90';
    s.dispatchEvent(new Event('input'));
    expect(pressed()[2]).toBe('true');
    expect(pressed().filter((p) => p === 'true')).toHaveLength(1);
    button('+').click();
    expect(pressed()).toEqual(Array(6).fill('false'));
  });

  it('pressed state follows the number input, − stepper and tap tempo', () => {
    const n = q<HTMLInputElement>('#bpm-number');
    n.value = '110';
    n.dispatchEvent(new Event('change', { bubbles: true }));
    expect(pressed()[3]).toBe('true');
    expect(pressed().filter((p) => p === 'true')).toHaveLength(1);
    button('−').click();
    expect(pressed()).toEqual(Array(6).fill('false'));
    now = 1000;
    button('Tap').click();
    now = 2200;
    button('Tap').click();
    expect(store.getState().bpm).toBe(50);
    expect(pressed()[0]).toBe('true');
    expect(pressed().filter((p) => p === 'true')).toHaveLength(1);
  });

  it('shows a persisted preset pressed without a click', () => {
    const storage = {
      getItem: () => '{"bpm":130,"timeSignature":"4/4"}',
      setItem: () => undefined,
    };
    const el = document.createElement('div');
    document.body.append(el);
    const off = mountControls(el, {
      store: createStore({ storage }),
      engine,
    });
    const b = [...el.querySelectorAll('.preset-row button')];
    expect(b[4]?.getAttribute('aria-pressed')).toBe('true');
    off();
    el.remove();
  });
});
