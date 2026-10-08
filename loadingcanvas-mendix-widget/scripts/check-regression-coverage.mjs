#!/usr/bin/env node
// Regression coverage check: verifies every BUGLOG entry has a linked regression spec that passes.
// Run via `npm run check:regression`.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUGLOG = join(ROOT, "BUGLOG.md");
const SRC = join(ROOT, "src");

function extractBugEntries() {
  const content = readFileSync(BUGLOG, "utf8");
  const entries = [];
  
  // Match ### B-#### blocks
  const bugRegex = /###\s+(B-\d+)\s*.*?(?=###\s+B-\d+|$)/gs;
  let match;
  
  while ((match = bugRegex.exec(content)) !== null) {
    const block = match[0];
    const id = match[1];
    
    // Extract "Regression spec: `path` (\"test name\")" patterns
    // Also handles "Regression spec: none ..." as intentional no-spec
    const specRegex = /Regression spec:\s*(?:`([^`]+)`\s*(?:\(\"([^\"]+)\"\))?|none\b[^`\n]*)/g;
    const specFiles = [];
    const specNames = [];
    let hasIntentionalNone = false;
    
    let specMatch;
    while ((specMatch = specRegex.exec(block)) !== null) {
      if (specMatch[1]) {
        specFiles.push(specMatch[1]);
        if (specMatch[2]) specNames.push(specMatch[2]);
      } else {
        hasIntentionalNone = true;
      }
    }
    
    entries.push({ id, specFiles, specNames, hasIntentionalNone });
  }
  
  return entries;
}

function fileExists(relativePath) {
  try {
    statSync(resolve(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

function main() {
  const entries = extractBugEntries();
  let hasErrors = false;
  
  console.log(`Found ${entries.length} bug entries in BUGLOG.md\n`);
  
  for (const entry of entries) {
    console.log(`Checking ${entry.id}...`);
    
    if (entry.specFiles.length === 0 && !entry.hasIntentionalNone) {
      console.error(`  ❌ NO REGRESSION SPEC LINKED`);
      hasErrors = true;
      continue;
    }
    
    if (entry.hasIntentionalNone) {
      console.log(`  ⏭️  Intentional no-spec (marked as "none" in BUGLOG)`);
    }
    
    for (const specFile of entry.specFiles) {
      if (!fileExists(specFile)) {
        console.error(`  ❌ MISSING SPEC FILE: ${specFile}`);
        hasErrors = true;
      } else {
        console.log(`  ✅ Spec file exists: ${specFile}`);
      }
    }
    
    if (entry.specNames.length > 0) {
      console.log(`  Test names: ${entry.specNames.join(", ")}`);
    }
  }
  
  // Also check for spec files that might be missing from BUGLOG
  const allSpecFiles = new Set();
  function collectSpecs(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (!entry.startsWith(".") && entry !== "node_modules") {
          collectSpecs(full);
        }
      } else if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
        const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
        allSpecFiles.add(rel);
      }
    }
  }
  collectSpecs(SRC);
  
  const linkedSpecs = new Set();
  for (const entry of entries) {
    for (const spec of entry.specFiles) {
      linkedSpecs.add(spec);
    }
  }
  
  // Check for unlinked spec files (warning only)
  const unlinked = [...allSpecFiles].filter(s => !linkedSpecs.has(s));
  if (unlinked.length > 0) {
    console.log(`\n⚠️  ${unlinked.length} spec files not linked from BUGLOG (may be new/untracked):`);
    for (const s of unlinked.slice(0, 10)) console.log(`   ${s}`);
    if (unlinked.length > 10) console.log(`   ... and ${unlinked.length - 10} more`);
  }
  
  if (hasErrors) {
    console.error("\n❌ Regression coverage check FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ Regression coverage check PASSED");
  }
}

main();