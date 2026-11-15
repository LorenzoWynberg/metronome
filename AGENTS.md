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

- Stack, CI and gate commands: [Tooling](.trinity/docs/rules/tooling.md).
- Design and token rules: [`DESIGN.md`](DESIGN.md) and [Styling](.trinity/docs/rules/styling.md).
- Layers, worker and timer rules: [Architecture](.trinity/docs/rules/architecture.md).
- Test layout and journey probes: [Testing](.trinity/docs/rules/testing.md).
