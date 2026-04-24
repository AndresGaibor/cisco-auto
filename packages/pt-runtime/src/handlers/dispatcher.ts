/**
 * Dispatcher del runtime de PT.
 *
 * Recibe payloads con `type` y los rutea al handler registrado en el registry.
 * El registry encapsula el acceso a `_GLOBAL.HANDLER_MAP` para reducir
 * `@ts-ignore` dispersos y mejorar la seguridad de tipos.
 *
 * Comandos soportados:
 * - addDevice, removeDevice, renameDevice, moveDevice
 * - listDevices, inspect, snapshot
 * - addLink, removeLink
 * - setDeviceIp, setDefaultGateway
 * - configIos, execIos
 * - ensureVlans, configVlanInterfaces
 * - configDhcpServer, inspectDhcpServer
 * - deepInspect, __evaluate
 * - Y ~40 comandos más de omniscience y canvas
 */
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";
import {
  registerHandler,
  getHandler,
  getRegisteredTypes,
  validateHandlerCoverage,
  type HandlerFn,
} from "./handler-registry.js";

export type { HandlerFn };
export { registerHandler, getHandler, getRegisteredTypes, validateHandlerCoverage };

/**
 * Alias para backward compatibility.
 * El registry encapsula el map internamente; este es solo para consumers
 * que dependen de la referencia pública al mapa de handlers.
 * @deprecated Use registerHandler/getHandler en vez de mutar HANDLER_MAP directo
 */
export { getRegisteredTypes as HANDLER_MAP };

/**
 * Función de dispatch principal del runtime.
 *
 * @param payload - Objeto con tipo y datos del comando. Debe tener `payload.type` como string.
 * @param api - RuntimeApi con acceso a IPC, device registry, y utilidades.
 * @returns RuntimeResult con ok=true (éxito), ok=false con error, o deferred para jobs largos.
 *
 * @example
 * runtimeDispatcher({ type: "listDevices" }, api)
 * // → { ok: true, devices: [...], count: 5 }
 *
 * @example
 * runtimeDispatcher({ type: "addDevice", model: "RouterFalso" }, api)
 * // → { ok: false, error: "Unknown model", code: "INVALID_MODEL" }
 */
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

  const handler = getHandler(type);
  api.dprint("[runtime:" + type + "] handler=" + (handler ? "found" : "NOT_FOUND"));

  if (!handler) {
    return {
      ok: false,
      error: "Unknown command type: " + type,
      code: "UNKNOWN_COMMAND",
      source: "synthetic",
    } as RuntimeResult;
  }

  try {
    const result = handler(payload, api);
    if (result && typeof (result as unknown as { then: unknown }).then === "function") {
      api.dprint(`[runtime:${type}] result is PROMISE (async handler)`);
      return result;
    }
    const isDeferred = result && "deferred" in result && (result as { deferred?: boolean }).deferred === true;
    api.dprint(`[runtime:${type}] result ok=${result ? result.ok : "null"} deferred=${isDeferred}`);
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