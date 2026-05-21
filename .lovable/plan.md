# KINEMA Update Plan

Adds vector addition to Motion Graphs Explorer, a new Derivation tab, a green theme with dark mode, a full-width layout, and removes remaining third-party branding traces.

## 1. Vector Addition in Motion Graphs Explorer

Add a new collapsible section above the existing graphs called **"Vector Addition Playground"**.

Features:
- Add/remove an unlimited list of 2D vectors. Each vector has: label, magnitude, angle (degrees), color.
- Live SVG canvas showing:
  - Each vector drawn tip-to-tail from the origin (with arrowheads, labels, and a faint grid).
  - The **resultant vector** drawn in a bold accent color from origin to the final tip.
  - Optional toggle: "Parallelogram view" (for 2 vectors) vs "Tip-to-tail" (any count).
- Live numeric output: components (Σx, Σy), resultant magnitude, resultant angle, and per-vector x/y components.
- Step-by-step guide panel beside the canvas:
  1. Break each vector into x = m·cos(θ), y = m·sin(θ)
  2. Sum components: Rx = Σx, Ry = Σy
  3. Magnitude: |R| = √(Rx² + Ry²)
  4. Direction: θ = atan2(Ry, Rx)
- "Try this" preset buttons (e.g., two perpendicular vectors, three-force equilibrium, closed polygon).

## 2. New "Derivation" Tab

New top-level tab between "Motion Graphs" and "Horizontal" called **Derivation**. High-school friendly, large fonts, heavy emphasis on key steps.

Layout: single-column, wide, with a sticky in-page sidebar listing the four equations for quick jumping.

Equations covered, each with its own section:
1. **v = v₀ + at** — derived from definition of acceleration (a = Δv/Δt).
2. **x = v₀t + ½at²** — derived from area under a v–t graph (trapezoid → triangle + rectangle).
3. **v² = v₀² + 2a(x − x₀)** — derived by eliminating t from equations 1 and 2.
4. **x = ½(v₀ + v)t** — derived from average velocity for constant acceleration.

Each section contains:
- Plain-English intro ("What this equation tells you").
- Starting point (definition or graph).
- Step-by-step algebra with each step on its own line, big formula blocks, and **highlighted** key moves ("multiply both sides by t", "substitute v from eq. 1", etc.).
- Mini v–t graph illustration where relevant (SVG, reusing chart tokens).
- "Worked example" collapsible with numbers plugged in.
- "Common mistakes" callout.

Visual emphasis:
- Bigger base font (text-lg/xl), large formula blocks (text-2xl mono), colored highlight pills for substitutions, numbered step badges.

## 3. Green Theme + Dark Mode

- Replace blue primary tokens in `src/index.css` with a green palette (primary ≈ emerald/forest green; accent ≈ teal/lime). Update gradients, chart-blue → chart-green usage where it represents "primary".
- Add a **dark mode toggle** in the header (sun/moon icon button) that toggles the `dark` class on `<html>` and persists choice in localStorage. Dark palette uses deep green-tinted neutrals.
- Verify all components use semantic tokens (no hard-coded colors) so both modes look right.

## 4. Full-Width Layout

- Change `max-w-6xl` containers in `src/pages/Index.tsx` (and `App.css` `#root` max-width) to `max-w-screen-2xl` / full width with comfortable padding, so the app uses the whole monitor.
- Increase base text and section spacing across pages for readability.

## 5. Remove Third-Party Branding Traces

- `package.json`: rename project, remove `lovable-tagger` dev dep and any related scripts.
- `vite.config.ts`: remove `lovable-tagger` plugin import/usage.
- `README.md`: rewrite as a clean KINEMA project README.
- `index.html`: confirm no references remain (already clean).
- Lockfiles will regenerate on install.

## Technical Notes

- New files:
  - `src/components/VectorAddition.tsx` (used inside MotionGraphsExplorer)
  - `src/components/Derivation.tsx`
  - `src/components/ThemeToggle.tsx` + `src/hooks/use-theme.ts`
- Updated files:
  - `src/components/MotionGraphsExplorer.tsx` (embed VectorAddition + guide tweaks)
  - `src/components/TabNav.tsx` (add Derivation tab, type union)
  - `src/pages/Index.tsx` (route new tab, add ThemeToggle, widen layout)
  - `src/index.css`, `tailwind.config.ts` (green tokens, dark palette)
  - `src/App.css` (remove max-width cap)
  - `package.json`, `vite.config.ts`, `README.md` (debranding)
- No backend changes; everything stays client-side.
