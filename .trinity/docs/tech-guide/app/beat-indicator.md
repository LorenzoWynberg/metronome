# Beat indicator

`mountBeatIndicator(el, { store, engine })` in `src/ui/beatIndicator.ts` renders one cell per beat into `#beat-indicator` and returns a cleanup function. It is mounted from `src/main.ts`. Styles live in `src/styles/beatIndicator.css`.

## Driving the lit beat

- While the store reports `running`, a `requestAnimationFrame` loop calls `engine.beatQueue.takeDue(engine.currentTime())`, so lighting follows the audio clock.
- Only the latest due beat is lit; a hidden tab never replays a backlog.
- When the event's `beatsPerBar` differs from the cell count, the cells are rebuilt from the matching meter in `TIME_SIGNATURES`, or all `normal` when none matches.
- Stopping, or changing the signature while stopped, cancels the loop and renders the idle cells for the selected meter.

## Cells and flash

- Each cell carries `level-<accent>` and `data-level`; the lit cell gets `is-lit`.
- A `strong` beat sets `data-flash="on"` on the container. The flash fades from `--elevated`, not `--accent`, so the lit downbeat cell stays visible.
- The container is `aria-hidden`; the Start/Stop state and status region carry the accessible meaning.
- Reduced motion is honoured in the stylesheet.
