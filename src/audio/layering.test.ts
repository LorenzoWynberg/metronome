import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const srcDir = new URL('../', import.meta.url);
const repoDir = new URL('../../', import.meta.url);

/** Every file under `dir`, as URLs, skipping the directories named. */
function walk(dir: URL, skip: readonly string[] = []): URL[] {
  return readdirSync(dir).flatMap((name) => {
    if (skip.includes(name)) return [];
    const url = new URL(name, dir);
    return statSync(url).isDirectory()
      ? walk(new URL(`${name}/`, dir), skip)
      : [url];
  });
}

const rel = (url: URL) => url.pathname.slice(repoDir.pathname.length);
const read = (url: URL) => readFileSync(url, 'utf8');

// The patterns are spelled so this file does not match them itself.
const IMPORTS_UI = /(?:from\s+|import\s*\(?\s*)['"][^'"]*\/u[i](?:\/|['"])/;
const MENTIONS_PAGE = /\bdocumen[t]\b/;
const TIMER = /\bset(?:Interval|Timeout)\b/;

describe('audio layer boundaries', () => {
  const audioFiles = walk(new URL('audio/', srcDir)).filter((u) =>
    u.pathname.endsWith('.ts'),
  );

  it('finds the audio sources', () => {
    expect(audioFiles.map(rel)).toContain('src/audio/engine.ts');
  });

  it('no file under src/audio imports from src/ui', () => {
    for (const f of audioFiles) expect(read(f), rel(f)).not.toMatch(IMPORTS_UI);
  });

  it('no file under src/audio references the DOM page object', () => {
    for (const f of audioFiles) {
      expect(read(f), rel(f)).not.toMatch(MENTIONS_PAGE);
    }
  });

  it('only the scheduler worker uses timers in src (tests excluded)', () => {
    const users = walk(srcDir)
      .filter((u) => u.pathname.endsWith('.ts'))
      .filter((u) => !u.pathname.endsWith('.test.ts'))
      .filter((u) => TIMER.test(read(u)))
      .map(rel);
    expect(users).toEqual(['src/audio/scheduler.worker.ts']);
  });

  it('the repository holds no audio sample files', () => {
    const samples = walk(repoDir, ['node_modules', '.git'])
      .map(rel)
      .filter((p) => /\.(?:wav|mp3|ogg|m4a|flac)$/i.test(p));
    expect(samples).toEqual([]);
  });
});
