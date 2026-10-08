# Upgrade Guide — LoadingCanvas Widget

## Overview

This guide documents the **compatibility matrix** and **4-step upgrade process** for the LoadingCanvas Mendix pluggable widget. See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full architecture documentation.

**Widget ID:** `stcvn.loadingcanvas.LoadingCanvas`
**Package path:** `stcvn`

---

## Documentation Gate (build-enforced)

`npm run build` runs the full documentation gate (`npm run docs:check` → `scripts/docs-check.mjs`) as its prebuild step. It enforces the trigger matrix in `scripts/docs-rules.mjs` against the working tree (modified + staged + untracked files):

- Any source change under `src/` requires a `CHANGELOG.md` entry (`CH-####`) in the `[Unreleased]` section.
- Layer-specific changes require the matching docs in the same change — infrastructure changes require `ARCHITECTURE.md`, `docs/MENDIX_ENTITY.md` and `docs/TEST_COVERAGE.md`; presentation changes also require `README.md`; domain changes also require `BUSINESS_RULES.md`.
- Doc-link validity (`scripts/check-doc-links.mjs`) and import bans (`scripts/check-imports.mjs`) run in the same gate.

Keep documentation and source in the same change, or the build fails with the list of missing documents.

---

## Compatibility Matrix

<!-- DOCS_SYNC:version-matrix:START -->
| react | — |
| react-dom | — |
| typescript | ^5.9.3 |
| @mendix/pluggable-widgets-tools | ^10.0.2 |
| eslint | — |
| jest | — |
| vitest | ^1.6.1 |
| prettier | — |
| rollup | — |
| widget version | 1.0.0 |
| node | >=16 |
<!-- DOCS_SYNC:version-matrix:END -->

<!-- DOCS_SYNC:test-count:START -->
> Run `npm test` — the count is reported by the test runner; this region is a pointer, not a copy.
<!-- DOCS_SYNC:test-count:END -->

### Version Matrix Summary

| Scenario                 | Node      | React  | TypeScript | Mendix | Tools   |
| :----------------------- | :-------- | :----- | :--------- | :----- | :------ |
| **Current stable**       | 18/20 LTS | 18.2.0 | 5.9.3      | 10.x   | ^10.0.2 |
| **React 19 upgrade**     | 18/20 LTS | 19     | 5.9.3      | 10.x   | ^10.0.2 |
| **TypeScript 6 upgrade** | 18/20 LTS | 18.2.0 | 6.x        | 10.x   | ^10.0.2 |
| **Mendix 11 upgrade**    | 18/20 LTS | 18.2.0 | 5.9.3      | 11.x   | ^11.0.0 |
| **Full upgrade**         | 20 LTS    | 19     | 6.x        | 11.x   | ^11.0.0 |

### Local Toolchain Note

- `npm run test:scripts` (vitest) requires **Node 20** — the same version CI pins. On
  newer local Node versions the vitest transform fails with `SyntaxError: Invalid or
  unexpected token` in all four script test files; the rest of the checks (`npm test`,
  `npm run lint`, `npx tsc --noEmit`) are unaffected.
- `pretty-format@29.7.0` is pinned as a direct devDependency: without it npm hoists
  the v27 copy from `@testing-library/dom@8` into the root slot, and jest 29 fails to
  print assertion diffs (`Unknown option "maxWidth"`), masking every failure.

---

## Architecture Impact Analysis

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full architecture documentation including dependency direction and layer responsibilities. The layered architecture ensures that upgrades are **surgical** — only specific layers are affected depending on what is being upgraded.

### Impact by Upgrade Type

#### 1. Mendix Version Upgrade (e.g., 10.x → 11.x)

**Affected files (3 files only):**

| File                                | Change Required                                                  |
| :---------------------------------- | :--------------------------------------------------------------- |
| `src/LoadingCanvas.xml`                      | Update widget manifest schema version if Mendix changes the spec |
| `src/package.xml`                            | Update package version if Mendix changes packaging format        |
| `src/infrastructure/mendix/mendixDataAdapter.ts` | Update `mx.data` API calls if Mendix changes the Data API        |

**Safe zones (zero changes needed):**

- ✅ All UI components (`src/presentation/components/`)
- ✅ All hooks (`src/presentation/hooks/`)
- ✅ All engines (`src/domain/engines/`)
- ✅ All domain rules (`src/domain/rules/`)
- ✅ All state management (`src/state/`)
- ✅ All constants (`src/core/constants/`)
- ✅ All types (`src/core/types/`)

#### 2. React Version Upgrade (e.g., 18 → 19)

**Affected files:**

