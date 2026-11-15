# GitHub Pages deploy

`.github/workflows/deploy-pages.yml` builds the site and publishes it to GitHub Pages. It is the repo's only CI workflow and runs no checks; tests and lint stay in the gate commands.

## Trigger

It runs on every push to `main`. There is no manual trigger.

## Jobs

- `build` checks out, installs with `pnpm install --frozen-lockfile` on Node 22, runs `pnpm build`, and uploads `dist` as the Pages artifact.
- `deploy` needs `build` and publishes the artifact through the `github-pages` environment.

## Concurrency

The `pages` group runs with `cancel-in-progress: false`, so a deploy already running finishes and a newer push waits behind it.

The site is served under `/metronome/`, matching the Vite base path.
