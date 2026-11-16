# Controls panel

`mountControls(el, { store, engine })` in `src/ui/controls.ts` builds the instrument panel inside `#controls` and returns a cleanup function. `mountHero(el, store)` in `src/ui/hero.ts` renders the BPM readout into `#bpm-hero`. Both are mounted from `src/main.ts`.

## Controls

- BPM slider, number input and −/+ steppers (labelled "Decrease/Increase tempo by 1 BPM"); the number input commits on Enter, blur and `change` (spinner clicks and arrow keys); typing alone writes nothing.
- Tap tempo, Start/Stop (a button with `aria-pressed`) and a time-signature selector.
- A polite `aria-live` status region announces stepper changes and taps. A separate `role=alert` region shows a message when audio fails to start or playback stops after an error.

## Tempo presets

`TEMPO_PRESETS` in `src/state/presets.ts` lists six presets: Largo 50, Adagio 70, Andante 90, Moderato 110, Allegro 130, Presto 170. `activePreset(bpm)` returns the preset whose bpm equals the given value, or `undefined`. `mountControls` renders one button per preset in a `role=group` labelled "Tempo presets", each with `aria-label` "<name> <bpm> BPM". A click sets `bpm` in the store and announces it in the status region. The pressed state is derived from the store bpm through `activePreset`, so it follows slider, number, stepper and tap changes. Styles are in `src/styles/controls.css`.

## Shortcuts

- Space toggles Start/Stop. It calls `preventDefault` on keydown and keyup so a focused button or radio does not activate twice.
- `T` taps tempo. It ignores key repeat, Ctrl/Meta/Alt combinations and focus in the number input.
- Listeners sit on the document and are removed by the cleanup function.

## Tap tempo

`createTapTempo(now)` in `src/state/tapTempo.ts` keeps the last 5 taps. A gap over 2000 ms starts a new sequence. `tap()` returns `null` until two taps exist, then the mean interval as BPM through `clampBpm`.

Styles live in `src/styles/controls.css`, using the design tokens only.
