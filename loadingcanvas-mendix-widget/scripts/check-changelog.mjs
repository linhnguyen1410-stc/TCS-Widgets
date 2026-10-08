#!/usr/bin/env node
/**
 * CHANGELOG.md validator — ensures entries are complete, consistent, and IDs resolve.
 * Run: node scripts/check-changelog.mjs
 *
 * Accepts two entry formats:
 *   Repo:   `#### CH-0001 · feat · infrastructure · Title` with `- field: value` bullets
 *   Compact: `- **CH-0001** fix: core: Title` with `- **field**: value` bullets
 *
 * In content mode (validate(str)) validation is strict: missing files or unknown
 * register IDs are errors. In disk mode (validate()) missing files are warnings —
 * history may reference paths that were renamed later; register IDs must still resolve.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = path.resolve('./');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const BUGLOG = path.join(ROOT, 'BUGLOG.md');
const DEBT = path.join(ROOT, 'DEBT.md');
const ADR_DIR = path.join(ROOT, 'docs/adr');
const BUSINESS_RULES = path.join(ROOT, 'BUSINESS_RULES.md');

const REQUIRED_FIELDS = [
  'id', 'date', 'type', 'layer', 'title', 'why', 'files', 'commits',
  'rules', 'fixes', 'debt', 'verify', 'upgrade', 'breaking', 'supersedes', 'note',
];
const OPTIONAL_FIELDS = ['upgrade', 'supersedes', 'note'];
const VALID_TYPES = ['feat', 'fix', 'refactor', 'remove', 'docs', 'build'];
const VALID_LAYERS = ['core', 'domain', 'state', 'infrastructure', 'presentation', 'build', 'docs'];

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractIds(content, pattern) {
  // new RegExp(regexpObj, flags) drops the original flags — preserve them
  const re = pattern instanceof RegExp
    ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    : new RegExp(pattern, 'g');
  const matches = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    matches.push(m[1]);
  }
  return [...new Set(matches)];
}

// `#### CH-0001 · …` or `- **CH-0001** …`; id may be malformed and is reported
const ENTRY_HEADER = /^(?:#{3,4}\s|-\s\*\*)(CH-[^\s·*]+)(?:\*\*)?\s*/;

