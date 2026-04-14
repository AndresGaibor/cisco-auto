// packages/pt-runtime/src/pt/terminal/prompt-parser.ts
// Parse IOS prompts to extract mode and command context

import type { IosMode } from "@cisco-auto/types";
export type { IosMode };

export interface ParsedPrompt {
  mode: IosMode;
  hostname: string;
  fullPrompt: string;
  isPaged: boolean;
}

/**
 * Parse an IOS prompt string to extract mode information
 */
export function parsePrompt(prompt: string): ParsedPrompt {
  const trimmed = (prompt || "").trim();
  
  const isPaged = trimmed.includes("--More--");
  
  let hostname = trimmed;
  let mode: IosMode = "unknown";
  
  if (trimmed.includes("(config-router)#")) {
    mode = "config-router";
    hostname = trimmed.replace("(config-router)#", "").replace("#", "");
  } else if (trimmed.includes("(config-line)#")) {
    mode = "config-line";
    hostname = trimmed.replace("(config-line)#", "").replace("#", "");
  } else if (trimmed.includes("(config-if)#")) {
    mode = "config-if";
    hostname = trimmed.replace("(config-if)#", "").replace("#", "");
  } else if (trimmed.includes("(config-subif)#")) {
    mode = "config-subif";
    hostname = trimmed.replace("(config-subif)#", "").replace("#", "");
  } else if (trimmed.includes("(config)#")) {
    mode = "config";
    hostname = trimmed.replace("(config)#", "").replace("#", "");
  } else if (trimmed.includes("#")) {
    mode = "privileged-exec";
    hostname = trimmed.replace("#", "");
  } else if (trimmed.includes(">")) {
    mode = "user-exec";
    hostname = trimmed.replace(">", "");
  }
  
  return {
    mode,
    hostname,
    fullPrompt: trimmed,
    isPaged,
  };
}

/**
 * Check if current mode allows executing a command
 */
export function canExecuteCommand(mode: IosMode, isShowCommand: boolean): boolean {
  if (isShowCommand && mode !== "config-line") {
    return true;
  }
  return mode === "privileged-exec" || mode.startsWith("config");
}

/**
 * Detect if output indicates confirmation needed
 */
export function isConfirmPrompt(output: string): boolean {
  return output.includes("[confirm]") || 
         output.includes("Proceed?") ||
         output.includes("confirmar");
}

/**
 * Detect if output indicates an error
 */
export function isErrorOutput(output: string): boolean {
  const errorPatterns = [
    /^% /,
    /^Invalid /i,
    /^Ambiguous /i,
    /^Incomplete /i,
    /^%[A-Z]+.*error/i,
    /^Command not found/i,
  ];
  
  return errorPatterns.some(pattern => pattern.test(output.trim()));
}