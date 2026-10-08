# Debt Register

Known compromises, NOT bugs (bugs go in `BUGLOG.md`).
`// DEBT(#id)` comments in code MUST have a matching row here.

| #id | file:line | symptom | interest (cost of waiting) | plan | owner | due |
|-----|-----------|---------|----------------------------|------|-------|-----|
| D-3 | src/infrastructure/mendix/mendixRuntime.ts createMockMxObject | mock shape not synced to Domain Model changes | tests lie after model changes | mock review on EVERY schema change | TBD | ongoing |
| D-4 | package.json jest.coverageThreshold | thresholds declared but never enforced — the pluggable-widgets-tools wrapper overrides the repo jest config (prints "Unknown option collectCoverage" every run); a 77% lines run passed silently against the 80% floor | coverage claims in docs are unverified; coverage regressions slip through | enforce via a dedicated gate (run jest with the repo config directly or assert the coverage JSON in a script) | TBD | ongoing |

Resolved:

- D-1 (2026-09-14) — View over budget: toolbar/info panel extracted into
  `src/presentation/components/CanvasToolbar.tsx` (124 lines); View down to 345 lines.
- D-2 (2026-09-14) — `planRepository` split into `planLoader.ts` (176) /
  `planSaver.ts` (215) behind a 5-line facade.