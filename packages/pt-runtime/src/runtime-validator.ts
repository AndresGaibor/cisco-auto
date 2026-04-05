// ============================================================================
// Runtime Validator - PT-safe validation (Fase 3)
// ============================================================================
// Valida que el código generado sea compatible con Qt Script Engine de PT

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    target: "main" | "runtime" | "both";
    hasMain: boolean;
    hasCleanUp: boolean;
    hasDeferredPolling: boolean;
    hasIosJobs: boolean;
  };
}

// ============================================================================
// Blacklist de sintaxis PT-unsafe
// ============================================================================

const FORBIDDEN_TOKENS = [
  { token: "import ", reason: "ES modules are not PT-safe in Script Module files" },
  { token: "export ", reason: "ES modules are not PT-safe in Script Module files" },
  { token: "class ", reason: "Use function constructors or plain objects only" },
  { token: "let ", reason: "Use var only" },
  { token: "const ", reason: "Use var only" },
  { token: "=>", reason: "Arrow functions are disallowed" },
  { token: "?.", reason: "Optional chaining is disallowed" },
  { token: "??", reason: "Nullish coalescing is disallowed" },
  { token: "async ", reason: "Async functions are disallowed" },
  { token: "await ", reason: "Await is disallowed" },
  { token: "for (const ", reason: "Use var in for loops" },
  { token: "for (let ", reason: "Use var in for loops" },
  { token: "`", reason: "Template literals are disallowed" },
];

