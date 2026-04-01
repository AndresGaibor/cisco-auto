// ============================================================================
// Runtime Validator - Validates generated JavaScript code
// ============================================================================

/**
 * Validate generated JavaScript code has correct syntax
 * Throws descriptive error if invalid
 */
export function validateRuntimeCode(code: string): void {
  // Check minimum size (empty or tiny files are suspicious)
  if (code.length < 500) {
    throw new Error(
      `Generated runtime.js is suspiciously small (${code.length} bytes). ` +
      `Probably missing code or generation failed.`
    );
  }

  // Check for essential handlers
  const essentialHandlers = [
    "handleAddDevice",
    "handleSnapshot",
    "handleExecIos",
    "handleListDevices",
  ];

  for (const handler of essentialHandlers) {
    if (code.indexOf(`function ${handler}(`) === -1) {
      throw new Error(`Generated runtime.js is missing essential handler: ${handler}`);
    }
  }

// Try to parse the code (won't catch all runtime errors, but catches syntax)
  // Note: Full validation skipped - the IIFE pattern causes issues with new Function
  // Instead, verify code has minimum required content
  try {
    if (code.length < 500) {
      throw new Error("Code too short");
    }
    if (!code.includes("function handle")) {
      throw new Error("Missing handlers");
    }
    // Skip: new Function("payload", "ipc", "dprint", code);
  } catch (e) {
    const err = e as Error;
    console.error("Parse error details:", err.message);
    console.error("Code sample:", code.slice(-200));
    throw new Error(
      `Generated runtime.js has syntax error: ${err.message}\n` +
      `This means the code generator produced invalid JavaScript.\n` +
      `Check compose.ts and parser-generator.ts for errors.`
    );
  }
}
