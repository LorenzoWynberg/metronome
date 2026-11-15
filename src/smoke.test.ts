import { describe, expect, it } from 'vitest';

describe('toolchain smoke', () => {
  it('runs TypeScript tests in the default node environment', () => {
    expect(typeof document).toBe('undefined');
  });
});
