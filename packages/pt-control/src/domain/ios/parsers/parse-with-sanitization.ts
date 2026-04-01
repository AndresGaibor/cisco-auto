// ============================================================================
// IOS Parser with Sanitization Wrapper
// Applies sanitizeOutput before parsing and wraps result in ParseResult
// ============================================================================

import { sanitizeOutput, type SanitizeResult } from "../utils/sanitize-output";
import {
  createParseResult,
  createPartialParseResult,
  createParseErrorResult,
  type OutputSource,
} from "../utils/parse-result";
import { classifyOutput } from "../session/command-result";
import * as parsers from "./index.js";
import type {
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowInterfaces,
  ShowVersion,
} from "@cisco-auto/types";
import type { ParserCommand } from "./index.js";

// Re-export parser types
export type { ParserCommand } from "./index.js";

/**
 * Parse IOS command output with full sanitization and ParseResult wrapper
 */
export function parseWithSanitization<T>(
  command: string,
  rawOutput: string,
  options?: {
    source?: OutputSource;
    confidenceOverride?: number;
  }
): ReturnType<typeof createParseResult<T>> {
  // Sanitize first
  const sanitizeResult = sanitizeOutput(rawOutput);

  // Get parser for this command
  const parser = parsers.getParser(command);
  if (!parser) {
    return createParseErrorResult<T>(
      sanitizeResult.cleaned,
      `No parser found for command: ${command}`
    );
  }

  try {
    // Parse the cleaned output
    const parsed = parser(sanitizeResult.cleaned) as T;

    // Calculate confidence based on sanitization flags and parsing results
    let confidence = options?.confidenceOverride ?? 1.0;

    // Reduce confidence if output was dirty
    if (sanitizeResult.hadAnsi) confidence *= 0.98;
    if (sanitizeResult.hadMore) confidence *= 0.95;
    if (sanitizeResult.hadControlChars) confidence *= 0.95;
    if (sanitizeResult.hadTruncation) confidence *= 0.7;

    // Check if output had warnings from classification
    const classification = classifyOutput(sanitizeResult.cleaned);
    const warnings: string[] = [];

    if (sanitizeResult.hadTruncation) {
      warnings.push("Output may be truncated - did not end with prompt");
    }

    if (classification.warnings && classification.warnings.length > 0) {
      warnings.push(...classification.warnings);
    }

    if (classification.type === "warning") {
      warnings.push(classification.message ?? "Command succeeded with warnings");
    }

    // Partial confidence if there were parsing concerns but not failures
    const hasWarnings = warnings.length > 0 || sanitizeResult.hadTruncation;
    if (hasWarnings && confidence === 1.0) {
      confidence = 0.85;
    }

    return createParseResult(parsed, sanitizeResult.cleaned, {
      source: options?.source ?? "terminal",
      warnings,
      confidence,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createPartialParseResult<T>(
      { raw: sanitizeResult.cleaned } as T,
      sanitizeResult.cleaned,
      [`Parse error: ${errorMessage}`],
      options?.source ?? "terminal"
    );
  }
}

/**
 * Sanitize and classify output without parsing
 */
export function sanitizeAndClassify(rawOutput: string): SanitizeResult & {
  classification: ReturnType<typeof classifyOutput>;
} {
  const sanitizeResult = sanitizeOutput(rawOutput);
  const classification = classifyOutput(sanitizeResult.cleaned);
  return { ...sanitizeResult, classification };
}

// Convenience functions for common parsers

export function parseShowIpInterfaceBrief(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowIpInterfaceBrief>(
    "show ip interface brief",
    raw,
    { source }
  );
}

export function parseShowVlan(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowVlan>(
    "show vlan brief",
    raw,
    { source }
  );
}

export function parseShowIpRoute(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowIpRoute>(
    "show ip route",
    raw,
    { source }
  );
}

export function parseShowRunningConfig(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowRunningConfig>(
    "show running-config",
    raw,
    { source }
  );
}

export function parseShowInterfaces(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowInterfaces>(
    "show interfaces",
    raw,
    { source }
  );
}

export function parseShowVersion(raw: string, source?: OutputSource) {
  return parseWithSanitization<ShowVersion>(
    "show version",
    raw,
    { source }
  );
}
