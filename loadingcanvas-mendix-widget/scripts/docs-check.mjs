#!/usr/bin/env node
// docs-check.mjs — Enforce documentation consistency.
// Run via: npm run docs:check
// CI may set DOCS_BASE_SHA and DOCS_HEAD_SHA to validate a committed diff.

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { rules, CATCH_ALL } from './docs-rules.mjs';

const ROOT = process.cwd();
const ZERO_SHA = /^0{40}$/;

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts });
    return { ok: true, out: out ?? '' };
  } catch (e) {
    return { ok: false, out: [e.stdout?.toString(), e.stderr?.toString()].filter(Boolean).join('\n') || e.message };
  }
}

function getChangedFiles(root = ROOT) {
  const baseSha = process.env.DOCS_BASE_SHA?.trim();
  const headSha = process.env.DOCS_HEAD_SHA?.trim();
  if (baseSha && headSha) {
    if (ZERO_SHA.test(baseSha) || ZERO_SHA.test(headSha)) {
      throw new Error('DOCS_BASE_SHA/DOCS_HEAD_SHA must not be the all-zero Git SHA');
    }
    const res = run('git diff --name-only ' + baseSha + ' ' + headSha, { cwd: root });
    if (!res.ok) {
      throw new Error('Unable to inspect committed diff ' + baseSha + '...' + headSha + ': ' + res.out);
    }
    return res.out.trim().split('\n').filter(Boolean);
  }

  const res = run('git diff --name-only HEAD', { cwd: root });
  const staged = run('git diff --name-only --cached', { cwd: root });
  const files = new Set([
    ...(res.ok ? res.out.trim().split('\n').filter(Boolean) : []),
    ...(staged.ok ? staged.out.trim().split('\n').filter(Boolean) : []),
  ]);
  const untracked = run('git ls-files --others --exclude-standard', { cwd: root });
  if (untracked.ok) {
    for (const f of untracked.out.trim().split('\n').filter(Boolean)) {
      files.add(f);
    }
  }
  return Array.from(files);
}

function matchesGlob(file, glob) {
  const regex = '^' + glob
    .replace(/\*\*/g, 'GLOBSTAR')
    .replace(/\*/g, '[^/]*')
    .replace(/GLOBSTAR/g, '.*')
    + '$';
  return new RegExp(regex).test(file);
}

function getChangeType() {
  return process.env.DOCS_CHANGE_TYPE?.trim().toLowerCase() || '';
}

function getRequiredDocs(changedFiles, changeType = getChangeType()) {
  const required = new Set();
  for (const file of changedFiles) {
    for (const rule of rules) {
      if (matchesGlob(file, rule.glob)) {
        if (rule.condition && (!changeType || !new RegExp(`^(?:${rule.condition})$`).test(changeType))) {
          continue;
        }
        for (const doc of rule.docs) required.add(doc);
      }
    }
    if (matchesGlob(file, CATCH_ALL.glob)) {
      required.add(CATCH_ALL.docs[0]);
    }
  }
  return Array.from(required);
}

function checkDocLinks() {
  console.log('[docs-check] Checking doc links...');
  const res = run('node scripts/check-doc-links.mjs');
  if (!res.ok) {
    console.error(res.out);
    return false;
  }
  console.log('[docs-check] Doc links OK');
  return true;
}

function checkImports() {
  console.log('[docs-check] Checking import bans...');
  const res = run('node scripts/check-imports.mjs');
  if (!res.ok) {
    console.error(res.out);
    return false;
  }
  console.log('[docs-check] Import bans OK');
  return true;
}

function checkRequiredDocs(changedFiles, requiredDocs) {
  console.log('[docs-check] Checking required documentation updates...');
  const missing = [];
  for (const doc of requiredDocs) {
    if (!changedFiles.includes(doc)) {
      const res = run(`git diff --name-only HEAD -- ${doc}`);
      const staged = run(`git diff --name-only --cached -- ${doc}`);
      const modified = (res.ok && res.out.trim()) || (staged.ok && staged.out.trim());
      if (!modified) {
        missing.push(doc);
      }
    }
  }
  if (missing.length > 0) {
    console.error('[docs-check] Missing required documentation updates:');
    for (const m of missing) console.error(`  - ${m}`);
    console.error('\nThese documents must be updated in the same change based on docs-rules.mjs');
    return false;
  }
  console.log('[docs-check] Required documentation updates present');
  return true;
}

function checkChangelogEntry(changedFiles) {
  console.log('[docs-check] Checking CHANGELOG.md entry...');
  const srcChanges = changedFiles.filter(f => f.startsWith('src/'));
  if (srcChanges.length === 0) {
    console.log('[docs-check] No source changes, skipping CHANGELOG check');
    return true;
  }
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    console.error('[docs-check] CHANGELOG.md does not exist');
    return false;
  }
  const content = readFileSync(changelogPath, 'utf8');
  if (!content.includes('## [Unreleased]')) {
    console.error('[docs-check] CHANGELOG.md missing "## [Unreleased]" section');
    return false;
  }
  const unreleasedIdx = content.indexOf('## [Unreleased]');
  const nextSectionIdx = content.indexOf('## [', unreleasedIdx + 1);
  const unreleasedContent = nextSectionIdx > 0
    ? content.slice(unreleasedIdx, nextSectionIdx)
    : content.slice(unreleasedIdx);
  if (!unreleasedContent.includes('### CH-')) {
    console.error('[docs-check] CHANGELOG.md [Unreleased] section has no CH- entries');
    return false;
  }
  console.log('[docs-check] CHANGELOG.md entry present');
  return true;
}

function main() {
  console.log('[docs-check] Starting documentation consistency checks...\n');

  const changedFiles = getChangedFiles();
  console.log(`[docs-check] Changed files: ${changedFiles.length}`);
  for (const f of changedFiles) console.log(`  - ${f}`);
  console.log('');

  const baseSha = process.env.DOCS_BASE_SHA?.trim();
  const headSha = process.env.DOCS_HEAD_SHA?.trim();
  if (baseSha && headSha) console.log('[docs-check] Commit range: ' + baseSha + '...' + headSha);

  const changeType = getChangeType();
  if (changeType) console.log(`[docs-check] Change type: ${changeType}`);

  const requiredDocs = getRequiredDocs(changedFiles, changeType);
  console.log(`[docs-check] Required docs: ${requiredDocs.join(', ') || 'none'}\n`);

  let allOk = true;
  allOk = checkDocLinks() && allOk;
  allOk = checkImports() && allOk;
  allOk = checkRequiredDocs(changedFiles, requiredDocs) && allOk;
  allOk = checkChangelogEntry(changedFiles) && allOk;

  console.log('');
  if (allOk) {
    console.log('[docs-check] All checks passed!');
    process.exit(0);
  } else {
    console.error('[docs-check] FAILED');
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}

export { run, getChangedFiles, matchesGlob, getChangeType, getRequiredDocs };
