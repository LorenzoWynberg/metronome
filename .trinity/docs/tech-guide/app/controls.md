# Controls panel

`mountControls(el, { store, engine })` in `src/ui/controls.ts` builds the instrument panel inside `#controls` and returns a cleanup function. `mountHero(el, store)` in `src/ui/hero.ts` renders the BPM readout into `#bpm-hero`. Both are mounted from `src/main.ts`.

## Controls

- BPM slider, number input and −/+ steppers (labelled "Decrease/Increase tempo by 1 BPM"); the number input commits on Enter.
- Tap tempo, Start/Stop (a button with `aria-pressed`) and a time-signature selector.
- A polite `aria-live` status region announces stepper changes and taps.

## Shortcuts

- Space toggles Start/Stop. It calls `preventDefault` on keydown and keyup so a focused button or radio does not activate twice.
- `T` taps tempo. It ignores key repeat, Ctrl/Meta/Alt combinations and focus in the number input.
- Listeners sit on the document and are removed by the cleanup function.

## Tap tempo

`createTapTempo(now)` in `src/state/tapTempo.ts` keeps the last 5 taps. A gap over 2000 ms starts a new sequence. `tap()` returns `null` until two taps exist, then the mean interval as BPM through `clampBpm`.

Styles live in `src/styles/controls.css`, using the design tokens only.
