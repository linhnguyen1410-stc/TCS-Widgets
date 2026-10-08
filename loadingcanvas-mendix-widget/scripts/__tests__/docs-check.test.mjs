import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { run, getChangedFiles, matchesGlob, getRequiredDocs } from '../docs-check.mjs';

describe('docs-check run()', () => {
  it('captures stdout on success (regression: out was always empty)', () => {
    const res = run('echo hello');
    expect(res.ok).toBe(true);
    expect(res.out.trim()).toBe('hello');
  });

  it('captures stderr on failure (check scripts report via console.error)', () => {
    const res = run('node -e "console.error(\'boom\'); process.exit(1)"');
    expect(res.ok).toBe(false);
    expect(res.out).toContain('boom');
  });
});

describe('docs-check getChangedFiles()', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-check-'));

  beforeAll(() => {
    execSync('git init -q', { cwd: tmp });
    execSync('git config user.email test@test', { cwd: tmp });
    execSync('git config user.name test', { cwd: tmp });
    writeFileSync(join(tmp, 'a.txt'), 'one');
    execSync('git add a.txt', { cwd: tmp });
    execSync('git commit -qm init', { cwd: tmp });
    writeFileSync(join(tmp, 'a.txt'), 'two');
    writeFileSync(join(tmp, 'b.txt'), 'new');
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('reports modified and untracked files (regression: was always [])', () => {
    const files = getChangedFiles(tmp);
    expect(files).toContain('a.txt');
    expect(files).toContain('b.txt');
  });

  it('rejects an all-zero SHA instead of running an invalid git diff', () => {
    const previousBase = process.env.DOCS_BASE_SHA;
    const previousHead = process.env.DOCS_HEAD_SHA;
    process.env.DOCS_BASE_SHA = '0'.repeat(40);
    process.env.DOCS_HEAD_SHA = '1'.repeat(40);
    try {
      expect(() => getChangedFiles(tmp)).toThrow('must not be the all-zero Git SHA');
    } finally {
      if (previousBase === undefined) delete process.env.DOCS_BASE_SHA;
      else process.env.DOCS_BASE_SHA = previousBase;
      if (previousHead === undefined) delete process.env.DOCS_HEAD_SHA;
      else process.env.DOCS_HEAD_SHA = previousHead;
    }
  });

  it('uses an explicit commit range when DOCS_BASE_SHA and DOCS_HEAD_SHA are set', () => {
    const base = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8' }).trim();
    writeFileSync(join(tmp, 'c.txt'), 'committed change');
    execSync('git add c.txt && git commit -qm third', { cwd: tmp });
    const head = execSync('git rev-parse HEAD', { cwd: tmp, encoding: 'utf8' }).trim();
    const previousBase = process.env.DOCS_BASE_SHA;
    const previousHead = process.env.DOCS_HEAD_SHA;
    process.env.DOCS_BASE_SHA = base;
    process.env.DOCS_HEAD_SHA = head;
    try {
      expect(getChangedFiles(tmp)).toEqual(['c.txt']);
    } finally {
      if (previousBase === undefined) delete process.env.DOCS_BASE_SHA;
      else process.env.DOCS_BASE_SHA = previousBase;
      if (previousHead === undefined) delete process.env.DOCS_HEAD_SHA;
      else process.env.DOCS_HEAD_SHA = previousHead;
    }
  });

  it('returns an empty list for a clean tree', () => {
    execSync('git add b.txt', { cwd: tmp });
    execSync('git commit -qm second', { cwd: tmp });
    const files = getChangedFiles(tmp);
    expect(files).toEqual([]);
  });
});

describe('docs-check trigger matching', () => {
  it('matches test files directly under __tests__', () => {
    expect(matchesGlob('src/domain/__tests__/foo.test.ts', 'src/**/__tests__/*.ts')).toBe(true);
  });

  it('matches nested test files under __tests__', () => {
    expect(matchesGlob('src/domain/__tests__/contracts/foo.test.ts', 'src/**/__tests__/**/*.ts')).toBe(true);
  });

  it('requires CHANGELOG for script changes', () => {
    expect(getRequiredDocs(['scripts/docs-check.mjs'])).toContain('CHANGELOG.md');
  });

  it('requires TEST_COVERAGE for direct and nested test changes', () => {
    const required = getRequiredDocs([
      'src/domain/__tests__/foo.test.ts',
      'src/domain/__tests__/contracts/foo.test.ts',
    ]);
    expect(required).toContain('docs/TEST_COVERAGE.md');
  });

  it('does not infer change type from the previous commit', () => {
    const required = getRequiredDocs(['src/domain/foo.ts']);
    expect(required).not.toContain('BUGLOG.md');
  });

  it('applies conditional docs only for an explicit change type', () => {
    expect(getRequiredDocs(['src/domain/foo.ts'], 'fix')).toEqual(
      expect.arrayContaining(['BUGLOG.md', 'CHANGELOG.md'])
    );
    expect(getRequiredDocs(['src/domain/foo.ts'], 'feat')).toContain('CHANGELOG.md');
    expect(getRequiredDocs(['src/domain/foo.ts'], 'debt')).toEqual(
      expect.arrayContaining(['DEBT.md', 'CHANGELOG.md'])
    );
  });
});
