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
};
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
  };
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

  it('a rejecting start leaves the button on Start and logs the cause', async () => {
    const err = new Error('no audio');
    engine.start.mockRejectedValueOnce(err);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    button('Start').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).toHaveBeenCalledWith('Metronome could not start', err);
    expect(button('Start').getAttribute('aria-pressed')).toBe('false');
    expect(store.getState().running).toBe(false);
    spy.mockRestore();
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
