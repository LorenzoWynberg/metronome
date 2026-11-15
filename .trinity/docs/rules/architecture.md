# Architecture

- Layers: `src/state/` holds app state and pure logic; `src/audio/` holds the scheduler and sound; `src/ui/` holds the DOM. `src/state/` and `src/audio/` never import from `src/ui/` and never touch the DOM.
- Timers: only `src/audio/scheduler.worker.ts` may call `setInterval` or `setTimeout` in `src/` (`*.test.ts` files excepted). Timing runs on the Web Audio clock, ticked from that worker; `src/audio/layering.test.ts` enforces the rule.
- A worker file adds `/// <reference lib="webworker" />` itself; `tsconfig.json` only lists the DOM lib.
