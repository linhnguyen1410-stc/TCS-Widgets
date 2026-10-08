#!/usr/bin/env node
// docs-sync.mjs — Refresh generated documentation regions from source of truth.
// Writes marker-delimited regions so they can't rot.
// Run via: npm run docs:sync
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { pathToFileURL } from 'url';
import { rules as triggerRules, CATCH_ALL } from './docs-rules.mjs';

const REGION_FILES = {
  'ARCHITECTURE.md': ['layer-tree', 'layer-map', 'test-locations'],
  'docs/UPGRADE_GUIDE.md': ['version-matrix', 'test-count'],
  'README.md': ['scripts-table'],
  'docs/MENDIX_ENTITY.md': ['packingplan-attributes', 'packingplanitem-attributes'],
  'docs/DOC_MAP.md': ['register-index', 'trigger-matrix'],
  'CHANGELOG.md': ['recent-changes'],
  'docs/TEST_COVERAGE.md': ['coverage-tables'],
};

const markerStart = (name) => `<!-- DOCS_SYNC:${name}:START -->`;
const markerEnd = (name) => `<!-- DOCS_SYNC:${name}:END -->`;
const LAYERS = ['core', 'domain', 'state', 'infrastructure', 'presentation'];

function validateMarkers(root) {
  const missing = [];
  const duplicate = [];
  for (const [file, regions] of Object.entries(REGION_FILES)) {
    let p = join(root, file);
    if (!existsSync(p)) {
      const alt = join(root, basename(file));
      if (existsSync(alt)) p = alt;
    }
    if (!existsSync(p)) continue;
    const content = readFileSync(p, 'utf8');
    for (const region of regions) {
      // Count only real markers (own line); DOC_MAP documents markers as inline code
      const isRealMarker = (s) => s.trim().startsWith('<!-- DOCS_SYNC:');
      const starts = content.split('\n').filter((l) => l.includes(markerStart(region)) && isRealMarker(l)).length;
      const ends = content.split('\n').filter((l) => l.includes(markerEnd(region)) && isRealMarker(l)).length;
      if (starts === 0 || ends === 0) missing.push(`${file} (${region})`);
      else if (starts > 1) duplicate.push(`${file} (${region})`);
      else if (ends !== starts) missing.push(`${file} (${region} END)`);
    }
  }
  if (missing.length > 0) throw new Error(`Missing DOCS_SYNC markers: ${missing.join(', ')}`);
  if (duplicate.length > 0) throw new Error(`Duplicate DOCS_SYNC markers: ${duplicate.join(', ')}`);
}

// Real markers sit on their own line; DOC_MAP documents markers as inline code
function findRealMarker(content, marker, from = 0) {
  let idx = from;
  while ((idx = content.indexOf(marker, idx)) !== -1) {
    const lineStart = content.lastIndexOf('\n', idx) + 1;
    if (content.slice(lineStart, idx).trim() === '') return idx;
    idx += marker.length;
  }
  return -1;
}

function replaceRegionContent(content, region, newContent) {
  const start = markerStart(region);
  const end = markerEnd(region);
  const i = findRealMarker(content, start);
  const j = findRealMarker(content, end, i + start.length);
  if (i === -1 || j === -1 || j < i) return content;
  return content.slice(0, i + start.length) + '\n' + newContent + '\n' + content.slice(j);
}

const GENERATORS = {
  'layer-tree': (root) => {
    const src = join(root, 'src');
    if (!existsSync(src)) return '> (no `src/` tree found)';
    const treeLines = [];
    for (const layer of LAYERS) {
      const layerPath = join(src, layer);
      if (!existsSync(layerPath)) continue;
      treeLines.push(`\n### ${layer}/`);
      walkTree(layerPath, '', treeLines);
    }
    return treeLines.join('\n').replace(/^\n/, '');
  },
  'layer-map': (root) => {
    const lines = [];
    for (const layer of LAYERS) {
      const p = join(root, 'src', layer);
      lines.push(`- **${layer}** → \`src/${layer}/\`${existsSync(p) ? '' : ' (missing)'}`);
    }
    return lines.join('\n');
  },
  'test-locations': (root) => {
    const src = join(root, 'src');
    if (!existsSync(src)) return '> (no test locations found)';
    const locs = [];
    collectTestLocations(src, '', locs);
    return locs.length > 0 ? locs.join('\n') : '> (no test locations found)';
  },
  'version-matrix': (root) => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const keyDeps = [
      'react', 'react-dom', 'typescript', '@mendix/pluggable-widgets-tools',
      'eslint', 'jest', 'vitest', 'prettier', 'rollup',
    ];
    const lines = keyDeps.map((d) => `| ${d} | ${deps[d] || '—'} |`);
    lines.push(`| widget version | ${pkg.version || '—'} |`);
    if (pkg.engines?.node) lines.push(`| node | ${pkg.engines.node} |`);
    return lines.join('\n');
  },
  'test-count': () => '> Run `npm test` — the count is reported by the test runner; this region is a pointer, not a copy.',
  'scripts-table': (root) => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const lines = ['| Script | Command |', '|--------|---------|'];
    for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
      lines.push(`| \`${name}\` | \`${cmd}\` |`);
    }
    return lines.join('\n');
  },
  'packingplan-attributes': (root) => attributesTable(root, 'PACKING_PLAN_ATTRIBUTES', 'PackingPlan'),
  'packingplanitem-attributes': (root) => attributesTable(root, 'PACKING_PLAN_ITEM_ATTRIBUTES', 'PackingPlanItem'),
};

