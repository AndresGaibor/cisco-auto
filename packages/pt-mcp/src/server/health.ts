export function createHealthPayload(): Record<string, unknown> {
  return { ok: true, service: "pt-mcp" };
}
