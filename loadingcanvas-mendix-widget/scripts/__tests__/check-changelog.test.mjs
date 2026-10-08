import { describe, it, expect } from 'vitest';
import { validate } from '../check-changelog.mjs';

const VALID_ENTRY = `## [1.0.1] - 2026-09-15
### Fixed
- **CH-0042** fix: core: corrected Decimal fallback list
  - **why**: .clinerules listed stale Height/HeightMeters attributes
  - **files**: .clinerules
  - **commits**: abc1234
  - **rules**: BR-17
  - **fixes**: none
  - **debt**: resolved D-3
  - **verify**: npm run lint && npm test
  - **upgrade**: none
  - **breaking**: no`;

function makeEntry(overrides = {}) {
  const base = {
    why: 'test',
    files: '.clinerules',
    commits: 'abc1234',
    rules: 'BR-17',
    fixes: 'none',
    debt: 'resolved D-3',
    verify: 'npm run lint && npm test',
    upgrade: 'none',
    breaking: 'no',
  };
  return `## [1.0.1] - 2026-09-15
### Fixed
- **CH-0042** fix: core: test entry
  - **why**: ${overrides.why ?? base.why}
  - **files**: ${overrides.files ?? base.files}
  - **commits**: ${overrides.commits ?? base.commits}
  - **rules**: ${overrides.rules ?? base.rules}
  - **fixes**: ${overrides.fixes ?? base.fixes}
  - **debt**: ${overrides.debt ?? base.debt}
  - **verify**: ${overrides.verify ?? base.verify}
  - **upgrade**: ${overrides.upgrade ?? base.upgrade}
  - **breaking**: ${overrides.breaking ?? base.breaking}`;
}

describe('check-changelog', () => {
  it('passes valid entry with all required fields', () => {
    const result = validate(VALID_ENTRY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('fails on missing required field: why', () => {
    const entry = makeEntry({ why: '' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('why'))).toBe(true);
  });
  
  it('fails on missing required field: files', () => {
    const entry = makeEntry({ files: '' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('files'))).toBe(true);
  });
  
  it('fails on non-existent file in files', () => {
    const entry = makeEntry({ files: 'src/nonexistent.ts' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('File not found'))).toBe(true);
  });
  
  it('fails on unresolved B-#### reference', () => {
    const entry = makeEntry({ fixes: 'B-9999' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('B-9999'))).toBe(true);
  });
  
  it('fails on unresolved D-# reference', () => {
    const entry = makeEntry({ debt: 'created D-99' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('D-99'))).toBe(true);
  });
  
  it('fails on unresolved BR-## reference', () => {
    const entry = makeEntry({ rules: 'BR-99' });
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('BR-99'))).toBe(true);
  });
  
  it('fails on malformed ID format', () => {
    const entry = `## [1.0.1] - 2026-09-15
### Fixed
- **CH-42** fix: core: bad ID format
  - **why**: test
  - **files**: .clinerules
  - **commits**: abc1234
  - **rules**: BR-17
  - **fixes**: none
  - **debt**: resolved D-3
  - **verify**: npm run lint && npm test
  - **upgrade**: none
  - **breaking**: no`;
    const result = validate(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID format'))).toBe(true);
  });
});