const FORBIDDEN_PATTERNS = [
  { pattern: /new\s+Promise\s*\(/, reason: "Promise is not supported" },
  { pattern: /Promise\.resolve\s*\(/, reason: "Promise is not supported" },
  { pattern: /Promise\.reject\s*\(/, reason: "Promise is not supported" },
  { pattern: /Promise\.all\s*\(/, reason: "Promise is not supported" },
  { pattern: /Object\.assign\(/, reason: "Object.assign may not be supported" },
  { pattern: /new\s+Map\(/, reason: "Map may not be supported" },
  { pattern: /new\s+Set\(/, reason: "Set may not be supported" },
  { pattern: /new\s+WeakMap\(/, reason: "WeakMap may not be supported" },
  { pattern: /new\s+WeakSet\(/, reason: "WeakSet may not be supported" },
  { pattern: /Symbol\(/, reason: "Symbol may not be supported" },
  { pattern: /Proxy\(/, reason: "Proxy may not be supported" },
  { pattern: /Reflect\./, reason: "Reflect may not be supported" },
  // Patterns de lifecycle inseguro (Fase 5 crash fix)
  { pattern: /function\s+onWatchedFileChanged\s*\(\s*src\s*,\s*path\s*\)/, reason: "Use function(src, args) not function(src, path)" },
  { pattern: /function\s+onWatchedDirChanged\s*\(\s*src\s*,\s*path\s*\)/, reason: "Use function(src, args) not function(src, path)" },
];

// ============================================================================
// Blacklist de globals host-env incorrectos
// ============================================================================

const FORBIDDEN_GLOBALS = [
  "window",
  "document",
  "fetch",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "require",
  "exports",
  "process",
  "Buffer",
  "global",
  "globalThis",
  "setImmediate",
];

// ============================================================================
// Required symbols para main.js - Fase 5: cola real
// ============================================================================

const REQUIRED_MAIN_SYMBOLS_V2 = [
  "function main()",
  "function cleanUp()",
  "function loadRuntime(",
  "function writeHeartbeat(",
  "function pollCommandQueue(",  // V2: pollCommandQueue en lugar de pollCommandSlot
  "function pollDeferredCommands(",
  "function recoverInFlightOnStartup(",  // V2: recovery de in-flight
  "function savePendingCommands(",
];

// ============================================================================
// Required symbols para main.js V2 - cola real (Fase 5) + lifecycle safe
// ============================================================================

const REQUIRED_MAIN_SYMBOLS_QUEUE = [
  "COMMANDS_DIR",
  "IN_FLIGHT_DIR",
  "RESULTS_DIR",
  "DEAD_LETTER_DIR",
  "LOGS_DIR",
  "function listQueuedCommandFiles(",
  "function claimNextCommand(",
  "function recoverInFlightOnStartup(",
  "function teardownFileWatcher(", // REQUERIDO para lifecycle seguro
  "function invokeRuntimeCleanupHook(", // REQUERIDO para cleanup
];

// ============================================================================
// Required symbols para runtime.js
// ============================================================================

const REQUIRED_RUNTIME_SYMBOLS = [
  "IOS_JOBS",
  "IOS_SESSIONS",
  "function handleConfigIos(",
  "function handleExecIos(",
  "function handlePollDeferred(",
  "commandEnded",
  "outputWritten",
  "modeChanged",
  "moreDisplayed",
];

// ============================================================================
// Forbidden IOS patterns (old buggy pattern)
// ============================================================================

const FORBIDDEN_IOS_PATTERNS = [
  { pattern: /var\s+response\s*=\s*term\.enterCommand\(/, reason: "enterCommand returns void, not response" },
  { pattern: /term\.enterCommand\([^)]*\)\s*\[\s*\d+\s*\]/, reason: "enterCommand returns void, not array" },
  { pattern: /if\s*\(\s*!response\s*\)/, reason: "Old enterCommand return pattern - API is void" },
  { pattern: /return\s*\[\s*status\s*,\s*output\s*\]/, reason: "Old return pattern for enterCommand" },
];

// ============================================================================
// Helper: check for forbidden tokens
// ============================================================================

function findForbiddenTokens(code: string): string[] {
  const errors: string[] = [];
  
  for (const { token, reason } of FORBIDDEN_TOKENS) {
    if (code.indexOf(token) !== -1) {
      errors.push(`Forbidden syntax '${token}': ${reason}`);
    }
  }
  
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`Forbidden pattern: ${reason}`);
    }
  }
  
  return errors;
}

// ============================================================================
// Helper: check for forbidden globals
// ============================================================================

function findForbiddenGlobals(code: string): string[] {
  const errors: string[] = [];
  
  for (const global of FORBIDDEN_GLOBALS) {
    const regex = new RegExp(`\\b${global}\\b`);
    if (regex.test(code)) {
      errors.push(`Forbidden global '${global}': Not available in PT Script Engine`);
    }
  }
  
  return errors;
}

// ============================================================================
// Helper: check for required symbols
// ============================================================================

function findMissingSymbols(code: string, required: string[]): string[] {
  const errors: string[] = [];
  
  for (const symbol of required) {
    if (code.indexOf(symbol) === -1) {
      errors.push(`Missing required symbol: ${symbol}`);
    }
  }
  
  return errors;
}

// ============================================================================
// Helper: check for forbidden IOS patterns
// ============================================================================

function findForbiddenIosPatterns(code: string): string[] {
  const errors: string[] = [];
  
  for (const { pattern, reason } of FORBIDDEN_IOS_PATTERNS) {
    if (pattern.test(code)) {
      errors.push(`Forbidden IOS pattern: ${reason}`);
    }
  }
  
  return errors;
}

// ============================================================================
// Validate main.js (Script Engine infrastructure)
// ============================================================================

export function validateMainJs(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Syntax blacklist
  const syntaxErrors = findForbiddenTokens(code);
  errors.push(...syntaxErrors);
  
  // 2. Globals blacklist
  const globalErrors = findForbiddenGlobals(code);
  errors.push(...globalErrors);
  
  // 3. Required symbols - intentar ambos modos (legacy y cola real)
  const missingSymbolsLegacy = findMissingSymbols(code, REQUIRED_MAIN_SYMBOLS_V2);
  const missingSymbolsQueue = findMissingSymbols(code, REQUIRED_MAIN_SYMBOLS_QUEUE);
  
  // Si faltan symbols de ambos, reportar los que faltan (pero no fallar si es modo transición)
  // Aceptamos ambos modos: legacy (command.json) o queue (commands/)
  const usesQueue = code.includes("COMMANDS_DIR") && code.includes("IN_FLIGHT_DIR");
  const usesLegacy = code.includes("COMMAND_FILE") && code.includes("command.json");
  
  if (missingSymbolsLegacy.length > 0 && missingSymbolsQueue.length > 0 && !usesQueue && !usesLegacy) {
    // Ningún modo detectado - error
    errors.push(...missingSymbolsLegacy.slice(0, 3));
    errors.push(...missingSymbolsQueue.slice(0, 3));
  } else if (usesQueue && missingSymbolsQueue.length > 0) {
    // Modo cola pero faltan symbols - warning
    warnings.push("Queue mode: missing " + missingSymbolsQueue.slice(0, 3).join(", "));
  } else if (usesLegacy && missingSymbolsLegacy.length > 0) {
    // Modo legacy pero faltan symbols - warning
    warnings.push("Legacy mode: missing " + missingSymbolsLegacy.slice(0, 3).join(", "));
  }
  
  // 4. Check for journal-before-clear pattern O queue pattern
  const journalPattern = /journalCommand[\s\S]{0,200}writePlainTextToFile\(COMMAND_FILE/;
  const queuePattern = /listQueuedCommandFiles[\s\S]{0,200}claimNextCommand/;
  const pollQueuePattern = /pollCommandQueue[\s\S]{0,200}claimNextCommand/;
  
  if (!journalPattern.test(code) && !queuePattern.test(code) && !pollQueuePattern.test(code)) {
    // Permitir si usa uno de los patrones de queue
    if (!usesQueue && !usesLegacy) {
      errors.push("main.js must use queue-based command protocol or journal pattern");
    }
  }
  
  // 5. Check hot reload gating
  const hotReloadGated = /hasPendingDeferredCommands[\s\S]{0,150}loadRuntime/;
  if (!hotReloadGated.test(code)) {
    warnings.push("main.js should gate runtime hot reload by pending commands");
  }
  
  // 6. Check cleanup clears all intervals
  const cleanupClearsAll = /clearInterval\(commandPollInterval\)[\s\S]{0,200}clearInterval\(deferredPollInterval\)[\s\S]{0,200}clearInterval\(heartbeatInterval\)/;
  if (!cleanupClearsAll.test(code)) {
    errors.push("main.js cleanUp() must clear all three intervals");
  }
  
  // Warnings
  if (!code.includes("setInterval")) {
    warnings.push("main.js does not use setInterval - may not have polling");
  }
  
  const metadata = {
    target: "main" as const,
    hasMain: code.includes("function main()"),
    hasCleanUp: code.includes("function cleanUp()"),
    hasDeferredPolling: code.includes("pollDeferredCommands"),
    hasIosJobs: false,
  };
  
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

// ============================================================================
// Validate runtime.js (reloadable logic)
// ============================================================================

export function validateRuntimeJs(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Syntax blacklist - CRITICAL: fail immediately
  const syntaxErrors = findForbiddenTokens(code);
  errors.push(...syntaxErrors);
  
  // 2. Globals blacklist - CRITICAL: fail immediately  
  const globalErrors = findForbiddenGlobals(code);
  errors.push(...globalErrors);
  
  // If we have syntax/globals errors, don't continue
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      metadata: { target: "runtime", hasMain: false, hasCleanUp: false, hasDeferredPolling: false, hasIosJobs: false },
    };
  }
  
  // 6. Check for old buggy IOS patterns - CRITICAL: fail immediately
  const iosPatternErrors = findForbiddenIosPatterns(code);
  errors.push(...iosPatternErrors);
  
  // If we have syntax/globals/IOS pattern errors, don't continue
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      metadata: { target: "runtime", hasMain: false, hasCleanUp: false, hasDeferredPolling: false, hasIosJobs: false },
    };
  }
  
  // 3. Required symbols - warnings only (code may work without some)
  const missingSymbols = findMissingSymbols(code, REQUIRED_RUNTIME_SYMBOLS);
  warnings.push(...missingSymbols);
  
  // 4. Check size
  if (code.length < 500) {
    errors.push(`runtime.js is too small (${code.length} bytes)`);
  }
  
  // 5. Check essential handlers - warnings only
  const essentialHandlers = [
    "handleAddDevice",
    "handleSnapshot",
    "handleExecIos",
    "handleListDevices",
  ];
  
  for (const handler of essentialHandlers) {
    if (code.indexOf(`function ${handler}(`) === -1) {
      warnings.push(`Missing handler: ${handler}`);
    }
  }
  
  // 7. Check deferred support - warning
  if (!code.includes("deferred")) {
    warnings.push("runtime.js should support deferred commands");
  }
  
  // 8. Check poll handler - warning
  if (!code.includes("handlePollDeferred")) {
    warnings.push("runtime.js should have handlePollDeferred");
  }
  
  // Warnings
  if (!code.includes("IOS_JOBS")) {
    warnings.push("runtime.js does not define IOS_JOBS - job system may not work");
  }
  
  const metadata = {
    target: "runtime" as const,
    hasMain: false,
    hasCleanUp: false,
    hasDeferredPolling: code.includes("handlePollDeferred"),
    hasIosJobs: code.includes("IOS_JOBS"),
  };
  
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

// ============================================================================
// Validate both artifacts together
// ============================================================================

export function validateGeneratedArtifacts(mainJs: string, runtimeJs: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate each separately
  const mainResult = validateMainJs(mainJs);
  const runtimeResult = validateRuntimeJs(runtimeJs);
  
  errors.push(...mainResult.errors);
  errors.push(...runtimeResult.errors);
  
  warnings.push(...mainResult.warnings);
  warnings.push(...runtimeResult.warnings);
  
  // Cross-check: main must load runtime
  if (mainJs.indexOf("loadRuntime") === -1) {
    errors.push("main.js must have loadRuntime function");
  }
  
  // Cross-check: runtime must have healthcheck
  if (runtimeJs.indexOf("__healthcheck__") === -1) {
    warnings.push("runtime.js should support __healthcheck__ for validation");
  }
  
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metadata: {
      target: "both",
      hasMain: mainResult.metadata?.hasMain ?? false,
      hasCleanUp: mainResult.metadata?.hasCleanUp ?? false,
      hasDeferredPolling: mainResult.metadata?.hasDeferredPolling ?? false,
      hasIosJobs: runtimeResult.metadata?.hasIosJobs ?? false,
    },
  };
}

// ============================================================================
// Format errors for display
// ============================================================================

export function formatValidationErrors(result: ValidationResult): string {
  if (result.ok) {
    return "Validation passed";
  }
  
  const lines: string[] = [];
  lines.push("=== Validation Errors ===");
  
  for (const error of result.errors) {
    lines.push(`ERROR: ${error}`);
  }
  
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("=== Warnings ===");
    for (const warning of result.warnings) {
      lines.push(`WARNING: ${warning}`);
    }
  }
  
  return lines.join("\n");
}

// ============================================================================
// Legacy compatibility
// ============================================================================

export function validateMainCode(code: string): void {
  const result = validateMainJs(code);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
}

export function validateRuntimeCode(code: string): void {
  const result = validateRuntimeJs(code);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
}
