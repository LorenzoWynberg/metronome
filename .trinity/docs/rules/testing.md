# Testing

- Tests sit beside their code as `*.test.ts` and run in node; a DOM test opts in per file with `// @vitest-environment happy-dom`.
- Journey probes live in `probes/`: Node scripts that drive headless Chromium (`TRINITY_CHROMIUM_PATH`) over the DevTools pipe against `vite`/`vite preview` on `PORT`. Run one with `pnpm build && node probes/<name>.mjs`.
