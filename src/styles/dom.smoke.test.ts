// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('dom smoke', () => {
  it('opts in to happy-dom per file', () => {
    document.body.innerHTML = '<main id="m"></main>';
    expect(document.getElementById('m')?.tagName).toBe('MAIN');
  });
});
