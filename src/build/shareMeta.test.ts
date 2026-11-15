import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';
import { checkShareMeta, REQUIRED_SHARE_TAGS } from './shareMeta';

const SITE = 'https://lorenzowynberg.github.io/metronome/';

describe('index.html', () => {
  it('carries every share and search tag', () => {
    expect(checkShareMeta(indexHtml)).toEqual([]);
  });

  it('points its share images at a file that ships from public/', () => {
    const images = [
      ...indexHtml.matchAll(
        /(?:property|name)="(?:og|twitter):image"\s+content="([^"]+)"/g,
      ),
    ].map((m) => m[1] ?? '');
    expect(images).toHaveLength(2);
    const publicFiles = Object.keys(import.meta.glob('/public/*.png'));
    for (const url of images) {
      expect(url.startsWith(SITE)).toBe(true);
      expect(publicFiles).toContain(`/public/${url.slice(SITE.length)}`);
    }
  });
});

const tagFor = (key: string, content: string): string => {
  const attr = key.startsWith('og:') ? 'property' : 'name';
  return `<meta ${attr}="${key}" content="${content}" />`;
};

const html = (without: string[] = []): string =>
  `<head>${REQUIRED_SHARE_TAGS.filter((t) => !without.includes(t))
    .map((t) => tagFor(t, `value of ${t}`))
    .join('\n')}</head>`;

describe('checkShareMeta', () => {
  it('returns nothing for a page that carries every tag', () => {
    expect(checkShareMeta(html())).toEqual([]);
  });

  it('reports each tag that is missing', () => {
    for (const tag of REQUIRED_SHARE_TAGS) {
      expect(checkShareMeta(html([tag]))).toEqual([tag]);
    }
  });

  it('reports a tag whose content is empty', () => {
    const page = html(['og:image']) + tagFor('og:image', '');
    expect(checkShareMeta(page)).toEqual(['og:image']);
  });

  it('reads attributes in any order and either quote style', () => {
    const page =
      html(['description', 'og:title']) +
      "<meta content='A metronome' name='description'>" +
      '<meta content="Metronome" property="og:title">';
    expect(checkShareMeta(page)).toEqual([]);
  });
});
