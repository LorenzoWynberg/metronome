<!-- TRINITY-MANAGED-START -->

## Documentation

`metronome` is a repo of the metronome project, and its root is a package (Metronome). Trinity generates this section from the project packages and rewrites it whenever they change, so write your own notes outside it.

Its documentation starts at [`.trinity/docs/index.md`](.trinity/docs/index.md), which links every page in the `.trinity/docs/` families:

- `rules/<topic>.md`: the rules every change in the package follows
- `gotchas/<tech>.md`: one page per technology in the package stack
- `tech-guide/<section>/<chapter>.md`: how the code works
- `user-guide/<section>/<chapter>.md`: what a person sees and does

<!-- TRINITY-MANAGED-END -->

## Project notes

- Stack: Vite + TypeScript (vanilla, no UI framework), pnpm, Vitest, ESLint + Prettier. `package.json` and `pnpm-lock.yaml` are the record of the stack.
- Design: [`DESIGN.md`](DESIGN.md) is the source of the design. Tokens live in `src/styles/tokens.css`; style only with those custom properties (no hard-coded colours, fonts, spacing, radii or shadows). The accent is reserved for the beat and the focus ring. Flat fills only, no gradients.
- Layers: `src/state/` holds app state and pure logic; `src/audio/` holds the scheduler and sound; `src/ui/` holds the DOM. `src/state/` and `src/audio/` never import from `src/ui/` and never touch the DOM.
- A worker file adds `/// <reference lib="webworker" />` itself; `tsconfig.json` only lists the DOM lib.
- Tests sit beside their code as `*.test.ts` and run in node; a DOM test opts in per file with `// @vitest-environment happy-dom`.
- Gate commands are the pnpm scripts: `test`, `lint`, `typecheck`, `format:check`, `build`.