function attributesTable(root, constant, label) {
  const schemaPath = join(root, 'src', 'infrastructure', 'mendix', 'mendixSchema.ts');
  if (!existsSync(schemaPath)) {
    return `> Source \`src/infrastructure/mendix/mendixSchema.ts\` not found; ${label} attribute table skipped.`;
  }
  const obj = extractObject(readFileSync(schemaPath, 'utf8'), constant);
  const lines = ['| Attribute | Mendix Name |', '|-----------|-------------|'];
  if (obj) for (const [k, v] of Object.entries(obj)) lines.push(`| ${k} | ${v} |`);
  else lines.push(`| — | (constant \`${constant}\` not found) |`);
  return lines.join('\n');
}

function walkTree(dir, prefix, out) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) {
      out.push(`${prefix}├── ${entry.name}/`);
      walkTree(join(dir, entry.name), `${prefix}│   `, out);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(`${prefix}├── ${entry.name}`);
    }
  }
}

function collectTestLocations(dir, prefix, out) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        if (entry.name === '__tests__') out.push(`- \`${full.replace(/.*src[\\/]/, 'src/').split('\\').join('/')}\``);
        continue;
      }
      collectTestLocations(full, `${prefix}${entry.name}/`, out);
    }
  }
}

const GENERATORS_MORE = {
  'register-index': (root) => {
    const lines = ['| Register | IDs |', '|----------|-----|'];
    const ids = (file, re) => (existsSync(file) ? [...readFileSync(file, 'utf8').matchAll(re)].map((m) => m[1]) : []);
    const bugs = ids(join(root, 'BUGLOG.md'), /^### (B-\d{4})/gm);
    const debts = ids(join(root, 'DEBT.md'), /^\| (D-\d+) /gm);
    const adrDir = join(root, 'docs', 'adr');
    const adrs = existsSync(adrDir) ? readdirSync(adrDir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')) : [];
    const chs = ids(join(root, 'CHANGELOG.md'), /^#{3,4}\s(?:-\s\*\*)?(CH-\d{4})/gm);
    lines.push(`| BUGLOG | ${bugs.length ? bugs.join(', ') : '—'} |`);
    lines.push(`| DEBT | ${debts.length ? debts.join(', ') : '—'} |`);
    lines.push(`| ADR | ${adrs.length ? adrs.join(', ') : '—'} |`);
    lines.push(`| CHANGELOG | ${chs.length} entries (${chs[0] ?? '—'} … ${chs[chs.length - 1] ?? '—'}) |`);
    return lines.join('\n');
  },
  'trigger-matrix': () => {
    const lines = ['| Changed path (glob) | Required docs |', '|----------------------|---------------|'];
    for (const rule of triggerRules) {
      lines.push(`| \`${rule.glob}\` | ${rule.docs.map((d) => `\`${d}\``).join(', ')} |`);
    }
    lines.push(`| \`${CATCH_ALL.glob}\` | ${CATCH_ALL.docs.map((d) => `\`${d}\``).join(', ')} |`);
    return lines.join('\n');
  },
  'recent-changes': (root) => {
    const clPath = join(root, 'CHANGELOG.md');
    if (!existsSync(clPath)) return '> CHANGELOG.md not found.';
    const entries = parseChangelogEntries(readFileSync(clPath, 'utf8'));
    if (entries.length === 0) return '> No CH entries found.';
    const lines = ['| Date | ID | Type | Layer | Title |', '|------|-----|------|-------|-------|'];
    for (const e of entries.slice(-10).reverse()) {
      lines.push(`| ${e.date ?? '—'} | ${e.id} | ${e.type ?? '—'} | ${e.layer ?? '—'} | ${e.title ?? '—'} |`);
    }
    return lines.join('\n');
  },
  'coverage-tables': (root) => {
    const coveragePath = join(root, 'dist', 'coverage', 'coverage-final.json');
    if (!existsSync(coveragePath)) {
      return '> Run `npm run test:coverage` to regenerate coverage tables from a fresh artifact.';
    }
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'));
    const layers = {};
    for (const layer of LAYERS) layers[layer] = { c: 0, t: 0 };
    for (const file in coverage) {
      const rel = file.replace(/.*src[\\/]/, '').split('\\').join('/');
      const layer = rel.split('/')[0];
      if (!(layer in layers)) continue;
      const v = coverage[file];
      const statements = Object.values(v.s);
      layers[layer].c += statements.filter((x) => x > 0).length;
      layers[layer].t += statements.length;
    }
    const lines = ['| Layer | Statements Covered | Total | % |', '|-------|-------------------|-------|---|'];
    for (const layer of LAYERS) {
      const { c, t } = layers[layer];
      const pct = t > 0 ? ((c / t) * 100).toFixed(2) : 'N/A';
      lines.push(`| ${layer} | ${c} | ${t} | ${pct}% |`);
    }
    const untested = [];
    for (const file in coverage) {
      const v = coverage[file];
      const statements = Object.values(v.s);
      if (statements.length > 0 && statements.every((x) => x === 0)) {
        untested.push(`- \`${file.replace(/.*src[\\/]/, 'src/').split('\\').join('/')}\``);
      }
    }
    lines.push('', '## Untested Files', untested.length > 0 ? untested.join('\n') : '_All tracked files have some coverage_');
    return lines.join('\n');
  },
};

