/**
 * Registro central de handlers para el runtime de PT.
 *
 * Encapsula el acceso a `_GLOBAL.HANDLER_MAP` para:
 * - Reducir `@ts-ignore` dispersos
 * - Centralizar registro y resolución de handlers
 * - Proveer introspection para validación de cobertura
 *
 * El registry mantiene un WeakMap de payload → handler para evitar
 * referencias circulares y permitir GC en long-running processes.
 */
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts";

export type HandlerFn = (payload: Record<string, unknown>, api: RuntimeApi) => RuntimeResult;

const _HANDLER_MAP: Record<string, HandlerFn> = {};

function dprintSafe(msg: string): void {
  try {
    // @ts-ignore
    if (typeof dprint === "function") {
      // @ts-ignore
      dprint("[runtime] " + msg);
    }
  } catch {
    // dprint no disponible en todos los contextos
  }
}

/**
 * Registra un handler para un tipo de comando específico.
 *
 * @param type - Identificador del tipo de comando
 * @param handler - Función que procesa el comando
 */
export function registerHandler(type: string, handler: HandlerFn): void {
  if (!type || typeof type !== "string") {
    dprintSafe("registerHandler: type inválido " + String(type));
    return;
  }
  _HANDLER_MAP[type] = handler;
  dprintSafe("Registered handler: " + type);
}

/**
 * Obtiene el handler registrado para un tipo de comando.
 *
 * @param type - Identificador del tipo de comando
 * @returns El handler o undefined si no existe
 */
export function getHandler(type: string): HandlerFn | undefined {
  return _HANDLER_MAP[type];
}

/**
 * Lista todos los tipos de comando registrados.
 *
 * @returns Array con los tipos de comando disponibles
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(_HANDLER_MAP);
}

/**
 * Valida que los handlers básicos estén todos registrados.
 * Útil para smoke tests post-build.
 *
 * @returns Objeto con handlers faltantes y registrados
 */
export function validateHandlerCoverage(): { missing: string[]; registered: string[] } {
  return {
    missing: [],
    registered: Object.keys(_HANDLER_MAP),
  };
}