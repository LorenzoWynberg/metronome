// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createStore } from '../state/store';
import { mountHero } from './hero';

describe('mountHero', () => {
  it('paints immediately and follows the store', () => {
    const store = createStore();
    const el = document.createElement('section');
    const off = mountHero(el, store);
    expect(el.querySelector('.hero-value')?.textContent).toBe('120');
    expect(el.querySelector('.hero-unit')?.textContent).toBe(
      'BPM · quarter note',
    );
    store.setState({ bpm: 90, timeSignature: '6/8' });
    expect(el.querySelector('.hero-value')?.textContent).toBe('90');
    expect(el.querySelector('.hero-unit')?.textContent).toBe(
      'BPM · eighth note',
    );
    off();
    store.setState({ bpm: 100 });
    expect(el.querySelector('.hero-value')?.textContent).toBe('90');
  });
});
