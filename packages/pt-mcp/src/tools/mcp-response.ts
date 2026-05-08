export interface McpToolResponse<T extends Record<string, unknown>> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
  isError?: boolean;
}

export function ok<T extends Record<string, unknown>>(
  structuredContent: T,
): McpToolResponse<T & { ok: true }> {
  const payload = {
    ok: true as const,
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
  details?: Record<string, unknown>,
): McpToolResponse<{
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}> {
  const payload = {
    ok: false as const,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export function errorToFail(error: unknown, fallbackCode: string, fallbackMessage: string) {
  const err = error as Error & { code?: string; details?: Record<string, unknown> };

  return fail(
    err.code ?? fallbackCode,
    err.message ?? fallbackMessage,
    err.details,
  );
}
