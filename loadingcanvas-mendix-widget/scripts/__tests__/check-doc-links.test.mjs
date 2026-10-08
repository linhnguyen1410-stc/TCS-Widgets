import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkDocLinks } from '../check-doc-links.mjs';
import fs from 'fs';
import path from 'path';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'doc-links');

describe('check-doc-links', () => {
  it('passes when all backticked paths exist', async () => {
    const testDir = path.join(FIXTURE_DIR, 'passing');
    const result = await checkDocLinks(testDir);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails on missing backticked path', async () => {
    const missingDir = path.join(FIXTURE_DIR, 'missing-backtick');
    const result = await checkDocLinks(missingDir);
    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.includes('src/nonexistent.ts'))).toBe(true);
  });

  it('fails on template/ anchor', async () => {
    const templateDir = path.join(FIXTURE_DIR, 'template-anchor');
    const result = await checkDocLinks(templateDir);
    expect(result.passed).toBe(false);
    expect(result.errors.some(e => e.includes('template/'))).toBe(true);
  });

  it('resolves markdown links file-relative', async () => {
    const markdownDir = path.join(FIXTURE_DIR, 'markdown-links');
    const result = await checkDocLinks(markdownDir);
    expect(result.passed).toBe(true);
  });

  it('fails on missing markdown link target', async () => {
    const missingDir = path.join(FIXTURE_DIR, 'missing-markdown');
    const result = await checkDocLinks(missingDir);
    expect(result.passed).toBe(false);
  });

  it('idempotent: second run same result', async () => {
    const testDir = path.join(FIXTURE_DIR, 'passing');
    const r1 = await checkDocLinks(testDir);
    const r2 = await checkDocLinks(testDir);
    expect(r1.passed).toBe(r2.passed);
    expect(r1.errors).toEqual(r2.errors);
  });
});