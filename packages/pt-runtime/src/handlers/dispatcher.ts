import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";

export type HandlerFn = (payload: any, api: any) => RuntimeResult;

const HANDLER_MAP: Map<string, HandlerFn> = new Map();

export function registerHandler(type: string, handler: HandlerFn): void {
  HANDLER_MAP.set(type, handler);
}

export function getHandler(type: string): HandlerFn | undefined {
  return HANDLER_MAP.get(type);
}

export function runtimeDispatcher(
  payload: Record<string, unknown>,
  api: RuntimeApi,
): RuntimeResult {
  const type = payload.type as string;

  const keys = Object.keys(payload);
  const filteredKeys: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k !== "commands" && k !== "command") {
      filteredKeys.push(k);
    }
  }
  const payloadKeys = filteredKeys.join(", ");
  api.dprint("[runtime:" + type + "] dispatching payload=" + (payloadKeys || "(empty)"));

  if (!type || typeof type !== "string") {
    return {
      ok: false,
      error: "Missing payload.type",
      code: "INVALID_PAYLOAD",
      source: "synthetic",
    } as RuntimeResult;
  }

  const handler = HANDLER_MAP.get(type);
  api.dprint(`[runtime:${type}] handler=${handler ? "found" : "NOT_FOUND"}`);

  if (!handler) {
    return {
      ok: false,
      error: `Unknown command type: ${type}`,
      code: "UNKNOWN_COMMAND",
      source: "synthetic",
    } as RuntimeResult;
  }

  try {
    const result = handler(payload, api);
    const isDeferred = (result as any)?.deferred === true;
    api.dprint(`[runtime:${type}] result ok=${result.ok} deferred=${isDeferred}`);
    return result;
  } catch (e) {
    const errMsg = String(e);
    api.dprint(`[runtime:${type}] ERROR: ${errMsg}`);
    return {
      ok: false,
      error: errMsg,
      code: "DISPATCH_ERROR",
      source: "synthetic",
    } as RuntimeResult;
  }
}

export function validateHandlerCoverage(): { missing: string[]; registered: string[] } {
  return {
    missing: [],
    registered: [...HANDLER_MAP.keys()],
  };
}

export { HANDLER_MAP };
