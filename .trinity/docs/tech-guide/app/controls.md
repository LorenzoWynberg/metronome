# Controls panel

`mountControls(el, { store, engine })` in `src/ui/controls.ts` builds the instrument panel inside `#controls` and returns a cleanup function. `mountHero(el, store)` in `src/ui/hero.ts` renders the BPM readout into `#bpm-hero`. Both are mounted from `src/main.ts`.

## Controls

- BPM slider, number input and −/+ steppers (labelled "Decrease/Increase tempo by 1 BPM"); the number input commits on Enter, blur and `change` (spinner clicks and arrow keys); typing alone writes nothing.
- Volume: a labelled 0–100 range slider (`#volume-slider`, step 1) with an `<output>` readout and `aria-valuetext` such as "80%". Input events write `volume` to the store; the slider owns the arrow keys, so the tempo shortcut skips it.
- Tap tempo, Start/Stop (a button with `aria-pressed`) and a time-signature selector.
- A polite `aria-live` status region announces stepper changes and taps. A separate `role=alert` region shows a message when audio fails to start or playback stops after an error.

## Tempo presets

`TEMPO_PRESETS` in `src/state/presets.ts` lists six presets: Largo 50, Adagio 70, Andante 90, Moderato 110, Allegro 130, Presto 170. `activePreset(bpm)` returns the preset whose bpm equals the given value, or `undefined`. `mountControls` renders one button per preset in a `role=group` labelled "Tempo presets", each with `aria-label` "<name> <bpm> BPM". A click sets `bpm` in the store and announces it in the status region. The pressed state is derived from the store bpm through `activePreset`, so it follows slider, number, stepper and tap changes. Styles are in `src/styles/controls.css`.

## Beat counter

`mountControls` takes an optional `beatFeed` dependency. A `role=group` labelled "Beat counter" holds one `aria-hidden` digit (`.beat-counter-digit`), so it is sighted-only and never announced. `beatDisplay(event, beatsPerBar)` in `src/ui/beatDisplay.ts` returns the 1-based beat, clamped to the current meter, or `–` when there is no beat; beat 1 sets `data-downbeat` on the digit. The digit repaints on every feed event and every store change, and the last beat is cleared when `running` flips. The feed is described in [Audio engine](../audio/engine.md) terms: `createBeatFeed(store, engine)` in `src/audio/beatFeed.ts` is the only consumer of the beat queue. While the store is running it drains `takeDue` once per animation frame and gives only the latest due beat to every subscriber, then emits `null` when playback stops. The next frame is scheduled before emitting, so a throwing subscriber cannot stall it. The beat indicator subscribes to the same feed.

## Shortcuts

- Space toggles Start/Stop. It calls `preventDefault` on keydown and keyup so a focused button or radio does not activate twice.
- `T` taps tempo. It ignores key repeat and Ctrl/Meta/Alt combinations.
- ArrowUp/ArrowDown nudge the BPM by 1, or 5 with Shift. Holding the key repeats the nudge. The tempo is announced once, on keyup, and only if it changed over the burst. The slider and time-signature radios keep the arrow keys for themselves, so the shortcut skips them. Two `<kbd>` hints (↑ ↓) in the tempo group carry visually hidden "Up arrow"/"Down arrow" names.
- Every shortcut is ignored while focus is in an editable field: text-like inputs, textarea, select or contenteditable. Range, radio, checkbox and button inputs are not editable.
- Listeners sit on the document and are removed by the cleanup function.

## Tap tempo

`createTapTempo(now)` in `src/state/tapTempo.ts` keeps the last 5 taps. A gap over 2000 ms starts a new sequence. `tap()` returns `null` until two taps exist, then the mean interval as BPM through `clampBpm`.

Styles live in `src/styles/controls.css`, using the design tokens only.
