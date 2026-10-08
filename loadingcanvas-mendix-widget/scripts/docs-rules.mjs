#!/usr/bin/env node
// docs-rules.mjs — Single Source of Truth trigger matrix.
// Maps source globs → required documentation files that MUST be updated in the same change.
// Used by docs-check.mjs.

const rules = [
  // Core layer changes → ARCHITECTURE.md layer tree + TEST_COVERAGE.md
  { glob: "src/core/**/*.ts", docs: ["ARCHITECTURE.md", "docs/TEST_COVERAGE.md"] },

  // Domain layer changes → ARCHITECTURE.md + BUSINESS_RULES.md + TEST_COVERAGE.md
  { glob: "src/domain/**/*.ts", docs: ["ARCHITECTURE.md", "BUSINESS_RULES.md", "docs/TEST_COVERAGE.md"] },

  // State layer changes → ARCHITECTURE.md + TEST_COVERAGE.md
  { glob: "src/state/**/*.ts", docs: ["ARCHITECTURE.md", "docs/TEST_COVERAGE.md"] },

  // Infrastructure layer changes → ARCHITECTURE.md + docs/MENDIX_ENTITY.md + TEST_COVERAGE.md
  { glob: "src/infrastructure/**/*.ts", docs: ["ARCHITECTURE.md", "docs/MENDIX_ENTITY.md", "docs/TEST_COVERAGE.md"] },

  // Presentation layer changes → ARCHITECTURE.md + README.md (if UI) + TEST_COVERAGE.md
  { glob: "src/presentation/**/*.tsx", docs: ["ARCHITECTURE.md", "README.md", "docs/TEST_COVERAGE.md"] },
  { glob: "src/presentation/**/*.ts", docs: ["ARCHITECTURE.md", "README.md", "docs/TEST_COVERAGE.md"] },

  // Widget manifest / package.xml → docs/UPGRADE_GUIDE.md + docs/MENDIX_ENTITY.md
  { glob: "src/LoadingCanvas.xml", docs: ["docs/UPGRADE_GUIDE.md", "docs/MENDIX_ENTITY.md"] },
  { glob: "src/package.xml", docs: ["docs/UPGRADE_GUIDE.md", "docs/MENDIX_ENTITY.md"] },

  // mendixSchema.ts (authoritative attribute/association names) → docs/MENDIX_ENTITY.md
  { glob: "src/infrastructure/mendix/mendixSchema.ts", docs: ["docs/MENDIX_ENTITY.md"] },

  // package.json (scripts, deps, versions) → README.md + docs/UPGRADE_GUIDE.md + ARCHITECTURE.md
  { glob: "package.json", docs: ["README.md", "docs/UPGRADE_GUIDE.md", "ARCHITECTURE.md"] },

  // Theme / CSS changes → design-mockups/README.md (adoption status)
  { glob: "src/presentation/widget/LoadingCanvas.css", docs: ["design-mockups/README.md"] },
  { glob: "src/core/constants/theme.ts", docs: ["design-mockups/README.md"] },

  // Business rules implementation → BUSINESS_RULES.md
  { glob: "src/domain/rules/**/*.ts", docs: ["BUSINESS_RULES.md"] },

  // Test changes → docs/TEST_COVERAGE.md
  { glob: "src/**/__tests__/*.ts", docs: ["docs/TEST_COVERAGE.md"] },
  { glob: "src/**/__tests__/**/*.ts", docs: ["docs/TEST_COVERAGE.md"] },
  { glob: "src/**/__tests__/*.tsx", docs: ["docs/TEST_COVERAGE.md"] },
  { glob: "src/**/__tests__/**/*.tsx", docs: ["docs/TEST_COVERAGE.md"] },

  // Bug fixes → BUGLOG.md + CHANGELOG.md when DOCS_CHANGE_TYPE=fix
  { glob: "src/**/*.ts", docs: ["BUGLOG.md", "CHANGELOG.md"], condition: "fix" },
  { glob: "src/**/*.tsx", docs: ["BUGLOG.md", "CHANGELOG.md"], condition: "fix" },

  // Debt changes → DEBT.md + CHANGELOG.md when DOCS_CHANGE_TYPE=debt
  { glob: "src/**/*.ts", docs: ["DEBT.md", "CHANGELOG.md"], condition: "debt" },
  { glob: "src/**/*.tsx", docs: ["DEBT.md", "CHANGELOG.md"], condition: "debt" },

  // New features / refactors → CHANGELOG.md when DOCS_CHANGE_TYPE=feat|refactor
  { glob: "src/**/*.ts", docs: ["CHANGELOG.md"], condition: "feat|refactor" },
  { glob: "src/**/*.tsx", docs: ["CHANGELOG.md"], condition: "feat|refactor" },

  // Script changes → CHANGELOG.md
  { glob: "scripts/**/*.mjs", docs: ["CHANGELOG.md"] },

  // Documentation changes → DOC_MAP.md
  { glob: "*.md", docs: ["docs/DOC_MAP.md"] },
  { glob: "docs/**/*.md", docs: ["docs/DOC_MAP.md"] },
];

// Catch-all: ANY src/** change requires a CHANGELOG.md entry (or explicit opt-out)
const CATCH_ALL = {
  glob: "src/**/*",
  docs: ["CHANGELOG.md"],
  description: "Every source change must include a CHANGELOG.md entry or explicit 'docs: none (<reason>)'",
};

export { rules, CATCH_ALL };
