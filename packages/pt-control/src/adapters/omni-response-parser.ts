// ============================================================================
// Omni Response Parser - Parsing de respuestas del runtime
// ============================================================================
// Extrae la lógica de parsear respuestas del bridge PT.
// Convierte respuestas crudas en estructuras tipadas con metadata adicional.

// Tipos del dominio
import type { OmniPortResult } from "../ports/runtime-omni-port.js";

// Tipos internos del bridge
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

// Tipos del payload builder
import type { AssessmentPayload } from "./omni-payload-builder.js";

// ============================================================================
// Tipos internos del parser
// ============================================================================

interface BridgeResponse<T = unknown> {
  ok: boolean;
  value?: { result?: T };
  error?: {
    message?: string;
    code?: string;
  };
}

interface DeviceListEntry {
  name: string;
  model: string;
}

interface EnvironmentInspectScope {
  scope?: string;
}

interface GlobalScopeInspectTarget {
  target?: string;
}

// ============================================================================
// Funciones de parsing de respuestas
// ============================================================================

/**
 * Crea un OmniPortResult estándar desde una respuesta del bridge.
 * @param res - Respuesta cruda del bridge
 * @returns OmniPortResult formateado
 */
export function parseStandardResponse<T>(res: BridgeResponse<T>): OmniPortResult {
  return {
    ok: res.ok,
    value: res.value?.result,
    error: res.error?.message,
    code: res.error?.code,
    evidence: { rawResponse: res },
    confidence: res.ok ? 1.0 : 0.0,
  };
}

/**
 * Crea un OmniPortResult con evidence adicional.
 * @param res - Respuesta cruda del bridge
 * @param additionalEvidence - Evidence adicional a incluir
 * @returns OmniPortResult formateado
 */
export function parseResponseWithEvidence<T>(
  res: BridgeResponse<T>,
  additionalEvidence: Record<string, unknown>
): OmniPortResult {
  return {
    ok: res.ok,
    value: res.value?.result,
    error: res.error?.message,
    code: res.error?.code,
    evidence: { rawResponse: res, ...additionalEvidence },
    confidence: res.ok ? 1.0 : 0.0,
  };
}

/**
 * Parsea respuesta de process.inspect.
 * Convierte formato "Device1[Model]|Device2[Model]" a array de objetos.
 * @param rawValue - Valor crudo de la respuesta
 * @returns Valor parseado o valor original si no es parseable
 */
export function parseProcessInspectResponse(rawValue: unknown): unknown {
  if (typeof rawValue === "string" && rawValue.includes("|")) {
    return rawValue.split("|").map((d: string) => {
      const idx = d.indexOf("[");
      const idx2 = d.indexOf("]");
      if (idx > 0 && idx2 > idx) {
        return { name: d.slice(0, idx), model: d.slice(idx + 1, idx2) };
      }
      return { name: d, model: "unknown" };
    });
  }
  return rawValue;
}

/**
 * Parsea respuesta de environment.inspect.
 * Intenta parsear JSON si el valor es string.
 * @param rawValue - Valor crudo de la respuesta
 * @returns Valorparseado o valor original
 */
