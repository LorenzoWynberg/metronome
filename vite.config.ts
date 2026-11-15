import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/metronome/',
  test: { environment: 'node' },
});
