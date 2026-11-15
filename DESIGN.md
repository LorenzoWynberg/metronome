---
version: "alpha"
name: "Design system"
description: "Design system as the Metronome codebase renders it, from the manifest root /metronome."
packageId: "9422ffca-fcc8-5ebe-872e-46b977c5f4e7"
omitted:
  - section: "components"
    reason: "Trinity settles token axes, never component recipes — a button, a chip and an input are built from the roles and scales this document states, so there is no component token set to write down."
colors:
  background: "oklch(0.985 0.004 85)"
  surface: "oklch(0.97 0.005 85)"
  elevated: "oklch(1 0 0)"
  foreground: "oklch(0.22 0.01 265)"
  muted: "oklch(0.48 0.012 265)"
  primary: "oklch(0.45 0.16 265)"
  on-primary: "oklch(0.985 0.004 85)"
  secondary: "oklch(0.52 0.06 265)"
  on-secondary: "oklch(0.99 0.003 85)"
  accent: "oklch(0.62 0.165 45)"
  on-accent: "oklch(0.2 0.02 55)"
  danger: "oklch(0.55 0.2 25)"
  on-danger: "oklch(0.99 0.003 85)"
  warning: "oklch(0.64 0.12 75)"
  on-warning: "oklch(0.18 0.02 75)"
  success: "oklch(0.53 0.13 150)"
  on-success: "oklch(0.99 0.003 85)"
  info: "oklch(0.5 0.11 240)"
  on-info: "oklch(0.99 0.003 85)"
  border: "oklch(0.88 0.008 85)"
  input: "oklch(0.86 0.008 85)"
  ring: "oklch(0.62 0.165 45)"
  dark-background: "oklch(0.17 0.008 265)"
  dark-surface: "oklch(0.21 0.01 265)"
  dark-elevated: "oklch(0.25 0.012 265)"
  dark-foreground: "oklch(0.95 0.005 85)"
  dark-muted: "oklch(0.72 0.012 265)"
  dark-primary: "oklch(0.74 0.12 265)"
  dark-on-primary: "oklch(0.17 0.02 265)"
  dark-secondary: "oklch(0.62 0.06 265)"
  dark-on-secondary: "oklch(0.15 0.01 265)"
  dark-accent: "oklch(0.76 0.15 60)"
  dark-on-accent: "oklch(0.2 0.03 55)"
  dark-danger: "oklch(0.68 0.17 25)"
  dark-on-danger: "oklch(0.17 0.02 25)"
  dark-warning: "oklch(0.8 0.13 80)"
  dark-on-warning: "oklch(0.2 0.03 75)"
  dark-success: "oklch(0.72 0.13 150)"
  dark-on-success: "oklch(0.17 0.02 150)"
  dark-info: "oklch(0.72 0.11 235)"
  dark-on-info: "oklch(0.17 0.02 235)"
  dark-border: "oklch(0.32 0.012 265)"
  dark-input: "oklch(0.35 0.012 265)"
  dark-ring: "oklch(0.76 0.15 60)"
typography:
  display:
    fontFamily: "Inter"
  body:
    fontFamily: "Inter"
  mono:
    fontFamily: "JetBrains Mono"
  xs:
    fontSize: "0.75rem"
  sm:
    fontSize: "0.875rem"
  base:
    fontSize: "1rem"
  lg:
    fontSize: "1.125rem"
  xl:
    fontSize: "1.25rem"
  2xl:
    fontSize: "1.5rem"
  3xl:
    fontSize: "1.875rem"
  4xl:
    fontSize: "2.25rem"
  leading-tight:
    lineHeight: 1.25
  leading-snug:
    lineHeight: 1.375
  leading-normal:
    lineHeight: 1.5
  leading-relaxed:
    lineHeight: 1.625
rounded:
  lg: "0.375rem"
spacing:
  base: "0.25rem"
---

# Design system — Metronome

## Overview

Design system **Design system** ships one theme, on a light facet and a dark one.

Trinity renders this file from a design revision a story applies. The values below ARE
that revision. A later story applying a changed revision shows the difference against
this file in its pull request, so a hand edit here is reconciled there rather than
overwritten.

Every block below carries the colour roles, the `--elevation-*` elevation scale, the `--radius*` shape scale, the `--spacing*`/`--text-*`/`--leading-*` density scale, and the `--duration-*`/`--ease-*` motion scale.

Design intent no token axis expresses. Honour it alongside the tokens below; it never
overrides or contradicts one.

A single-screen instrument, not a dashboard: the BPM readout is the hero element, with everything else secondary to it. The accent colour is reserved for the beat (downbeat flash, beat indicator) and the focus ring, and is never used on ordinary buttons. Flat fills only, no gradients.

## Colors

Every surface, mark and state colours off a NAMED ROLE rather than off a literal — a
role is what lets a facet change underneath a component without the component knowing.

Light:

```css
--background: oklch(0.985 0.004 85);
--surface: oklch(0.97 0.005 85);
--elevated: oklch(1 0 0);
--foreground: oklch(0.22 0.01 265);
--muted: oklch(0.48 0.012 265);
--primary: oklch(0.45 0.16 265);
--on-primary: oklch(0.985 0.004 85);
--secondary: oklch(0.52 0.06 265);
--on-secondary: oklch(0.99 0.003 85);
--accent: oklch(0.62 0.165 45);
--on-accent: oklch(0.2 0.02 55);
--danger: oklch(0.55 0.2 25);
--on-danger: oklch(0.99 0.003 85);
--warning: oklch(0.64 0.12 75);
--on-warning: oklch(0.18 0.02 75);
--success: oklch(0.53 0.13 150);
--on-success: oklch(0.99 0.003 85);
--info: oklch(0.5 0.11 240);
--on-info: oklch(0.99 0.003 85);
--border: oklch(0.88 0.008 85);
--input: oklch(0.86 0.008 85);
--ring: oklch(0.62 0.165 45);
```

Dark:

```css
--background: oklch(0.17 0.008 265);
--surface: oklch(0.21 0.01 265);
--elevated: oklch(0.25 0.012 265);
--foreground: oklch(0.95 0.005 85);
--muted: oklch(0.72 0.012 265);
--primary: oklch(0.74 0.12 265);
--on-primary: oklch(0.17 0.02 265);
--secondary: oklch(0.62 0.06 265);
--on-secondary: oklch(0.15 0.01 265);
--accent: oklch(0.76 0.15 60);
--on-accent: oklch(0.2 0.03 55);
--danger: oklch(0.68 0.17 25);
--on-danger: oklch(0.17 0.02 25);
--warning: oklch(0.8 0.13 80);
--on-warning: oklch(0.2 0.03 75);
--success: oklch(0.72 0.13 150);
--on-success: oklch(0.17 0.02 150);
--info: oklch(0.72 0.11 235);
--on-info: oklch(0.17 0.02 235);
--border: oklch(0.32 0.012 265);
--input: oklch(0.35 0.012 265);
--ring: oklch(0.76 0.15 60);
```

## Typography

A theme's families are named rather than embedded; load them however this codebase
loads fonts, always with a safe system fallback after the named family. Set every
`font-size` off `var(--text-*)`, paired with the matching `var(--leading-*)` line
height.

Families — display Inter, body Inter, mono JetBrains Mono.

```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

## Layout

Spacing is one base unit with a ladder derived from it, so a layout tightens or loosens
from a single value. Take every padding, margin and gap off `var(--spacing*)` rather
than from a raw length.

```css
--spacing: 0.25rem;
--spacing-1: calc(var(--spacing) * 1);
--spacing-2: calc(var(--spacing) * 2);
--spacing-3: calc(var(--spacing) * 3);
--spacing-4: calc(var(--spacing) * 4);
--spacing-6: calc(var(--spacing) * 6);
--spacing-8: calc(var(--spacing) * 8);
--spacing-12: calc(var(--spacing) * 12);
```

## Elevation & Depth

Depth is carried by named scales, never by an ad-hoc shadow: every raised surface takes
its `box-shadow` from a step of the scale below, at the value that step holds on the
ground the surface sits on.

Light, carrying elevation:

```css
--elevation-2xs: 0 1px rgb(0 0 0 / 0.05);
--elevation-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--elevation-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--elevation-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--elevation-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--elevation-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--elevation-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

Dark, carrying elevation:

```css
--elevation-2xs: 0 0 1px rgb(0 0 0 / 0.3);
--elevation-xs: 0 0 3px rgb(0 0 0 / 0.3);
--elevation-sm: 0 1px 6px 0 rgb(0 0 0 / 0.35);
--elevation-md: 0 2px 12px 0 rgb(0 0 0 / 0.4);
--elevation-lg: 0 4px 20px 2px rgb(0 0 0 / 0.45);
--elevation-xl: 0 6px 32px 4px rgb(0 0 0 / 0.5);
--elevation-2xl: 0 10px 56px 8px rgb(0 0 0 / 0.6);
```

## Shapes

One corner-radius base with a scale derived around it — take every `border-radius` off
`var(--radius*)` so the whole shape language moves with the base.

```css
--radius: 0.375rem;
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
--radius-2xl: calc(var(--radius) + 8px);
--radius-3xl: calc(var(--radius) + 12px);
--radius-4xl: calc(var(--radius) + 16px);
```

## Do's and Don'ts

- Do drive every styled property off these tokens — colour off `var(--role)`, every depth `box-shadow` off `var(--elevation-*)`, every `border-radius` off `var(--radius*)`, every padding, margin and gap off `var(--spacing*)`, every `font-size` off `var(--text-*)` paired with the matching `var(--leading-*)` `line-height`, and every transition/animation off `var(--duration-*)` paired with the matching `var(--ease-*)`.
- Do not hardcode a value a token covers. A literal is a value the design can no longer
  move.
- Do give every named font family a safe system fallback after it.
- Do reconcile a hand edit to these values with the next design revision a story applies,
  which shows its difference in the pull request.

## Motion

One scale per theme, read the same on every ground. Take every transition and animation
off `var(--duration-*)`, paired with the matching `var(--ease-*)`.

```css
--duration-fast: 120ms;
--duration-base: 180ms;
--duration-slow: 240ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-entrance: cubic-bezier(0, 0, 0.2, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```
