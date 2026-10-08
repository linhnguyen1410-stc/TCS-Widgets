#!/usr/bin/env node
// Import-ban gate (template 17-§17.5-3; bans from template 01-architecture).
// Exit 1 when any layer violates its import bans. Run via `npm run check:imports`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const rules = [
  {
    scope: "src/domain",
    name: "domain framework isolation",
    banned: [/from ["']react/, /from ["']mendix/, /window\./, /document\./],
  },
  {
    scope: "src/core",
    name: "core zero project dependencies",
    banned: [/from ["']\.\.\/\.\.\/(domain|state|infrastructure|presentation)\//],
  },
  {
    scope: "src/state",
    name: "state Mendix isolation",
    banned: [/from ["']mendix["']/, /window\.mx/],
  },
  {
    scope: "src/presentation",
    name: "presentation Mendix isolation",
    banned: [/from ["']mendix["']/, /window\.mx/],
  },
  {
    scope: "src/infrastructure",
    name: "infrastructure must not import State",
    banned: [/from ["']\.\.\/\.\.\/state\//],
  },
];

const violations = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) {
      continue;
    }
    const rel = full.slice(SRC.length).replace(/^[/\\]/, "").split(sep).join("/");
    for (const rule of rules) {
      if (!rel.startsWith(rule.scope.replace("src/", ""))) {
        continue;
      }
      const lines = readFileSync(full, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const pattern of rule.banned) {
          if (pattern.test(line)) {
            violations.push(`src/${rel}:${i + 1}  [${rule.name}]  ${line.trim()}`);
          }
        }
      });
    }
  }
};

walk(SRC);

if (violations.length > 0) {
  console.error("Import-ban violations:");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  process.exit(1);
}

console.log("Import bans OK (01-architecture enforced).");
