// packages/pt-runtime/src/build/generated-asset-checks.ts
// Verificación estructural post-generación para assets PT-safe.
//
// Realiza validaciones estructurales sobre main.js, runtime.js y catalog.js
// generados para asegurar que cumplen con los contratos esperados.

export interface AssetCheckError {
  asset: "main" | "runtime" | "catalog";
  check: string;
  message: string;
  severity: "error" | "warning";
}

export interface AssetCheckResult {
  passed: boolean;
  errors: AssetCheckError[];
  warnings: string[];
}

export interface AssetValidators {
  main?: (code: string) => AssetCheckResult;
  runtime?: (code: string) => AssetCheckResult;
  catalog?: (code: string) => AssetCheckResult;
}

export interface AssetValidationPipelineResult {
  main: AssetCheckResult;
  runtime: AssetCheckResult;
  catalog: AssetCheckResult;
  overall: boolean;
}

const FORBIDDEN_PATTERNS_MAIN = [
  {
    pattern: /\bdevice-crud\b|\bhandleAddDevice\b|\bhandleRemoveDevice\b/,
    check: "no-business-logic",
    message: "main.js contains business logic handlers — not allowed in kernel",
    severity: "error" as const,
  },
  {
    pattern: /\bvlan\b|\bdhcp\b|\bospf\b|\beigrp\b/,
    check: "no-business-logic",
    message: "main.js contains network protocol logic — not allowed in kernel",
    severity: "error" as const,
  },
  {
    pattern: /\bruntimeDispatcher\b/,
    check: "no-runtime-dispatcher",
    message: "main.js should not contain runtimeDispatcher — belongs in runtime.js",
    severity: "error" as const,
  },
];

const FORBIDDEN_PATTERNS_RUNTIME = [
  {
    pattern: /\bcreateKernel\b|\bboot\b|\bshutdownKernel\b/,
    check: "no-kernel-lifecycle",
    message: "runtime.js should not contain kernel lifecycle functions",
    severity: "error" as const,
  },
  {
    pattern: /\b_ptLoadModule\b/,
    check: "no-module-loader",
    message: "runtime.js should not load other modules — module loading is main.js responsibility",
    severity: "error" as const,
  },
  {
    pattern: /\bcommand-queue\b|\bqueue-poll\b|\blease\b/,
    check: "no-scheduler-queue",
    message: "runtime.js should not contain scheduler/queue logic — belongs in main.js",
    severity: "error" as const,
  },
  {
    pattern: /\bglobalThis\b/,
    check: "no-global-this",
    message: "globalThis is not available in PT QTScript engine",
    severity: "error" as const,
  },
];

const FORBIDDEN_PATTERNS_CATALOG = [
  {
    pattern: /\bruntimeDispatcher\b|\bcreatePtDepsFromGlobals\b/,
    check: "no-executive-logic",
    message: "catalog.js should not contain executive logic — only constants",
    severity: "error" as const,
  },
  {
    pattern: /\bfunction\s+main\b|\bfunction\s+cleanUp\b/,
    check: "no-entry-points",
    message: "catalog.js should not contain entry point functions",
    severity: "error" as const,
  },
];

