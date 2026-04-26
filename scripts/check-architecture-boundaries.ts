#!/usr/bin/env bun
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

interface Violation {
  file: string;
  rule: string;
  message: string;
  match?: string;
}

interface BoundaryRule {
  id: string;
  description: string;
  include: string[];
  exclude?: string[];
  forbidden: Array<{
    pattern: RegExp;
    message: string;
  }>;
}

const ROOT = process.cwd();

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "generated",
  ".turbo",
  "coverage",
]);

const TEXT_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
];

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
];

const rules: BoundaryRule[] = [
  {
    id: "ios-domain-no-upward-deps",
    description: "ios-domain debe ser dominio puro y no depender de capas superiores",
    include: ["packages/ios-domain/src"],
    exclude: ["packages/ios-domain/src/__tests__"],
    forbidden: [
      {
        pattern: /from\s+["']@cisco-auto\/kernel(?:\/|["'])/g,
        message: "ios-domain no puede importar @cisco-auto/kernel. Usa @cisco-auto/ios-primitives.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-control(?:\/|["'])/g,
        message: "ios-domain no puede importar pt-control.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-runtime(?:\/|["'])/g,
        message: "ios-domain no puede importar pt-runtime.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-memory(?:\/|["'])/g,
        message: "ios-domain no puede importar pt-memory.",
      },
      {
        pattern: /["']bun:sqlite["']/g,
        message: "ios-domain no puede usar bun:sqlite. La persistencia vive en pt-memory.",
      },
      {
        pattern: /from\s+["']node:(fs|path|os|child_process|process|worker_threads)/g,
        message: "ios-domain no debe depender de infraestructura Node.",
      },
    ],
  },
  {
    id: "pt-memory-no-control",
    description: "pt-memory puede depender de ios-domain, pero no de pt-control ni apps",
    include: ["packages/pt-memory/src"],
    exclude: ["packages/pt-memory/src/__tests__"],
    forbidden: [
      {
        pattern: /from\s+["']@cisco-auto\/pt-control(?:\/|["'])/g,
        message: "pt-memory no puede importar pt-control.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-runtime(?:\/|["'])/g,
        message: "pt-memory no puede importar pt-runtime.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-cli(?:\/|["'])/g,
        message: "pt-memory no puede importar pt-cli.",
      },
    ],
  },
  {
    id: "pt-cli-no-pt-control-root",
    description: "pt-cli debe usar subpaths explícitos de pt-control",
    include: ["apps/pt-cli/src"],
    exclude: [
      "apps/pt-cli/src/__tests__",
      "apps/pt-cli/src/commands",
      "apps/pt-cli/src/telemetry",
      "apps/pt-cli/src/application",
    ],
    forbidden: [
      {
        pattern: /from\s+["']@cisco-auto\/pt-control["']/g,
        message: "No importes desde @cisco-auto/pt-control raíz. Usa subpaths explícitos.",
      },
      {
        pattern: /import\(\s*["']@cisco-auto\/pt-control["']\s*\)/g,
        message: "No hagas dynamic import desde @cisco-auto/pt-control raíz. Usa subpaths explícitos.",
      },
      {
        pattern: /from\s+["']@cisco-auto\/pt-control\/legacy["']/g,
        message: "pt-cli no puede usar el entrypoint legacy.",
      },
      {
        pattern: /import\(\s*["']@cisco-auto\/pt-control\/legacy["']\s*\)/g,
        message: "pt-cli no puede usar dynamic import del entrypoint legacy.",
      },
    ],
  },
  {
    id: "packages-no-app-imports",
    description: "packages/* no puede depender de apps/*",
    include: ["packages"],
    forbidden: [
      {
        pattern: /from\s+["']@cisco-auto\/pt-cli(?:\/|["'])/g,
        message: "Un paquete no puede importar @cisco-auto/pt-cli.",
      },
      {
        pattern: /from\s+["'](?:\.\.\/)+apps\//g,
        message: "Un paquete no puede importar por ruta relativa hacia apps/.",
      },
      {
        pattern: /from\s+["'].*apps\/pt-cli\/src/g,
        message: "Un paquete no puede importar internals de apps/pt-cli.",
      },
    ],
  },
  {
    id: "pt-runtime-no-node-in-runtime",
    description: "pt-runtime/src debe ser PT-safe y no usar APIs Node en runtime",
    include: ["packages/pt-runtime/src"],
    exclude: [
      "packages/pt-runtime/src/build",
      "packages/pt-runtime/src/scripts",
      "packages/pt-runtime/src/cli.ts",
      "packages/pt-runtime/src/__tests__",
      "packages/pt-runtime/src/harness",
      "packages/pt-runtime/src/runtime-artifacts.ts",
      "packages/pt-runtime/src/value-objects/hardware-maps.ts",
      "packages/pt-runtime/src/fase-7-runtime.test.ts",
    ],
    forbidden: [
      {
        pattern: /from\s+["']node:/g,
        message: "pt-runtime runtime no debe importar node:*.",
      },
      {
        pattern: /from\s+["']fs["']/g,
        message: "pt-runtime runtime no debe importar fs.",
      },
      {
        pattern: /from\s+["']path["']/g,
        message: "pt-runtime runtime no debe importar path.",
      },
      {
        pattern: /from\s+["']child_process["']/g,
        message: "pt-runtime runtime no debe importar child_process.",
      },
    ],
  },
  {
    id: "no-research-imports",
    description: "Código productivo no puede importar scripts de research",
    include: ["apps", "packages"],
    forbidden: [
      {
        pattern: /from\s+["'](?:\.\.\/)+research\//g,
        message: "Código productivo no puede importar research/.",
      },
      {
        pattern: /from\s+["'].*packet-tracer-api-exploration/g,
        message: "Código productivo no puede importar research/packet-tracer-api-exploration.",
      },
    ],
  },
  {
    id: "no-cross-package-src-imports",
    description: "No importar src interno de otro paquete por ruta profunda",
    include: ["apps", "packages"],
    forbidden: [
      {
        pattern: /from\s+["']@cisco-auto\/[^"']+\/src\//g,
        message: "No importes src interno de otro paquete. Usa exports públicos del paquete.",
      },
      {
        pattern: /from\s+["'](?:\.\.\/)+(?:packages|apps)\/[^"']+\/src\//g,
        message: "No importes src interno por ruta relativa cross-package. Usa exports públicos.",
      },
    ],
  },
];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = toPosix(relative(ROOT, full));

    if (IGNORED_DIRS.has(entry)) {
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

    if (TEXT_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(rel);
    }
  }

  return out;
}

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function isSourceFile(file: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => file.endsWith(ext));
}

function fileMatchesAny(file: string, prefixes: string[] | undefined): boolean {
  if (!prefixes || prefixes.length === 0) return false;
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix + "/"));
}

function collectFilesForRule(rule: BoundaryRule): string[] {
  const files = rule.include.flatMap((prefix) => walk(join(ROOT, prefix)));

  return files.filter((file) => {
    if (!isSourceFile(file)) return false;
    if (fileMatchesAny(file, rule.exclude)) return false;
    return true;
  });
}

function scanBoundaryRules(): Violation[] {
  const violations: Violation[] = [];

  for (const rule of rules) {
    const files = collectFilesForRule(rule);

    for (const file of files) {
      const abs = join(ROOT, file);
      const source = readFileSync(abs, "utf8");

      for (const forbidden of rule.forbidden) {
        forbidden.pattern.lastIndex = 0;
        const matches = source.match(forbidden.pattern);

        if (!matches) continue;

        violations.push({
          file,
          rule: rule.id,
          message: forbidden.message,
          match: matches[0],
        });
      }
    }
  }

  return violations;
}

function scanGeneratedRuntimeState(): Violation[] {
  const violations: Violation[] = [];
  const files = walk(ROOT);

  for (const file of files) {
    if (
      file === "~" ||
      file.startsWith("~/") ||
      file.includes("/pt-dev/") ||
      file.endsWith("/protocol.seq.json") ||
      file.endsWith("/bridge-lease.json") ||
      file.endsWith("/heartbeat.json") ||
      file.endsWith("/state.json") ||
      file.endsWith("/_queue.json") ||
      (file.includes("/commands/") && file.endsWith(".json")) ||
      (file.includes("/results/") && file.endsWith(".json")) ||
      (file.includes("/consumer-state/") && file.endsWith(".json"))
    ) {
      violations.push({
        file,
        rule: "no-generated-runtime-state",
        message: "No versionar estado generado de Packet Tracer/file-bridge.",
      });
    }
  }

  return violations;
}

function scanBackupFiles(): Violation[] {
  const violations: Violation[] = [];
  const files = walk(ROOT);

  for (const file of files) {
    if (
      file.endsWith(".bak") ||
      file.endsWith(".old") ||
      file.endsWith(".orig") ||
      file.endsWith(".rej")
    ) {
      violations.push({
        file,
        rule: "no-backup-files",
        message: "No versionar archivos backup/legacy sueltos.",
      });
    }
  }

  return violations;
}

function scanExperimentalScriptsInScriptsDir(): Violation[] {
  const violations: Violation[] = [];
  const scriptsDir = join(ROOT, "scripts");

  if (!existsSync(scriptsDir)) return violations;

  const forbiddenName = /(jailbreak|exploit|exfiltration|siphon|manipulator|genomic)/i;

  for (const file of walk(scriptsDir)) {
    if (forbiddenName.test(file)) {
      violations.push({
        file,
        rule: "no-experimental-scripts-in-scripts",
        message:
          "Scripts experimentales deben vivir en research/packet-tracer-api-exploration, no en scripts/.",
      });
    }
  }

  return violations;
}

function scanPtControlRootIndex(): Violation[] {
  const violations: Violation[] = [];
  const file = "packages/pt-control/src/index.ts";
  const abs = join(ROOT, file);

  if (!existsSync(abs)) return violations;

  const source = readFileSync(abs, "utf8");

  const forbidden = [
    'export * from "./omni',
    'export * from "./agent',
    'export * from "./quality',
    'export * from "./pt/',
    'export * from "./application/services',
    'from "@cisco-auto/kernel',
    'from "@cisco-auto/pt-runtime',
    'from "@cisco-auto/ios-domain',
  ];

  for (const pattern of forbidden) {
    if (source.includes(pattern)) {
      violations.push({
        file,
        rule: "pt-control-root-api-small",
        message: "pt-control root index debe ser API estable mínima. Usa subpaths.",
        match: pattern,
      });
    }
  }

  return violations;
}

function formatViolation(violation: Violation): string {
  const match = violation.match ? `\n     match: ${violation.match}` : "";

  return [
    `  - ${violation.file}`,
    `     rule : ${violation.rule}`,
    `     error: ${violation.message}${match}`,
  ].join("\n");
}

function main(): void {
  const violations = [
    ...scanBoundaryRules(),
    ...scanGeneratedRuntimeState(),
    ...scanBackupFiles(),
    ...scanExperimentalScriptsInScriptsDir(),
    ...scanPtControlRootIndex(),
  ];

  if (violations.length === 0) {
    console.log("✅ Architecture boundaries OK");
    return;
  }

  console.error(`❌ Architecture boundary violations: ${violations.length}`);
  console.error("");

  for (const violation of violations) {
    console.error(formatViolation(violation));
    console.error("");
  }

  process.exit(1);
}

main();