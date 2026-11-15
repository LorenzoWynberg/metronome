# Tooling

- Stack: Vite + TypeScript (vanilla, no UI framework), pnpm, Vitest, ESLint + Prettier. `package.json` and `pnpm-lock.yaml` are the record of the stack.
- CI: `.github/workflows/deploy-pages.yml` is the single CI workflow; it only builds and deploys to GitHub Pages on push to `main` and runs no checks (tests stay in Trinity's sandbox).
- Gate commands are the pnpm scripts: `test`, `lint`, `typecheck`, `format:check`, `build`.
