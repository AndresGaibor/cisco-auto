// ============================================================================
// Command Result Types
// ============================================================================

export interface CommandResult {
  ok: boolean;
  raw: string;
  status: number;
  parsed?: Record<string, unknown>;
  error?: string;
  paging?: boolean;
  awaitingConfirm?: boolean;
}

export function isSuccessResult(result: CommandResult): boolean {
  return result.ok === true;
}

export function isErrorResult(result: CommandResult): boolean {
  return result.ok === false;
}

export function isPagingResult(result: CommandResult): boolean {
  return result.paging === true || result.raw.includes("--More--");
}

export function isConfirmPrompt(result: CommandResult): boolean {
  return result.awaitingConfirm === true || result.raw.includes("[confirm]");
}

export function isPasswordPrompt(result: CommandResult): boolean {
  return result.raw.toLowerCase().includes("password");
}

export function isParseErrorResult(result: CommandResult): boolean {
  return "parseError" in result && result.parseError !== undefined;
}

export type OutputClassificationType = "success" | "invalid" | "incomplete" | "ambiguous" | "paging" | "error";

export interface OutputClassification {
  type: OutputClassificationType;
  message?: string;
}

export function classifyOutput(output: string): OutputClassification {
  const upperOutput = output.toUpperCase();

  if (upperOutput.includes("INVALID INPUT")) {
    return { type: "invalid", message: extractErrorMessage(output) };
  }

  if (upperOutput.includes("INCOMPLETE COMMAND")) {
    return { type: "incomplete", message: extractErrorMessage(output) };
  }

  if (upperOutput.includes("AMBIGUOUS COMMAND")) {
    return { type: "ambiguous", message: extractErrorMessage(output) };
  }

  if (output.includes("--More--") || output.includes("-- More --")) {
    return { type: "paging" };
  }

  if (upperOutput.includes("%") && (upperOutput.includes("ERROR") || upperOutput.includes("FAILED"))) {
    return { type: "error", message: extractErrorMessage(output) };
  }

  return { type: "success" };
}

function extractErrorMessage(output: string): string | undefined {
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes("%")) {
      return line.trim();
    }
  }
  return undefined;
}

export function createSuccessResult(
  raw: string,
  status = 0,
  parsed?: Record<string, unknown>
): CommandResult {
  const paging = raw.includes("--More--");
  return {
    ok: true,
    raw,
    status,
    parsed,
    paging,
  };
}

export function createErrorResult(
  error: string,
  raw = "",
  status = 1
): CommandResult {
  return {
    ok: false,
    error,
    raw,
    status,
  };
}
