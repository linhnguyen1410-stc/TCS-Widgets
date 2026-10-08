# ADR-0001 — Manifest declares `offlineCapable="false"`

## Context

`src/LoadingCanvas.xml` was created with `offlineCapable="true"`. The widget's
data layer loads `PackingPlan` and `PackingPlanItem` via `mx.data.get({ xpath })`
(planRepository.ts), and cargo lists are fetched by guid batches. Verified against
the Mendix 10 React client docs (2026-09): XPath and microflow retrievals are NOT
supported in offline apps; guid/guids reads are. A widget flagged
`offlineCapable="true"` that then issues XPath reads would fail at runtime in
offline-capable apps.

## Options

1. Keep `offlineCapable="true"` and migrate every read to guid/guids (+ store
   needed GUIDs via a sync datasource) — large rework, no offline requirement today.
2. Set `offlineCapable="false"` — honest capability declaration; the widget stays
   web/online-only, matching its current implementation.
3. Keep `"true"` and do nothing — latent offline breakage.

## Decision

Option 2: `offlineCapable="false"` in `src/LoadingCanvas.xml`.

## Consequences

- Widget is correctly declared for online web apps; Studio warns deployers of
  online-only capability. No offline support is promised.
- Future offline support would require guid-based fetch paths first before flipping the flag back to `true`.

## Debt created

None (B-0001 closed by this decision).