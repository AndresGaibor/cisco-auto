#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

interface Violation {
  file: string;
  line: number;
  text: string;
}

const ROOT = process.cwd();

const ignoredDirs = new Set([
  ".git",
  "node_modules",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".sisyphus",
  "docs/archive/legacy-core",
  "tests/unit",
  ".claude",
  "dist-qtscript",
  "packages/pt-runtime/dist-qtscript",
  "packages/generated",
  "packages/pt-control/docs",
  "packages/pt-runtime/docs",
  "docs/MIGRATION_GUIDE.md",
  ".omc",
  "apps/pt-cli/src/contracts/lab-spec.ts",
  "apps/pt-cli/src/types/lab-spec.types.ts",
  "apps/pt-cli/src/utils/tool-result.ts",
  "apps/pt-cli/src/commands/parse.ts",
  "apps/pt-cli/src/commands/template.ts",
  "apps/pt-cli/src/commands/validate.ts",
  "apps/pt-cli/src/commands/device/interactive.ts",
]);

const allowedFiles = new Set(["scripts/check-stale-core-references.ts"]);

const allowedPatterns = [
  /@cisco-auto\/core no existe/,
  /`@cisco-auto\/core` no existe/,
  /packages\/core no existe/,
  /`packages\/core/,
  /sin dependencias de @cisco-auto\/core/,
  /sin dependencias de @cisco-auto\/core/i,
  /Implementación local.*@cisco-auto\/core/i,
  /Reemplaza la dependencia.*@cisco-auto\/core/i,
  /stale @cisco-auto\/core references/,
  /No active @cisco-auto\/core/,
  /Check packages\/core\/src\/catalog/,
  /legacy `@cisco-auto\/core`/i,
  /Archivo legacy `@cisco-auto\/core`/,
];

const textExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".skip",
];

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function isIgnored(path: string): boolean {
  const rel = toPosix(relative(ROOT, path));

  if (rel.includes("/node_modules/") || rel.startsWith("node_modules/")) {
    return true;
  }

  for (const ignored of ignoredDirs) {
    if (rel === ignored || rel.startsWith(ignored + "/")) {
      return true;
    }
  }

  return false;
}

function walk(dir: string): string[] {
  if (!existsSync(dir) || isIgnored(dir)) {
    return [];
  }

  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (isIgnored(full)) {
      continue;
    }

    const stat = statSync(full);

    if (stat.isDirectory()) {
      out.push(...walk(full));
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    if (textExtensions.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }

  return out;
}

function isAllowedLine(line: string): boolean {
  return allowedPatterns.some((pattern) => pattern.test(line));
}

function main(): void {
  const violations: Violation[] = [];

  for (const file of walk(ROOT)) {
    const rel = toPosix(relative(ROOT, file));

    if (allowedFiles.has(rel)) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const hasStaleRef =
        line.includes("@cisco-auto/core") ||
        line.includes("packages/core") ||
        line.includes("../packages/core") ||
        line.includes("packages/core/");

      if (!hasStaleRef) {
        return;
      }

      if (isAllowedLine(line)) {
        return;
      }

      violations.push({
        file: rel,
        line: index + 1,
        text: line.trim(),
      });
    });
  }

  if (violations.length === 0) {
    console.log("✅ No active @cisco-auto/core / packages/core references");
    return;
  }

  console.error(`❌ Stale core references found: ${violations.length}`);
  console.error("");

  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}`);
    console.error(`  ${violation.text}`);
    console.error("");
  }

  process.exit(1);
}

main();
