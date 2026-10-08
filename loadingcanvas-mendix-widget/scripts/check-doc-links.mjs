#!/usr/bin/env node
// Doc link gate: every repo path referenced from a documentation file must exist.
// Backticked paths are repo-root relative; markdown link targets resolve from the
// directory of the doc that contains them. Exit 1 on any missing target.
// Run via `npm run check:docs`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "__tests__", "fixtures"]);
const DOC_EXTENSIONS = [".md"];
const DOC_FILENAMES = [".clinerules"];
const ROOT_DIRS = ["src", "docs", "scripts", "typings", "design-mockups"];
const ROOT_DIR_PATH = new RegExp(`^(?:${ROOT_DIRS.join("|")})/[\\w.*/-]+$`);
// Angle-bracket placeholders and the "NNN" template convention are illustrative,
// not real targets. A wildcard still pins its parent directory, which is checked.
const PLACEHOLDER = /[<>…]|NNN/;
const TEMPLATE_ANCHOR = /^template\//;
const collectDocs = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectDocs(full, found);
    } else if (DOC_EXTENSIONS.some((ext) => entry.endsWith(ext)) || DOC_FILENAMES.includes(entry)) {
      found.push(full);
    }
  }
  return found;
};

const normalize = (raw) => raw.trim().split("#")[0].replace(/[),.;:]+$/, "").replace(/\/+$/, "");

const isExternal = (target) => target === "" || /^(https?:|mailto:)/.test(target);

// Only dir-prefixed paths are unambiguous: a bare filename in backticks may be
// relative to the doc itself, or prose shorthand for a file under src/.
const isRootRelative = (target) => ROOT_DIR_PATH.test(target);

export function checkDocLinks(targetDir = ROOT) {
  const violations = [];
  let checked = 0;

  for (const file of collectDocs(targetDir)) {
  const relFile = relative(targetDir, file).split("\\").join("/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    const candidates = [];

    for (const match of line.matchAll(/\]\(([^)]+)\)/g)) {
      candidates.push({ target: normalize(match[1]), base: dirname(file) });
    }
    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      const target = normalize(match[1]);
      if (isRootRelative(target)) {
        candidates.push({ target, base: ROOT });
      } else if (TEMPLATE_ANCHOR.test(target)) {
        // template/ anchors are checked against ROOT but flagged as violations
        candidates.push({ target, base: ROOT });
      }
    }

    for (const { target, base } of candidates) {
      if (isExternal(target) || PLACEHOLDER.test(target)) continue;
      // template/ anchors are forbidden - they reference external template docs
      if (TEMPLATE_ANCHOR.test(target)) {
        violations.push(`${relFile}:${index + 1}  ${target} (template anchor not allowed)`);
        continue;
      }
      checked += 1;
      const probe = (target.includes("*") ? target.slice(0, target.indexOf("*")) : target).replace(/\/+$/, "");
      if (!existsSync(resolve(base, probe))) {
        violations.push(`${relFile}:${index + 1}  ${target}`);
      }
    }
  });
}

  return { passed: violations.length === 0, errors: violations, checked };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { passed, errors, checked } = checkDocLinks();
  if (!passed) {
    console.error(`Doc references to missing paths (${errors.length}):`);
    for (const violation of errors) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log(`Doc links OK (${checked} references checked).`);
}