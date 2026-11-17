import { describe, expect, it } from 'vitest';
import { beatDisplay } from './beatDisplay';

describe('beatDisplay', () => {
  it('shows a dash with no event', () => {
    expect(beatDisplay(null, 4)).toEqual({ text: '–', isDownbeat: false });
  });
  it('shows 1 as the downbeat', () => {
    expect(beatDisplay({ beat: 0 }, 4)).toEqual({
      text: '1',
      isDownbeat: true,
    });
  });
  it('shows later beats without the downbeat', () => {
    expect(beatDisplay({ beat: 2 }, 4)).toEqual({
      text: '3',
      isDownbeat: false,
    });
  });
  it('clamps to the current meter', () => {
    expect(beatDisplay({ beat: 5 }, 3)).toEqual({
      text: '3',
      isDownbeat: false,
    });
  });
});
