import { describe, expect, it } from 'vitest';
import { createTapTempo } from './tapTempo';

function setup() {
  let t = 0;
  const tt = createTapTempo(() => t);
  return {
    tap(at: number) {
      t = at;
      return tt.tap();
    },
    tt,
  };
}

describe('createTapTempo', () => {
  it('returns null on the first tap and 120 at 500 ms', () => {
    const s = setup();
    expect(s.tap(1000)).toBeNull();
    expect(s.tap(1500)).toBe(120);
  });

  it('averages only the last four intervals', () => {
    const s = setup();
    s.tap(0);
    s.tap(1000); // old slow interval, drops out
    s.tap(1500);
    s.tap(2000);
    s.tap(2500);
    expect(s.tap(3000)).toBe(120);
  });

  it('resets after a gap over 2000 ms but not at exactly 2000', () => {
    const s = setup();
    s.tap(0);
    expect(s.tap(2000)).toBe(40);
    const r = setup();
    r.tap(0);
    expect(r.tap(2001)).toBeNull();
  });

  it('clamps to 40 and 240', () => {
    const s = setup();
    s.tap(0);
    expect(s.tap(100)).toBe(240);
    const r = setup();
    r.tap(0);
    expect(r.tap(1900)).toBe(40);
  });

  it('reset() forgets earlier taps', () => {
    const s = setup();
    s.tap(0);
    s.tt.reset();
    expect(s.tap(500)).toBeNull();
  });
});
