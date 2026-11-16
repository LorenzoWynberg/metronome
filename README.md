# metronome

A small browser metronome: set the tempo and time signature, jump to a tempo preset (Largo to Presto), tap to set tempo, with an accented first beat.

## Development

```sh
pnpm install
pnpm dev
```

Gate: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.

## Manual checks

### Steady click in a hidden tab

**Status:** Outstanding: the 60 s hidden-tab check has not been run in Chrome, Firefox, Safari or iOS Safari, so the assumption that a Worker-hosted tick is not throttled in background tabs is unverified.

The scheduler is ticked from a Web Worker on the assumption that browsers do not throttle a worker's timers when the tab is hidden. That assumption is not proven by the unit tests, so check it by hand in current **Chrome**, **Firefox** and **Safari**, including **iOS Safari**:

1. Open the app and start the metronome at **120 BPM**.
2. Switch to another tab or minimise the window for **at least 60 s**. On iOS, switch to another app or lock the screen for the same time.
3. Listen throughout: the click must stay steady, with no drift, gaps or bursts of clicks.
4. Return to the tab and confirm the beat indicator resumes in step with the click.

If a browser stops the audio when the page is hidden (iOS can suspend or interrupt the audio context), the app must show itself as stopped on return rather than playing out of step.