| Layer         | Files                                       | Change Required                  |
| :------------ | :------------------------------------------ | :------------------------------- |
| UI Components | `src/presentation/components/*.tsx`         | JSX/React API changes            |
| Hooks         | `src/presentation/hooks/*.ts`               | React lifecycle/hook API changes |
| Container     | `src/presentation/widget/LoadingCanvas.container.tsx` | React component changes          |
| Widget Entry  | `src/LoadingCanvas.tsx`                     | React component changes          |

**Safe zones (zero changes needed):**

- ✅ All engines (`DragEngine`, `CollisionEngine`, `SnapEngine`) — pure TypeScript, no React; validation is done directly from the dispatcher via `domain/validationRules.ts` (no dedicated validation engine)
- ✅ All domain rules — pure functions, no React
- ✅ All state management — framework-agnostic
- ✅ All adapters — no React dependency
- ✅ All types, constants (`src/core/types/`, `src/core/constants/`)

#### 3. TypeScript Version Upgrade (e.g., 5.x → 6.x)

**Affected files:**

| File                              | Change Required                                             |
| :-------------------------------- | :---------------------------------------------------------- |
| `tsconfig.json`                   | Update compiler options if new strict checks are introduced |
| `src/core/types/mx.d.ts`          | Update Mendix type declarations if API changes              |
| `typings/LoadingCanvasProps.d.ts` | Regenerated from `LoadingCanvas.xml`                        |

**Safe zones (zero changes needed):**

- ✅ All source code — strict typing will catch breaking changes at compile-time
- ✅ All engines, domain rules, state management — pure TypeScript with explicit interfaces

---

## 4-Step Upgrade Process

### Step 1: Assess & Prepare

**Goal:** Understand the upgrade scope and establish a baseline.

1. **Check the Compatibility Matrix** above to confirm the target version combination is supported.
2. **Run baseline tests** to capture the current state:
   ```bash
   npm run test
   # Expected: all tests pass
   # Current test baseline: see docs/TEST_COVERAGE.md
   ```
3. **Run baseline build** to confirm the current state compiles:
   ```bash
   npm run build
   # Expected: build succeeds
   ```
4. **Run baseline lint**:
   ```bash
   npm run lint
   # Expected: no errors
   ```
5. **Create a backup branch**:
   ```bash
   git checkout -b upgrade/<component>-<version>
   ```
6. **Commit current state** (if not already committed):
   ```bash
   git add -A && git commit -m "chore: baseline before upgrade"
   ```

### Step 2: Update Dependencies

**Goal:** Update package versions and configuration files.

1. **Update `package.json`** — modify the relevant version fields:
   - For **Mendix upgrade**: update `@mendix/pluggable-widgets-tools`
   - For **React upgrade**: update `react`, `react-dom`, `@types/react`, `@types/react-dom` in `overrides` and `resolutions`
   - For **TypeScript upgrade**: update `typescript`
   - For **Node upgrade**: update `engines.node`

2. **Update `package-lock.json`**:

   ```bash
   npm install
   # or: npm install --legacy-peer-deps (for NPM v7.x.x)
   ```

3. **Update TypeScript config** (if upgrading TypeScript):
   - Review `tsconfig.json` for new strict options

4. **Update Mendix manifest** (if upgrading Mendix):
   - Review `src/LoadingCanvas.xml` for schema changes
   - Review `src/package.xml` for packaging changes

5. **Update Mendix adapter** (if upgrading Mendix):
   - Review `src/infrastructure/mendix/mendixDataAdapter.ts` for `mx.data` API changes
   - Update XPath queries in `findPackingPlan()` and `findPackingPlanItems()` if entity names change

### Step 3: Build & Test

**Goal:** Verify the upgrade doesn't break existing functionality.

1. **Run lint**:

   ```bash
   npm run lint
   # Fix any new lint errors introduced by the upgrade
   ```

2. **Run type check** (if available):

   ```bash
   npx tsc --noEmit
   # Fix any type errors
   ```

3. **Run unit tests**:

   ```bash
   npm run test
   # Expected: all tests pass
   # Coverage baseline and targets: see docs/TEST_COVERAGE.md
   ```

4. **Run build**:

   ```bash
   npm run build
   # Expected: build succeeds, widget bundle generated
   ```

5. **Fix any issues** found in steps 1–4. Re-run until all pass.

### Step 4: Deploy & Verify

**Goal:** Deploy the upgraded widget and verify it works in Mendix Studio Pro.

1. **Deploy the widget** to the Mendix test project:

   ```bash
   npm start
   # or: npm run build && copy dist/ to Mendix project
   ```

2. **Open the test project** in Mendix Studio Pro.

