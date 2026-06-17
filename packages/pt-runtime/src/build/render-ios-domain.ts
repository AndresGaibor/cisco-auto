// packages/pt-runtime/src/build/render-ios-domain.ts
// Genera ios-domain.js: IIFE con código PT-safe de ios-domain/terminal-execution

import * as fs from "fs";
import * as path from "path";
import { transformToPtSafeAst, type AstTransformOptions, type TransformResult } from "./ast-transform.js";
import { assertNoEmittedTypeScriptHelpers, reportPtSafeValidation } from "./build-utils.js";
import { assertJavaScriptSyntaxOrThrow } from "./syntax-assert.js";
import { computeChecksum, normalizeArtifactForChecksum } from "./checksum.js";
import { validatePtSafe } from "./validate-pt-safe.js";

export interface RenderIosDomainOptions {
  srcDir: string;
  outputPath: string;
  minify?: boolean;
}

export interface RenderResult {
  outputPath: string;
  checksum: string;
  fileCount: number;
}

const IOS_DOMAIN_FILES = [
  // kernel/
  "ios-domain/src/terminal-execution/kernel/index.ts",
  "ios-domain/src/terminal-execution/kernel/output-detectors.ts",
  "ios-domain/src/terminal-execution/kernel/delta.ts",
  "ios-domain/src/terminal-execution/kernel/semantic.ts",
  "ios-domain/src/terminal-execution/kernel/completion-policy.ts",
  "ios-domain/src/terminal-execution/kernel/state.ts",
  "ios-domain/src/terminal-execution/kernel/types.ts",
  "ios-domain/src/terminal-execution/kernel/result-envelope.ts",
  // session/
  "ios-domain/src/terminal-execution/session/index.ts",
  "ios-domain/src/terminal-execution/session/state.ts",
  "ios-domain/src/terminal-execution/session/registry.ts",
  // prompt/
  "ios-domain/src/terminal-execution/prompt/index.ts",
  "ios-domain/src/terminal-execution/prompt/detector.ts",
  // sanitizer/
  "ios-domain/src/terminal-execution/sanitizer/index.ts",
  "ios-domain/src/terminal-execution/sanitizer/command.ts",
  // detection/
  "ios-domain/src/terminal-execution/detection/index.ts",
  "ios-domain/src/terminal-execution/detection/stability.ts",
  "ios-domain/src/terminal-execution/detection/output-extractor.ts",
  "ios-domain/src/terminal-execution/detection/errors.ts",
  "ios-domain/src/terminal-execution/detection/semantic-verifier.ts",
  // handler/
  "ios-domain/src/terminal-execution/handler/index.ts",
  "ios-domain/src/terminal-execution/handler/pager.ts",
  "ios-domain/src/terminal-execution/handler/confirm.ts",
  // engine/
  "ios-domain/src/terminal-execution/engine/index.ts",
  "ios-domain/src/terminal-execution/engine/event-collector.ts",
  "ios-domain/src/terminal-execution/engine/completion-controller.ts",
  "ios-domain/src/terminal-execution/engine/output-pipeline.ts",
  "ios-domain/src/terminal-execution/engine/error-resolver.ts",
  "ios-domain/src/terminal-execution/engine/observability.ts",
];

const TSLIB_HELPERS = `
var __assign = function(t) {
  var s, i = 1, n = arguments.length;
  for (; i < n; i++) { s = arguments[i]; for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]; }
  return t;
};
var __values = function(o) {
  if (typeof Symbol !== "undefined" && o[Symbol.iterator]) {
    var it = o[Symbol.iterator](), nxt;
    return { next: function() { nxt = it.next(); return nxt; } };
  }
  return { next: function() { return { value: o[0], done: true }; } };
};
var __read = function(o, n) {
  if (n == null || n === 0) return [];
  var m = typeof Symbol === "undefined" ? 0 : o[Symbol.iterator] ? o[Symbol.iterator]() : null;
  var i = 0;
  if (m) { var r = []; var e; while (!(e = m.next()).done && (n == null || i < n)) { r.push(e.value); i++; } return r; }
  var a = []; while (i < n && i < o.length) a.push(o[i++]);
  return a;
};
var __spreadArray = function(to, from, pack) {
  if (pack || from.length === 0) for (var i = 0, e = from.length; i < e; i++) if (to.indexOf(from[i]) < 0) to.push(from[i]);
  return to;
};
`.trim();

function assembleIosDomainOutput(code: string): string {
  return `
"use strict";

// ios-domain.js - IIFE PT-safe para terminal-execution de ios-domain
// Generado automáticamente - NO editar manualmente

var _g = (typeof self !== "undefined") ? self : (function() { return this; })();

var dprint = (typeof _g.dprint === "function") ? _g.dprint : function(msg) {
  if (typeof print === "function") print(String(msg));
};

${TSLIB_HELPERS}

${code}

// --- EXPORT ---
var iosDomain = (function() {
  return {
    // Los exports se asignan arriba via Object.assign
  };
})();

// Asignar al scope global para acceso desde PT
if (typeof window !== "undefined") {
  window.IOS_DOMAIN = iosDomain;
} else if (typeof global !== "undefined") {
  global.IOS_DOMAIN = iosDomain;
}
`;
}

function validateAndTransform(srcDir: string, minify: boolean): { code: string; validation: ReturnType<typeof validatePtSafe> } {
  const sourceFiles = new Map<string, string>();

  for (const relPath of IOS_DOMAIN_FILES) {
    const filePath = path.join(srcDir, relPath);
    if (fs.existsSync(filePath)) {
      sourceFiles.set(relPath, fs.readFileSync(filePath, "utf-8"));
    } else {
      console.warn(`[render-ios-domain] Archivo no encontrado: ${filePath}`);
    }
  }

  const { code, validation } = transformToPtSafeAst(sourceFiles, {
    replaceConsoleWithDprint: true,
    minify,
    treeShake: false,
  });

  assertNoEmittedTypeScriptHelpers("ios-domain transform output", code);

  return { code, validation };
}

function buildPipeline(options: RenderIosDomainOptions, label: string): string {
  const { code, validation } = validateAndTransform(options.srcDir, options.minify ?? false);

  reportPtSafeValidation(label, validation);

  let output = assembleIosDomainOutput(code);

  assertJavaScriptSyntaxOrThrow(label, output);

  return output;
}

export async function renderIosDomain(options: RenderIosDomainOptions): Promise<RenderResult> {
  const output = buildPipeline(options, "ios-domain.js");

  await fs.promises.mkdir(path.dirname(options.outputPath), { recursive: true });
  await fs.promises.writeFile(options.outputPath, output, "utf-8");

  const content = await fs.promises.readFile(options.outputPath, "utf-8");
  const normalized = normalizeArtifactForChecksum(content);
  const checksum = computeChecksum(normalized);

  return {
    outputPath: options.outputPath,
    checksum,
    fileCount: IOS_DOMAIN_FILES.length,
  };
}

export function renderIosDomainSync(options: RenderIosDomainOptions): RenderResult {
  const output = buildPipeline(options, "ios-domain.js (sync)");

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, output, "utf-8");

  const content = fs.readFileSync(options.outputPath, "utf-8");
  const normalized = normalizeArtifactForChecksum(content);
  const checksum = computeChecksum(normalized);

  return {
    outputPath: options.outputPath,
    checksum,
    fileCount: IOS_DOMAIN_FILES.length,
  };
}