export function parseEnvironmentInspectResponse(rawValue: unknown): unknown {
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

/**
 * Parsea respuesta de globalscope.inspect.
 * Intenta parsear JSON si el valor es string.
 * @param rawValue - Valor crudo de la respuesta
 * @returns Valor parseado o valor original
 */
export function parseGlobalScopeInspectResponse(rawValue: unknown): unknown {
  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

// ============================================================================
// Ejecutores helper - encapsulan llamada al bridge + parsing
// ============================================================================

/**
 * Ejecuta un comando en el bridge y parsea la respuesta estándar.
 * @param bridge - Puerto del bridge
 * @param command - Nombre del comando
 * @param payload - Payload a enviar
 * @param timeoutMs - Timeout en milisegundos
 * @returns OmniPortResult formateado
 */
export async function executeAndParse<T>(
  bridge: FileBridgePort,
  command: string,
  payload: unknown,
  timeoutMs: number
): Promise<OmniPortResult> {
  const res = await bridge.sendCommandAndWait<{ result?: unknown }>(command, payload, timeoutMs);
  return parseStandardResponse(res);
}

/**
 * Ejecuta código arbitrario via __evaluate y parsea respuesta.
 * @param bridge - Puerto del bridge
 * @param code - Código JavaScript a ejecutar
 * @param timeoutMs - Timeout en milisegundos
 * @returns OmniPortResult formateado
 */
export async function executeCodeAndParse(
  bridge: FileBridgePort,
  code: string,
  timeoutMs: number
): Promise<OmniPortResult> {
  const res = await bridge.sendCommandAndWait<{ result?: unknown }>(
    "__evaluate",
    { code },
    timeoutMs
  );
  return parseStandardResponse(res);
}

/**
 * Ejecuta código arbitrario con evidence adicional.
 * @param bridge - Puerto del bridge
 * @param code - Código JavaScript a ejecutar
 * @param evidence - Evidence adicional
 * @param timeoutMs - Timeout en milisegundos
 * @returns OmniPortResult formateado
 */
export async function executeCodeWithEvidence(
  bridge: FileBridgePort,
  code: string,
  evidence: Record<string, unknown>,
  timeoutMs: number
): Promise<OmniPortResult> {
  const res = await bridge.sendCommandAndWait<{ result?: unknown }>(
    "__evaluate",
    { code },
    timeoutMs
  );
  return parseResponseWithEvidence(res, evidence);
}

/**
 * Ejecuta evaluación y parsea con parsing de JSON automático.
 * @param bridge - Puerto del bridge
 * @param code - Código JavaScript a ejecutar
 * @param parseJson - Si es true, intenta parsear JSON
 * @param timeoutMs - Timeout en milisegundos
 * @returns OmniPortResult formateado
 */
export async function executeAndParseJson(
  bridge: FileBridgePort,
  code: string,
  parseJson: boolean,
  timeoutMs: number
): Promise<OmniPortResult> {
  const res = await bridge.sendCommandAndWait<{ result?: unknown }>(
    "__evaluate",
    { code },
    timeoutMs
  );

  let parsedValue = res.value?.result;
  if (parseJson && typeof parsedValue === "string") {
    try {
      parsedValue = JSON.parse(parsedValue);
    } catch {
      // No era JSON, usar string raw
    }
  }

  return {
    ok: res.ok,
    value: parsedValue,
    error: res.error?.message,
    code: res.error?.code,
    evidence: { rawResponse: res },
    confidence: res.ok ? 1.0 : 0.0,
  };
}

// ============================================================================
// Validaciones de payloads
// ============================================================================

/**
 * Valida que el payload contenga código válido.
 * @param payload - Payload a validar
 * @returns true si es válido, false otherwise
 */
export function isValidEvaluatePayload(payload: unknown): payload is { code: string } {
  return typeof payload === "object" && payload !== null && "code" in payload && typeof (payload as { code: unknown }).code === "string";
}

/**
 * Valida que el payload contenga deviceName.
 * @param payload - Payload a validar
 * @returns true si es válido, false otherwise
 */
export function isValidDeviceNamePayload(payload: unknown): payload is { deviceName: string } {
  return typeof payload === "object" && payload !== null && "deviceName" in payload && typeof (payload as { deviceName: unknown }).deviceName === "string";
}

/**
 * Valida que el payload contenga deviceName y portName.
 * @param payload - Payload a validar
 * @returns true si es válido, false otherwise
 */
export function isValidPortStatsPayload(payload: unknown): payload is { deviceName: string; portName: string } {
  return isValidDeviceNamePayload(payload) && "portName" in payload && typeof (payload as { portName: unknown }).portName === "string";
}

/**
 * Valida que el payload contenga rules.
 * @param payload - Payload a validar
 * @returns true si es válido, false otherwise
 */
export function isValidRulesPayload(payload: unknown): payload is { rules: Record<string, unknown> } {
  return typeof payload === "object" && payload !== null && "rules" in payload && typeof (payload as { rules: unknown }).rules === "object";
}

/**
 * Valida que el payload contenga action para assessment.
 * @param payload - Payload a validar
 * @returns true si es válido, false otherwise
 */
export function isValidAssessmentPayload(payload: unknown): payload is { action: string } {
  return typeof payload === "object" && payload !== null && "action" in payload && typeof (payload as { action: unknown }).action === "string";
}

/**
 * Valida que el payload contenga action válida para assessment.
 * @param payload - Payload a validar
 * @returns true si la acción es válida, false otherwise
 */
export function isValidAssessmentAction(action: unknown): action is AssessmentPayload["action"] {
  return (
    typeof action === "string" &&
    ["getRunningConfig", "getAssessmentItemValue", "isAssessmentItemCorrect", "getTimeElapsed", "startPeriodicPDU"].includes(action)
  );
}

// ============================================================================
// Constructores de errores
// ============================================================================

/**
 * Crea un OmniPortResult de error por payload inválido.
 * @param message - Mensaje de error
 * @returns OmniPortResult de error
 */
export function createInvalidPayloadError(message: string): OmniPortResult {
  return {
    ok: false,
    error: message,
    code: "INVALID_PAYLOAD",
    confidence: 0,
  };
}

/**
 * Crea un OmniPortResult de error genérico.
 * @param error - Error o mensaje de error
 * @returns OmniPortResult de error
 */
export function createExecutionError(error: unknown): OmniPortResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    ok: false,
    error: errorMessage,
    code: "OMNI_EXECUTION_ERROR",
    confidence: 0,
  };
}

/**
 * Crea un OmniPortResult para capability desconocida.
 * @param id - ID de capability
 * @returns OmniPortResult de error
 */
export function createUnknownCapabilityError(id: string): OmniPortResult {
  return {
    ok: false,
    error: `Unknown capability id: ${id}`,
    code: "UNKNOWN_CAPABILITY",
    confidence: 0,
  };
}