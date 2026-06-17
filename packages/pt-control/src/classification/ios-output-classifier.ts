/**
 * iOS Output Classification - Classifies IOS command output and errors
 * Detects error patterns, success patterns, and special states
 */

export interface OutputClassification {
  category: string;
  isFailure: boolean;
  isSuccess: boolean;
  isPaging: boolean;
  requiresConfirm: boolean;
  requiresPassword: boolean;
}

export function classifyCommandOutput(output: string): string {
  const trimmed = output.trim();

  // Error patterns
  if (trimmed.includes("% Invalid command") || trimmed.includes("% Invalid input")) {
    return "invalid-command";
  }
  if (trimmed.includes("% Incomplete command")) {
    return "incomplete-command";
  }
  if (trimmed.includes("% Ambiguous command")) {
    return "ambiguous-command";
  }
  if (trimmed.includes("% ") && trimmed.includes("ERROR")) {
    return "ios-error";
  }

  // Paging state
  if (trimmed.includes("--More--") || trimmed.endsWith("--More--")) {
    return "paging";
  }

  // Confirmation prompts
  if (/\[confirm\]/i.test(trimmed)) {
    return "confirmation-prompt";
  }

  // Password prompts
  if (/^Password:/im.test(trimmed)) {
    return "password-prompt";
  }

  // Default success
  return "success";
}

export function isFailureClassification(classification: string): boolean {
  return classification.includes("error") ||
    classification.includes("invalid") ||
    classification.includes("incomplete") ||
    classification.includes("ambiguous");
}

export function isSuccessClassification(classification: string): boolean {
  return !isFailureClassification(classification) &&
    classification !== "paging" &&
    classification !== "confirmation-prompt" &&
    classification !== "password-prompt";
}

export function requiresUserInput(classification: string): boolean {
  return classification === "paging" ||
    classification === "confirmation-prompt" ||
    classification === "password-prompt";
}
