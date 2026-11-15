# App shell

`index.html` holds one `main` with three regions: `#bpm-hero` (tempo readout), `#beat-indicator` and `#controls`, plus a visually hidden `h1`. They are empty placeholders that later work mounts into.

`src/main.ts` imports the Inter and JetBrains Mono variable fonts and three stylesheets in `src/styles/`:

- `tokens.css`: the Ink & Amber design tokens as custom properties, light and dark.
- `base.css`: element defaults.
- `layout.css`: `main` is a centred column, max width 40rem, full dynamic viewport height.

`vite.config.ts` sets `base: '/metronome/'`, so the app is served under that path; `scripts/start-dev.sh` health-checks `/metronome/`. Tests run in node by default; a DOM test opts in with `// @vitest-environment happy-dom`.
