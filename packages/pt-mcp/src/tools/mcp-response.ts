import { randomUUID } from "node:crypto";

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

export interface InstructivoOptions {
  paso?: string;
  siguientes?: string[];
  tips?: string[];
  resumen?: string;
  startTime?: number;
}

function formatearJSON(datos: Record<string, unknown>): string {
  return JSON.stringify(datos, null, 2);
}

function construirTexto(
  titulo: string,
  datos: Record<string, unknown>,
  opts: InstructivoOptions,
): string {
  const lineas: string[] = [];

  lineas.push(`## ${titulo}`);
  lineas.push("");

  if (opts.resumen) {
    lineas.push(opts.resumen);
    lineas.push("");
  }

  lineas.push("```json");
  lineas.push(formatearJSON(datos));
  lineas.push("```");
  lineas.push("");

  if (opts.paso) {
    lineas.push("### Siguiente paso");
    lineas.push(opts.paso);
    lineas.push("");
  }

  if (opts.siguientes && opts.siguientes.length > 0) {
    lineas.push("### Opciones");
    opts.siguientes.forEach((s, i) => {
      lineas.push(`${i + 1}. ${s}`);
    });
    lineas.push("");
  }

  if (opts.tips && opts.tips.length > 0) {
    lineas.push("> 💡 " + opts.tips.join("\n> 💡 "));
  }

  return lineas.join("\n");
}

export function instructivo<T extends Record<string, unknown>>(
  toolName: string,
  structuredContent: T,
  opts: InstructivoOptions = {},
): McpToolResponse<T & { ok: true; schemaVersion: "1.0"; timestamp: string; requestId: string; durationMs?: number }> {
  const payload = {
    ok: true as const,
    ...baseMeta(opts.startTime),
    ...structuredContent,
  };

  const texto = construirTexto(toolName, payload, opts);

  return {
    content: [{ type: "text", text: texto }],
    structuredContent: payload,
  };
}