3. **Verify widget loads** on a page that uses LoadingCanvas:
   - Check that the canvas renders correctly
   - Check that truck boundary displays
   - Check that cargo items load from TransportOrders

4. **Test core interactions**:
   - Drag a cargo item onto the canvas
   - Rotate an item (90°)
   - Verify grid snapping works
   - Drag an item over another — it stays under the cursor (free placement)
   - Verify validation errors display correctly (canvas escape / load meters); click Verify to catch overlaps (BR-45)

5. **Test save/load plan**:
   - Click "Save Plan" — verify PackingPlan entity is created in Mendix
   - Refresh the page — verify saved plan loads correctly

6. **Run integration tests** (if available in the Mendix test project).

7. **Commit the upgrade**:

   ```bash
   git add -A
   git commit -m "chore: upgrade <component> to <version>"
   git push origin upgrade/<component>-<version>
   ```

8. **Create a pull request** and have it reviewed.

---

## Pre-Upgrade Checklist

- [ ] Compatibility Matrix confirms target version combination is supported
- [ ] Baseline tests pass — see docs/TEST_COVERAGE.md
- [ ] Baseline build succeeds
- [ ] Baseline lint passes
- [ ] Backup branch created
- [ ] Current state committed
- [ ] Mendix test project is accessible
- [ ] Mendix test project has sample data (TruckSelection, TransportOrders)
- [ ] Widget is deployed to test project before upgrade

---

## Post-Upgrade Verification

| Check                      | Expected Result     | How to Verify             |
| :------------------------- | :------------------ | :------------------------ |
| Unit tests                 | All tests pass      | `npm run test`            |
| Lint                       | No errors           | `npm run lint`           |
| Type check                 | No errors           | `npx tsc --noEmit`        |
| Build                      | Succeeds            | `npm run build`           |
| Widget loads in Studio Pro | Canvas renders      | Open test project page    |
| Drag & drop                | Works               | Drag cargo onto canvas    |
| Rotation                   | Works (90°)         | Click rotation handle     |
| Grid snap                  | Works               | Drag near grid line       |
| Free placement             | Overlap allowed     | Drag item over another    |
| Verify overlap gate        | Fails with OVERLAP  | Stack two items, Verify   |
| Validation                 | Displays errors     | Place item out of bounds  |
| Save plan                  | Creates PackingPlan | Click Save Plan, check DB |
| Load plan                  | Restores items      | Refresh page, check items |

---

## Rollback Procedure

If the upgrade causes issues, follow these steps to roll back:

1. **Revert the branch**:

   ```bash
   git checkout main
   # or: git reset --hard <baseline-commit-hash>
   ```

2. **Restore dependencies**:

   ```bash
   npm install
   # or: npm install --legacy-peer-deps
   ```

3. **Verify rollback**:

   ```bash
   npm run test
   npm run build
   ```

4. **Redeploy the previous widget** to the Mendix test project.

5. **Document the issue** in the upgrade branch's PR description or a separate issue.

---

## Troubleshooting

### Common Issues

#### 1. `mx is not defined` after Mendix upgrade

**Cause:** Mendix runtime API changed or widget not properly deployed.

**Fix:**

- Verify `src/infrastructure/mendix/mendixDataAdapter.ts` uses the correct `mx.data` API
- Check `isMendixRuntime()` detects the runtime correctly
- Redeploy the widget to the Mendix test project

#### 2. React component errors after React upgrade

**Cause:** React API changes (e.g., `createElement` vs JSX, lifecycle changes).

**Fix:**

- Check `src/presentation/components/` and `src/presentation/hooks/` for deprecated APIs
- Review React migration guide for breaking changes
- The core engines and domain rules are unaffected — only UI layer needs changes

#### 3. TypeScript compilation errors after TS upgrade

**Cause:** New strict checks or breaking type changes.

**Fix:**

- Run `npx tsc --noEmit` to see all errors
- Fix type errors in source code
- Update `tsconfig*.json` if new compiler options are needed
- The strict typing will catch issues at compile-time before runtime

#### 4. Widget doesn't appear in Studio Pro

**Cause:** Manifest or package definition is invalid.

**Fix:**

- Verify `src/LoadingCanvas.xml` schema version matches Mendix version
- Verify `src/package.xml` is valid
- Check Mendix Studio Pro logs for widget loading errors

#### 5. Tests fail after upgrade

**Cause:** Test environment or API changes.

**Fix:**

- Update test mocks if Mendix API changed
- Core engine and domain tests should be unaffected (pure TypeScript)

---

## Architecture Decision Records (ADRs)

See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full architecture documentation including key architectural decisions that make upgrades safe.
