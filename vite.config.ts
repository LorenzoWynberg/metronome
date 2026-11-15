import { defineConfig, type Plugin } from 'vitest/config';
import { checkShareMeta } from './src/build/shareMeta';

/** Fails the build when the page lacks a tag a shared link depends on. */
function requireShareMeta(): Plugin {
  return {
    name: 'require-share-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const missing = checkShareMeta(html);
        if (missing.length > 0) {
          throw new Error(
            `index.html is missing share/search meta tags: ${missing.join(', ')}`,
          );
        }
        return html;
      },
    },
  };
}

export default defineConfig({
  base: '/metronome/',
  plugins: [requireShareMeta()],
  test: { environment: 'node' },
});