// Entry headers: `#### CH-0001 · type · layer · Title` (repo format) or `- **CH-0001** …` (compact format).
// Must accept BOTH formats — keep in sync with ENTRY_HEADER in check-changelog.mjs;
// an earlier version matched neither and always rendered "No CH entries found."
const ENTRY_HEADER = /^(?:#{3,4}\s|-\s\*\*)(CH-[^\s·*]+)(?:\*\*)?\s*/;

function parseChangelogEntries(content) {
  const entries = [];
  let sectionDate = null;
  let current = null;
  for (const line of content.split(/\r?\n/)) {
    const sec = line.match(/^##\s+\[[^\]]+\]\s*[—-]\s*(\d{4}-\d{2}-\d{2})/);
    if (sec) {
      sectionDate = sec[1];
      current = null;
      continue;
    }
    const head = line.match(ENTRY_HEADER);
    if (head) {
      const id = head[1];
      const parts = line.includes('·') ? line.split('·').map((p) => p.trim()) : [];
      current = { id, date: sectionDate };
      if (parts.length >= 4) {
        current.type = parts[1];
        current.layer = parts[2];
        current.title = parts[3];
      }
      entries.push(current);
      continue;
    }
    if (current) {
      const field = line.match(/^\s*-\s*\*{0,2}(\w+)\*{0,2}:\s*(.+)$/);
      // An explicit `- date:` bullet wins over the section fallback; all other
      // fields keep first-wins so a section header cannot clobber entry data.
      if (field && (field[1] === 'date' || !(field[1] in current))) current[field[1]] = field[2].trim();
    }
  }
  return entries;
}

Object.assign(GENERATORS, GENERATORS_MORE);

function extractObject(source, name) {
  const re = new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\}\\s*(?:as const)?;`);
  const match = source.match(re);
  if (!match) return null;
  const obj = {};
  const propRe = /(\w+):\s*"([^"]+)"/g;
  let m;
  while ((m = propRe.exec(match[1])) !== null) {
    obj[m[1]] = m[2];
  }
  return obj;
}

export async function sync({ dryRun = false, root: rootOption } = {}) {
  const root = rootOption ?? process.cwd();
  validateMarkers(root);
  const changedFiles = [];
  for (const [file, regions] of Object.entries(REGION_FILES)) {
    let p = join(root, file);
    // Flat fixture roots (test support): fall back to the bare filename
    if (!existsSync(p)) {
      const alt = join(root, basename(file));
      if (existsSync(alt)) p = alt;
    }
    if (!existsSync(p)) continue;
    const before = readFileSync(p, 'utf8');
    let content = before;
    for (const region of regions) {
      content = replaceRegionContent(content, region, GENERATORS[region](root));
    }
    if (content !== before) {
      changedFiles.push(basename(file));
      if (!dryRun) writeFileSync(p, content, 'utf8');
    }
  }
  return { changedFiles };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  sync()
    .then(({ changedFiles }) => {
      console.log(changedFiles.length > 0 ? `[docs-sync] Updated: ${changedFiles.join(', ')}` : '[docs-sync] Up to date');
    })
    .catch((err) => {
      console.error(`[docs-sync] ${err.message}`);
      process.exit(1);
    });
}
