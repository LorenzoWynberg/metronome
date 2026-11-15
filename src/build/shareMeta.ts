/**
 * The head tags a shared link and a search result are built from. Each is a
 * `name` (`description`, `twitter:*`) or a `property` (`og:*`) meta tag.
 */
export const REQUIRED_SHARE_TAGS = [
  'description',
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:image',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
] as const;

const META_TAG = /<meta\b[^>]*>/gi;
const ATTRIBUTE =
  /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

/** The `name`/`property` key and `content` of a meta tag, when it has both. */
function readMeta(tag: string): { key: string; content: string } | undefined {
  const attrs = new Map<string, string>();
  for (const m of tag.matchAll(ATTRIBUTE)) {
    attrs.set((m[1] ?? '').toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
  }
  const key = attrs.get('property') ?? attrs.get('name');
  if (key === undefined) return undefined;
  return { key, content: attrs.get('content') ?? '' };
}

/** The names of the required tags that are missing from `html` or empty. */
export function checkShareMeta(html: string): string[] {
  const present = new Set<string>();
  for (const tag of html.match(META_TAG) ?? []) {
    const meta = readMeta(tag);
    if (meta && meta.content.trim() !== '') present.add(meta.key);
  }
  return REQUIRED_SHARE_TAGS.filter((tag) => !present.has(tag));
}
