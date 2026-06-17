import { randomUUID } from "node:crypto";

import {
  buildGuidanceFromAction,
  buildSignalGuidance,
  mergeGuidance,
  construirTexto,
  type InstructivoOptions,
} from "./mcp-response-guidance";

export type { InstructivoOptions };

export interface McpToolResponse<T extends Record<string, unknown>> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
  isError?: boolean;
}

function baseMeta(startTime?: number): { schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number } {
  return {
    schemaVersion: "1.0" as const,
    timestamp: new Date().toISOString(),
    requestId: `mcp-${randomUUID().slice(0, 8)}`,
    ...(startTime != null ? { durationMs: Date.now() - startTime } : {}),
  };
}

export function ok<T extends Record<string, unknown>>(
  structuredContent: T,
  options?: { startTime?: number },
): McpToolResponse<T & { ok: true; schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number }> {
  const payload = {
    ok: true as const,
    ...baseMeta(options?.startTime),
    ...structuredContent,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function fail(
  code: string,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    hint?: string;
    retryable?: boolean;
    nextActions?: string[];
    action?: string;
    startTime?: number;
  },
): McpToolResponse<{
  ok: false;
  schemaVersion: "1.0";
  timestamp: string;
  requestId: string;
  durationMs?: number;
  action?: string;
  error: {
    code: string;
    message: string;
    hint?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
  nextActions?: string[];
}> {
  const payload = {
    ok: false as const,
    ...baseMeta(options?.startTime),
    ...(options?.action ? { action: options.action } : {}),
    error: {
      code,
      message,
      ...(options?.hint ? { hint: options.hint } : {}),
      ...(options?.retryable != null ? { retryable: options.retryable } : {}),
      ...(options?.details ? { details: options.details } : {}),
    },
    ...(options?.nextActions ? { nextActions: options.nextActions } : {}),
  };

  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function errorToFail(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
  options?: { details?: Record<string, unknown>; hint?: string; retryable?: boolean; nextActions?: string[]; action?: string; startTime?: number },
) {
  const err = error as Error & { code?: string; details?: Record<string, unknown> };

  return fail(
    err.code ?? fallbackCode,
    err.message ?? fallbackMessage,
    {
      details: err.details,
      ...options,
    },
  );
}

export function assertStructuredContent<T>(
  schema: { parse: (value: unknown) => T },
  response: McpToolResponse<any>,
): McpToolResponse<any> {
  schema.parse(response.structuredContent);
  return response;
}

export function instructivo<T extends Record<string, unknown>>(
  toolName: string,
  structuredContent: T,
  opts: InstructivoOptions = {},
): McpToolResponse<T & { ok: true; schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number }> {
  const guidance = mergeGuidance(
    mergeGuidance(opts, buildGuidanceFromAction(toolName, structuredContent)),
    buildSignalGuidance(structuredContent),
  );

  const payload = {
    ok: true as const,
    ...baseMeta(guidance.startTime),
    ...structuredContent,
  };

  const texto = construirTexto(toolName, payload, guidance);

  return {
    content: [{ type: "text", text: texto }],
    structuredContent: payload,
  };
}