export function validate(clContent = null) {
  const strict = clContent !== null;
  const errors = [];
  const warnings = [];

  const cl = clContent ?? (fs.existsSync(CHANGELOG) ? readFile(CHANGELOG) : '');
  const buglog = fs.existsSync(BUGLOG) ? readFile(BUGLOG) : '';
  const debt = fs.existsSync(DEBT) ? readFile(DEBT) : '';
  const rulesDoc = fs.existsSync(BUSINESS_RULES) ? readFile(BUSINESS_RULES) : '';
  const adrFiles = fs.existsSync(ADR_DIR) ? fs.readdirSync(ADR_DIR).filter((f) => f.endsWith('.md')) : [];
  const adrContent = adrFiles.map((f) => readFile(path.join(ADR_DIR, f))).join('\n');

  const bugIds = extractIds(buglog, /^### (B-\d{4})/gm);
  // Active rows (`| D-3 |`) and resolved prose lines (`- D-1 (2026-09-14) — …`)
  const debtIds = [
    ...extractIds(debt, /^\| (D-\d+) /gm),
    ...extractIds(debt, /^-\s+(D-\d+)\s+\(/gm),
  ];
  const ruleIds = extractIds(rulesDoc, /\b(BR-\d{2})\b/g);
  const adrIds = extractIds(adrContent, /^# (\d{4})/gm);
  const changelogIds = extractIds(cl, /^#{3,4}\s(?:-\s\*\*)?(CH-\d{4})/gm);

  // Split into entries: a new entry starts at each header line; malformed IDs included
  const lines = cl.split(/\r?\n/);
  const entries = [];
  let sectionDate = null;
  let current = null;
  for (const line of lines) {
    const sec = line.match(/^##\s+\[[^\]]+\]\s*[—-]\s*(\d{4}-\d{2}-\d{2})/);
    if (sec) {
      sectionDate = sec[1];
      current = null;
      continue;
    }
    const head = line.match(ENTRY_HEADER);
    if (head) {
      const id = head[1];
      current = { id, date: sectionDate };
      const remainder = line.slice(head[0].length).trim();
      if (remainder.startsWith('·')) {
        const parts = remainder.split('·').map((p) => p.trim());
        if (parts.length >= 4) {
          current.type = parts[1];
          current.layer = parts[2];
          current.title = parts[3];
        }
      } else {
        const compact = remainder.match(/^([\w]+):\s*([^:]+):\s*(.+)$/);
        if (compact) {
          current.type = compact[1];
          current.layer = compact[2];
          current.title = compact[3];
        }
      }
      entries.push(current);
      continue;
    }
    if (current) {
      const field = line.match(/^\s*-\s*\*{0,2}(\w+)\*{0,2}:\s*(.*)$/);
      if (field && !(field[1] in current)) current[field[1]] = field[2].trim();
    }
  }

  // Malformed ID detection: any CH- token in a header position that is not CH-#### 
  for (const entry of entries) {
    if (!/^CH-\d{4}$/.test(entry.id)) {
      errors.push(`Invalid ID format: ${entry.id} (expected CH-####)`);
    }
  }

  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.id)) errors.push(`Duplicate entry ID: ${entry.id}`);
    seen.add(entry.id);
    const id = entry.id;

    for (const field of REQUIRED_FIELDS) {
      const value = entry[field];
      if (value === undefined || value === '' || value === '—') {
        if (!OPTIONAL_FIELDS.includes(field) && field !== 'id' && /^CH-\d{4}$/.test(id)) {
          errors.push(`${id}: missing required field "${field}"`);
        }
      }
    }

    if (entry.date && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
      errors.push(`${id}: date must be ISO format YYYY-MM-DD`);
    }

    if (entry.type && !VALID_TYPES.includes(entry.type)) {
      errors.push(`${id}: invalid type "${entry.type}" (must be one of ${VALID_TYPES.join(', ')})`);
    }

    if (entry.layer && !VALID_LAYERS.includes(entry.layer)) {
      errors.push(`${id}: invalid layer "${entry.layer}" (must be one of ${VALID_LAYERS.join(', ')})`);
    }

    if (entry.breaking && !/^(yes|no)\b/.test(entry.breaking)) {
      errors.push(`${id}: breaking must start with "yes" or "no"`);
    }

    if (entry.files) {
      const files = entry.files.split(',').map((f) => f.trim()).filter(Boolean);
      for (const f of files) {
        if (f === '—') continue;
        if (!fs.existsSync(path.join(ROOT, f))) {
          const msg = `${id}: File not found: ${f}`;
          if (strict) errors.push(msg);
          else warnings.push(`${id}: referenced file does not exist: ${f}`);
        }
      }
    }

    if (entry.rules) {
      const rules = entry.rules.split(',').map((r) => r.trim()).filter(Boolean);
      for (const r of rules) {
        if (r === 'none' || r === '—') continue;
        if (!/^BR-\d{2}$/.test(r)) {
          warnings.push(`${id}: rule "${r}" does not match BR-## format`);
        } else if (!ruleIds.includes(r)) {
          errors.push(`${id}: rule "${r}" references unknown business rule (see BUSINESS_RULES.md)`);
        }
      }
    }

    if (entry.fixes) {
      const fixes = entry.fixes.split(',').map((f) => f.trim()).filter(Boolean);
      for (const f of fixes) {
        if (f === 'none' || f === '—') continue;
        if (!bugIds.includes(f)) {
          errors.push(`${id}: fixes references unknown bug "${f}" (known: ${bugIds.join(', ') || 'none'})`);
        }
      }
    }

    if (entry.debt) {
      const val = entry.debt.trim();
      if (/^(created|resolved|open) /.test(val)) {
        const did = val.split(' ')[1];
        if (!debtIds.includes(did)) {
          errors.push(`${id}: debt references unknown D-id "${did}" (known: ${debtIds.join(', ') || 'none'})`);
        }
      } else if (val !== 'none' && val !== '—') {
        warnings.push(`${id}: debt field must be "none" or "created/resolved/open D-#"`);
      }
    }

    if (entry.supersedes && entry.supersedes !== '—' && entry.supersedes !== 'none' && !/^CH-\d{4}$/.test(entry.supersedes)) {
      warnings.push(`${id}: supersedes must be "—", "none", or CH-####`);
    }
  }

  // Index ↔ entry consistency (only when an Index table is present in the content)
  const indexMatch = cl.match(/\| ID \| Date \| Type \| Layer \| Summary \| Rules \| Fixes \| Debt \| Brk \|\n([\s\S]*?)\n\n/);
  if (indexMatch) {
    const indexRows = indexMatch[1].split('\n').filter((r) => r.startsWith('| CH-'));
    for (const row of indexRows) {
      const cols = row.split('|').map((c) => c.trim()).filter((c) => c);
      if (cols.length >= 2 && !changelogIds.includes(cols[0])) {
        errors.push(`Index references missing entry: ${cols[0]}`);
      }
    }
    for (const cid of changelogIds) {
      if (!indexRows.some((r) => r.includes(cid))) {
        warnings.push(`Entry ${cid} missing from Index table`);
      }
    }
  }

  if (strict) return { valid: errors.length === 0, errors };
  return { errors, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { errors, warnings } = validate();

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const w of warnings) console.log('  ⚠ ' + w);
  }

  if (errors.length > 0) {
    console.log('Errors:');
    for (const e of errors) console.log('  ✗ ' + e);
    process.exit(1);
  }

  console.log('CHANGELOG.md validation passed');
}