const REQUIRED_PATTERNS_MAIN = [
  {
    pattern: /function\s+main\s*\(/,
    check: "has-main-function",
    message: "main.js must contain function main()",
    severity: "error" as const,
  },
  {
    pattern: /function\s+cleanUp\s*\(/,
    check: "has-cleanup-function",
    message: "main.js must contain function cleanUp()",
    severity: "error" as const,
  },
  {
    pattern: /createKernel\s*=/,
    check: "has-createkernel",
    message: "main.js must expose createKernel",
    severity: "error" as const,
  },
  {
    pattern: /_ptLoadModule\b/,
    check: "has-module-loader",
    message: "main.js must contain _ptLoadModule for loading catalog.js and runtime.js",
    severity: "error" as const,
  },
];

const REQUIRED_PATTERNS_RUNTIME = [
  {
    pattern: /_ptDispatch\s*=/,
    check: "has-dispatch",
    message: "runtime.js must expose _ptDispatch",
    severity: "error" as const,
  },
  {
    pattern: /runtimeDispatcher\b/,
    check: "has-runtime-dispatcher",
    message: "runtime.js must contain runtimeDispatcher function",
    severity: "error" as const,
  },
];

const REQUIRED_PATTERNS_CATALOG = [
  {
    pattern: /PT_CATALOG\b/,
    check: "has-pt-catalog",
    message: "catalog.js must expose PT_CATALOG",
    severity: "error" as const,
  },
  {
    pattern: /PT_DEVICE_TYPES\b/,
    check: "has-device-types",
    message: "catalog.js must expose PT_DEVICE_TYPES",
    severity: "error" as const,
  },
  {
    pattern: /PT_CABLE_TYPES\b/,
    check: "has-cable-types",
    message: "catalog.js must expose PT_CABLE_TYPES",
    severity: "error" as const,
  },
];

function checkPatterns(code: string, forbidden: typeof FORBIDDEN_PATTERNS_MAIN, required: typeof REQUIRED_PATTERNS_MAIN, asset: "main" | "runtime" | "catalog"): AssetCheckResult {
  const errors: AssetCheckError[] = [];
  const warnings: string[] = [];

  for (const rule of forbidden) {
    if (rule.pattern.test(code)) {
      errors.push({
        asset,
        check: rule.check,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }

  for (const rule of required) {
    if (!rule.pattern.test(code)) {
      errors.push({
        asset,
        check: rule.check,
        message: rule.message,
        severity: rule.severity,
      });
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

export function checkMainAsset(code: string): AssetCheckResult {
  return checkPatterns(code, FORBIDDEN_PATTERNS_MAIN, REQUIRED_PATTERNS_MAIN, "main");
}

export function checkRuntimeAsset(code: string): AssetCheckResult {
  return checkPatterns(code, FORBIDDEN_PATTERNS_RUNTIME, REQUIRED_PATTERNS_RUNTIME, "runtime");
}

export function checkCatalogAsset(code: string): AssetCheckResult {
  return checkPatterns(code, FORBIDDEN_PATTERNS_CATALOG, REQUIRED_PATTERNS_CATALOG, "catalog");
}

export function checkAllAssets(assets: {
  main: string;
  runtime: string;
  catalog: string;
}): { main: AssetCheckResult; runtime: AssetCheckResult; catalog: AssetCheckResult; overall: boolean } {
  const main = checkMainAsset(assets.main);
  const runtime = checkRuntimeAsset(assets.runtime);
  const catalog = checkCatalogAsset(assets.catalog);

  return {
    main,
    runtime,
    catalog,
    overall: main.passed && runtime.passed && catalog.passed,
  };
}

export function runAssetValidationPipeline(
  generated: { main: string; runtime: string; catalog: string },
  validators: AssetValidators,
): AssetValidationPipelineResult {
  const mainResult = validators.main
    ? validators.main(generated.main)
    : checkMainAsset(generated.main);

  const runtimeResult = validators.runtime
    ? validators.runtime(generated.runtime)
    : checkRuntimeAsset(generated.runtime);

  const catalogResult = validators.catalog
    ? validators.catalog(generated.catalog)
    : checkCatalogAsset(generated.catalog);

  return {
    main: mainResult,
    runtime: runtimeResult,
    catalog: catalogResult,
    overall: mainResult.passed && runtimeResult.passed && catalogResult.passed,
  };
}

export function formatAssetCheckResult(result: AssetCheckResult, assetName: string): string {
  const lines: string[] = [];
  lines.push(`=== ${assetName} Asset Check ===`);
  lines.push(`Passed: ${result.passed}`);

  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      lines.push(`  [${err.severity}] ${err.check}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      lines.push(`  - ${warn}`);
    }
  }

  return lines.join("\n");
}
