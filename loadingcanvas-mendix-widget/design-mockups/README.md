# Design Mockups — Status

**Last reviewed:** 2026-09-15  
**Source of truth for implementation:** `src/presentation/widget/LoadingCanvas.css` + `src/core/constants/theme.ts`

---

## Mockup Options (Static HTML)

| File | Theme Name | Status |
|------|------------|--------|
| `option-a-dark-ops.html` | Industrial Control Room — Dark Ops | **Exploratory** — not implemented |
| `option-b-light-saas.html` | Mendix Atlas Light — SaaS Clean | **Exploratory** — not implemented |
| `option-c-blueprint-pro.html` | Technical Blueprint — CAD Style | **Exploratory** — not implemented |

---

## Current Implementation

The production widget uses a **minimal, neutral theme**:

```css
/* src/presentation/widget/LoadingCanvas.css */
.widget-loading-canvas {
  width: 100%;
  box-sizing: border-box;
}
.widget-loading-canvas canvas,
.widget-loading-canvas .widget-loading-canvas-grid {
  position: relative;
}
```

```ts
// src/core/constants/theme.ts
export const CANVAS_BACKGROUND_COLOR = "#ffffff";
export const ERROR_TEXT_COLOR = "red";
export const SAVE_ERROR_COLOR = "#b00020";
export const EMPTY_STATE_COLOR = "#666";
export const EMPTY_STATE_FONT_SIZE = 16;
```

**No dark mode, no theming system, no Atlas UI alignment, no CAD-style blueprint rendering.**

---

## What the Mockups Explore (Not Yet Built)

### Option A — Dark Ops
- Dark slate background, cyan grid glow
- Left cargo manifest sidebar with drag handles
- Truck silhouette with highlighted load zone + meter ruler
- Right dashboard: segmented progress, payload gauge, collision alert stack, flat action buttons

### Option B — Mendix Atlas Light (SaaS Clean)
- White canvas card, subtle blue grid
- Floating glass status panel (stats, usage bars, validation alert, action buttons)
- Bottom cargo rail with proportional thumbnails + hover state
- Pastel cargo cards with square-corner handles

### Option C — Technical Blueprint (CAD Style)
- Blueprint-blue engineering sheet
- Monospace manifest table with per-item status
- Precise truck outline with yellow dimension lines + meter ticks
- Crosshair readout, HUD statistics/actions panels, legend + drawing title block

---

## Adoption Path

If/when a theme is adopted:

1. The chosen option's CSS variables / design tokens move into `src/core/constants/theme.ts`
2. `LoadingCanvas.css` expands to implement the visual language
3. This README is updated to mark the adopted option and archive the others
4. `CHANGELOG.md` entry cites the theme adoption (`feat · presentation`)

---

## Quick Links

- [Option A — Dark Ops](option-a-dark-ops.html)
- [Option B — Light SaaS](option-b-light-saas.html)
- [Option C — Blueprint Pro](option-c-blueprint-pro.html)
- [Gallery Index](index.html)