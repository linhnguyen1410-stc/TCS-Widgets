import { describe, it, expect, beforeEach } from 'vitest';
import { sync } from '../docs-sync.mjs';
import fs from 'fs';
import path from 'path';

describe('docs-sync', () => {
  const testDir = path.join(__dirname, 'fixtures', 'docs-sync');
  const archPath = path.join(testDir, 'ARCHITECTURE.md');
  const originalArch = fs.readFileSync(archPath, 'utf8');
  const FIXTURE_DOCS = ['ARCHITECTURE.md', 'UPGRADE_GUIDE.md', 'README.md', 'MENDIX_ENTITY.md', 'DOC_MAP.md', 'CHANGELOG.md'];

  // Hermetic: strip generated region content so every test starts from pristine markers
  function resetRegions() {
    for (const f of FIXTURE_DOCS) {
      const p = path.join(testDir, f);
      if (!fs.existsSync(p)) continue;
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/(<!-- DOCS_SYNC:[\w-]+:START -->)[\s\S]*?(<!-- DOCS_SYNC:[\w-]+:END -->)/g, '$1\n$2');
      fs.writeFileSync(p, c);
    }
  }

  beforeEach(() => {
    resetRegions();
  });

  it('generates layer-tree in ARCHITECTURE.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toContain('ARCHITECTURE.md');
    const content = fs.readFileSync(path.join(testDir, 'ARCHITECTURE.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:layer-tree');
  });

  it('generates version-matrix in UPGRADE_GUIDE.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toContain('UPGRADE_GUIDE.md');
    const content = fs.readFileSync(path.join(testDir, 'UPGRADE_GUIDE.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:version-matrix');
  });

  it('generates scripts-table in README.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toContain('README.md');
    const content = fs.readFileSync(path.join(testDir, 'README.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:scripts-table');
  });

  it('generates attribute tables in MENDIX_ENTITY.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toContain('MENDIX_ENTITY.md');
    const content = fs.readFileSync(path.join(testDir, 'MENDIX_ENTITY.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:packingplan-attributes');
    expect(content).toContain('DOCS_SYNC:packingplanitem-attributes');
  });

  it('generates register-index in DOC_MAP.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toContain('DOC_MAP.md');
    const content = fs.readFileSync(path.join(testDir, 'DOC_MAP.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:register-index');
  });

  it('generates trigger-matrix in DOC_MAP.md', async () => {
    const result = await sync({ dryRun: true, root: testDir });
    const content = fs.readFileSync(path.join(testDir, 'DOC_MAP.md'), 'utf8');
    expect(content).toContain('DOCS_SYNC:trigger-matrix');
  });

  it('generates recent-changes in CHANGELOG.md', async () => {
    const result = await sync({ root: testDir });
    expect(result.changedFiles).toContain('CHANGELOG.md');
    const content = fs.readFileSync(path.join(testDir, 'CHANGELOG.md'), 'utf8');
    // The region must list a real entry row, not just the marker: the old parser
    // regex matched neither entry format and silently rendered "No CH entries found."
    expect(content).toContain('| CH-0001');
  });

  it('idempotent: second run produces no changes', async () => {
    await sync({ root: testDir });
    const result = await sync({ dryRun: true, root: testDir });
    expect(result.changedFiles).toHaveLength(0);
  });

  it('fails on missing DOCS_SYNC marker', async () => {
    try {
      let content = originalArch
        .replace('<!-- DOCS_SYNC:layer-tree:START -->\n', '')
        .replace('<!-- DOCS_SYNC:layer-tree:END -->\n', '');
      fs.writeFileSync(archPath, content);
      await expect(sync({ root: testDir })).rejects.toThrow('Missing DOCS_SYNC markers');
    } finally {
      fs.writeFileSync(archPath, originalArch);
    }
  });

  it('fails on duplicate DOCS_SYNC marker', async () => {
    try {
      const content = originalArch.replace(
        '<!-- DOCS_SYNC:layer-tree:START -->',
        '<!-- DOCS_SYNC:layer-tree:START -->\n<!-- DOCS_SYNC:layer-tree:START -->'
      );
      fs.writeFileSync(archPath, content);
      await expect(sync({ root: testDir })).rejects.toThrow('Duplicate DOCS_SYNC markers');
    } finally {
      fs.writeFileSync(archPath, originalArch);
    }
  });
});
