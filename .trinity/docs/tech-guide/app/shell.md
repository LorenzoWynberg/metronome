# App shell

`index.html` holds one `main` with three regions: `#bpm-hero` (tempo readout), `#beat-indicator` and `#controls`, plus a visually hidden `h1`. `src/main.ts` mounts each one: `#bpm-hero` by `mountHero`, `#beat-indicator` by `mountBeatIndicator` ([beat-indicator.md](beat-indicator.md)) and `#controls` by `mountControls` ([controls.md](controls.md)).

`src/main.ts` imports the Inter and JetBrains Mono variable fonts and the stylesheets in `src/styles/`:

- `tokens.css`: the Ink & Amber design tokens as custom properties, light and dark.
- `base.css`: element defaults.
- `layout.css`: `main` is a centred column, max width 40rem, full dynamic viewport height.
- `controls.css`: styles for the tempo readout (`#bpm-hero`) and the controls.
- `beatIndicator.css`: styles for `#beat-indicator` and its beat cells.

`vite.config.ts` sets `base: '/metronome/'`, so the app is served under that path; `scripts/start-dev.sh` health-checks `/metronome/`. Tests run in node by default; a DOM test opts in with `// @vitest-environment happy-dom`.
