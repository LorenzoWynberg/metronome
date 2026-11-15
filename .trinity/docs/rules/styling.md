# Styling

Shape: [App shell](../tech-guide/app/shell.md)

- Tokens live in `src/styles/tokens.css`; style only with those custom properties.
- Use only the custom properties in `src/styles/tokens.css`; no hard-coded colours, fonts, spacing, radii or shadows.
- The accent (`--accent`, `--ring`) is reserved for the beat and the focus ring.
- Flat fills only, no gradients.
- `--border` and `--input` are low-contrast and must not be the only visible edge of a control.
