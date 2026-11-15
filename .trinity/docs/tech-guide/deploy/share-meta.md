# Share and search meta tags

`index.html` carries the head tags that shared links and search results are built from. `public/og-image.png` is the preview image they point to.

## Required tags

`REQUIRED_SHARE_TAGS` in `src/build/shareMeta.ts` lists ten tags: `description`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description` and `twitter:image`. A tag counts only when it has a `name` or `property` key and a non-empty `content`.

`checkShareMeta(html)` returns the names of the required tags that are missing or empty.

## Build check

The `require-share-meta` plugin in `vite.config.ts` runs only on `build`. In `transformIndexHtml` it calls `checkShareMeta` and throws `index.html is missing share/search meta tags: <names>` when any are missing, so the build fails.

The site URL repeats in several static tags in `index.html`. Meta tags must be literals, so the build check covers presence and not the value.
