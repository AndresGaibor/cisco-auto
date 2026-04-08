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

export interface QtScriptValidationResult extends ValidationResult {
  metadata?: ValidationResult["metadata"] & {
    hasHostTick?: boolean;
    hasWatcher?: boolean;
    hasCleanupHook?: boolean;
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
  // Aceptar cualquier modo de polling: pollCommandQueue (V2) o pollCommandSlot (legacy)
  // El patrón de cola se detecta por COMMANDS_DIR en lugar de COMMAND_FILE
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
  // NOTA: invokeRuntimeCleanupHook ya NO es requerido - ahora es un no-op de seguridad
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
// FASE 5 CRASH FIX: Lifecycle-safe patterns (CRITICAL - Build Breakers)
// ============================================================================
// Estas reglas detectan el bug del Stop que causaba crash por re-ejecución
// de runtime.js durante cleanup mediante new Function(...)

// Regla A: cleanUp() NO debe invocar invokeRuntimeCleanupHook
// Busca específicamente la LLAMADA (con paréntesis) no la definición
const LIFECYCLE_RULE_A = {
  pattern: /function\s+cleanUp\s*\([^)]*\)\s*\{[^}]*invokeRuntimeCleanupHook\s*\(/,
  reason: "FATAL: cleanUp() must NOT call invokeRuntimeCleanupHook() - causes re-execution during shutdown",
};

// Regla B: invokeRuntimeCleanupHook() NO debe contener runtimeFn(
const LIFECYCLE_RULE_B = {
  pattern: /function\s+invokeRuntimeCleanupHook\s*\([^)]*\)\s*\{[^}]*runtimeFn\s*\(/,
  reason: "FATAL: invokeRuntimeCleanupHook() must NOT call runtimeFn() - causes re-execution during shutdown",
};

// Regla C: main.js NO debe tener runtimeFn({ type: "__cleanup__" } dentro de cleanUp
const LIFECYCLE_RULE_C = {
  pattern: /function\s+cleanUp[\s\S]{0,500}runtimeFn\s*\(\s*\{\s*type\s*:\s*["']__cleanup__["']/,
  reason: "FATAL: main.js must NOT call runtimeFn({ type: '__cleanup__' }) in cleanUp() - causes re-execution",
};

// Regla D: runtime.js no debe tener jobs + listeners + polling síncrono mezclados
const LIFECYCLE_RULE_D = {
  pattern: /IOS_JOBS[\s\S]{0,200}attachTerminalListeners[\s\S]{0,200}while\s*\(\s*attempt\s*<\s*maxAttempts/,
  reason: "WARNING: runtime.js mixes IOS_JOBS + attachTerminalListeners + sync polling - consider moving to main.js",
};

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
// Helper: check for lifecycle-safe patterns (CRITICAL - Build Breakers)
// ============================================================================

function findLifecycleViolations(code: string, target: "main" | "runtime"): string[] {
  const errors: string[] = [];
  
  // Regla A: Solo aplica a main.js
  if (target === "main") {
    if (LIFECYCLE_RULE_A.pattern.test(code)) {
      errors.push(`LIFECYCLE VIOLATION: ${LIFECYCLE_RULE_A.reason}`);
    }
    if (LIFECYCLE_RULE_C.pattern.test(code)) {
      errors.push(`LIFECYCLE VIOLATION: ${LIFECYCLE_RULE_C.reason}`);
    }
  }
  
  // Regla B: Solo aplica a main.js (donde está define invokeRuntimeCleanupHook)
  if (target === "main") {
    if (LIFECYCLE_RULE_B.pattern.test(code)) {
      errors.push(`LIFECYCLE VIOLATION: ${LIFECYCLE_RULE_B.reason}`);
    }
  }
  
  // Regla D: Solo aplica a runtime.js - ADVERTENCIA (no error en validateMainJs)
  
  return errors;
}

function findQtScriptMainViolations(code: string): string[] {
  const errors: string[] = [];
  const required = [
    "function main()",
    "function cleanup()",
    "function loadRuntime()",
    "function hostTick()",
    "function setupFileWatcher()",
    "function teardownFileWatcher()",
  ];

  const missing = findMissingSymbols(code, required);
  errors.push(...missing);

  if (!code.includes("hostTickInterval")) {
    errors.push("Missing hostTickInterval state");
  }

  if (!code.includes("runtimeDirty")) {
    errors.push("Missing runtimeDirty state");
  }

  if (!code.includes("watcherArmed")) {
    errors.push("Missing watcherArmed state");
  }

  if (code.includes("runtimeFn(")) {
    errors.push("QtScript main must not re-enter runtimeFn during cleanup");
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
  
  // 2b. LIFECYCLE RULES (CRITICAL - Build Breakers)
  const lifecycleErrors = findLifecycleViolations(code, "main");
  errors.push(...lifecycleErrors);
  
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
  
  // Regla D: runtime.js no debe mezclar jobs + listeners + sync polling
  const hasJobs = code.includes("IOS_JOBS");
  const hasListeners = code.includes("attachTerminalListeners") || code.includes("TERMINAL_LISTENERS");
  const hasSyncPolling = /while\s*\(\s*\w+\s*<\s*\w+Attempts/.test(code);

  if (hasJobs && hasListeners && hasSyncPolling) {
    errors.push("ARCHITECTURE VIOLATION: runtime.js mixes IOS_JOBS + attachTerminalListeners + sync polling - this can crash PT on stop");
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
  
  // Cross-check: IOS_JOBS debe estar en main.js (dueño del estado persistente)
  const mainHasIosJobs = mainJs.includes("IOS_JOBS") && mainJs.includes("function createIosJob");
  const runtimeHasIosJobs = runtimeJs.includes("IOS_JOBS");
  
  if (runtimeHasIosJobs && !mainHasIosJobs) {
    warnings.push("ARCHITECTURE: IOS_JOBS está en runtime.js pero no en main.js - el estado persistente debe estar en main.js");
  }
  
  // Cross-check: Terminal listeners deben estar en main.js
  const mainHasListeners = mainJs.includes("attachTerminalListeners");
  const runtimeHasListeners = runtimeJs.includes("attachTerminalListeners");
  
  if (runtimeHasListeners && !mainHasListeners) {
    warnings.push("ARCHITECTURE: attachTerminalListeners está en runtime.js pero no en main.js - los listeners deben estar en main.js");
  }
  
  // Cross-check: cleanUp debe llamar detachAllTerminalListeners
  const mainHasDetach = mainJs.includes("detachAllTerminalListeners");
  if (mainHasListeners && mainHasIosJobs && !mainHasDetach) {
    errors.push("main.js cleanUp() debe llamar detachAllTerminalListeners() si tiene listeners");
  }
  
  // PR 5: Verificar paridad dispatcher - catálogo - handlers
  const catalogHandlers = [
    "handleAddDevice", "handleRemoveDevice", "handleListDevices", "handleRenameDevice",
    "handleMoveDevice", "handleClearTopology", "handleAddModule", "handleRemoveModule",
    "handleAddLink", "handleRemoveLink", "handleConfigHost", "handleConfigIos",
    "handleExecIos", "handleExecInteractive", "handleSnapshot", "handleInspect",
    "handleHardwareInfo", "handleHardwareCatalog", "handleCommandLog",
    "handleListCanvasRects", "handleGetRect", "handleDevicesInRect",
    "handleResolveCapabilities"
  ];
  
  for (const handler of catalogHandlers) {
    if (!runtimeJs.includes(`function ${handler}(`)) {
      warnings.push(`FALTA HANDLER: ${handler} está en el catálogo pero no está definido en runtime.js`);
    }
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

export function validateQtScriptArtifacts(mainJs: string, runtimeJs: string): QtScriptValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  errors.push(...findForbiddenTokens(mainJs));
  errors.push(...findForbiddenGlobals(mainJs));
  errors.push(...findQtScriptMainViolations(mainJs));
  errors.push(...findForbiddenTokens(runtimeJs));
  errors.push(...findForbiddenGlobals(runtimeJs));
  errors.push(...findForbiddenIosPatterns(runtimeJs));

  if (runtimeJs.length < 500) {
    errors.push(`runtime.js is too small (${runtimeJs.length} bytes)`);
  }

  if (runtimeJs.includes("IOS_JOBS") && runtimeJs.includes("attachTerminalListeners") && /while\s*\(\s*\w+\s*<\s*\w+Attempts/.test(runtimeJs)) {
    errors.push("ARCHITECTURE VIOLATION: runtime.js mixes IOS_JOBS + attachTerminalListeners + sync polling - this can crash PT on stop");
  }

  if (!runtimeJs.includes("handlePollDeferred")) {
    warnings.push("runtime.js should have handlePollDeferred");
  }

  if (!runtimeJs.includes("IOS_JOBS")) {
    warnings.push("runtime.js does not define IOS_JOBS - job system may not work");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metadata: {
      target: "both",
      hasMain: mainJs.includes("function main()"),
      hasCleanUp: mainJs.includes("function cleanup()"),
      hasDeferredPolling: runtimeJs.includes("handlePollDeferred"),
      hasIosJobs: runtimeJs.includes("IOS_JOBS"),
      hasHostTick: mainJs.includes("function hostTick()"),
      hasWatcher: mainJs.includes("function setupFileWatcher()") && mainJs.includes("function teardownFileWatcher()"),
      hasCleanupHook: mainJs.includes("function cleanup()"),
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
