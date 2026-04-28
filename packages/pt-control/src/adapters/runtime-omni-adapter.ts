// ============================================================================
// Runtime Omni Adapter - Canal único para hacks de Packet Tracer
// ============================================================================
// Conecta con los hacks reales del runtime via bridge.sendCommandAndWait.
// NO decide política de riesgo ni fallback - eso vive en el orchestrator.
// Solo: recibir capability + parámetros, ejecutar, mapear metadata, preservar evidence.

// Tipos del puerto
import type {
  OmniPortOptions,
  OmniPortResult,
  OmniCapabilityMetadata,
  OmniRisk,
  OmniDomain,
} from "../ports/runtime-omni-port.js";

// Bridge para comunicar con PT
import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

// Módulos extraídos
import {
  getCapabilityDef,
  OMNI_CAPABILITY_REGISTRY,
  type EvaluatePayload,
  type AssessmentPayload,
  type ProcessInspectPayload,
  type EnvironmentInspectPayload,
  type GlobalScopeInspectPayload,
  type DeviceGenomaPayload,
  type DevicePortStatsPayload,
  type EnvironmentRulesPayload,
  buildEvaluateCode,
  buildAssessmentCode,
  buildProcessInspectCode,
  buildEnvironmentInspectCode,
  buildGlobalScopeInspectCode,
  buildEvaluatePayload,
  buildDeviceGenomaPayload,
  buildDevicePortStatsPayload,
  buildTopologyPhysicalPayload,
  buildEnvironmentRulesPayload,
  buildEvaluateArbitraryPayload,
} from "./omni-payload-builder.js";

// Parser de respuestas
import {
  parseStandardResponse,
  parseResponseWithEvidence,
  parseProcessInspectResponse,
  parseEnvironmentInspectResponse,
  parseGlobalScopeInspectResponse,
  executeAndParse,
  executeCodeAndParse,
  executeCodeWithEvidence,
  executeAndParseJson,
  isValidEvaluatePayload,
  isValidDeviceNamePayload,
  isValidPortStatsPayload,
  isValidRulesPayload,
  isValidAssessmentPayload,
  isValidAssessmentAction,
  createInvalidPayloadError,
  createExecutionError,
  createUnknownCapabilityError,
} from "./omni-response-parser.js";

// ============================================================================
// RuntimeOmniAdapter
// ============================================================================

export interface RuntimeOmniAdapterDeps {
  bridge: FileBridgePort;
}

/**
 * Adapter para ejecutar "Omni" capabilities - hacks directos al motor C++ de Packet Tracer.
 *
 * Este adapter es el canal único para ejecutar comandos que requieren acceso profundo a PT:
 * - Acceso al AssessmentModel para verificar actividades
 * - Lectura de genomas de dispositivos (XML de configuración)
 * - Inyección de código JavaScript arbitrario via eval()
 * - Inspección de procesos y estado interno de PT
 *
 * NO valida política de riesgo ni decide fallback - eso vive en el orchestrator.
 * Solo recibe capability + parámetros, ejecuta, mapea metadata y preserva evidence.
 *
 * @example
 * ```typescript
 * const adapter = createOmniAdapter({ bridge });
 *
 * // Ejecutar capability
 * const result = await adapter.runOmniCapability("omni.device.genoma", {
 *   deviceName: "R1"
 * });
 *
 * // Ver metadata de capability
 * const meta = adapter.describeCapability("omni.evaluate.raw");
 * console.log(meta?.risk); // "dangerous"
 * ```
 */
export class RuntimeOmniAdapter {
  private readonly bridge: FileBridgePort;

  constructor(deps: RuntimeOmniAdapterDeps) {
    this.bridge = deps.bridge;
  }

  // Ejecutar capability por id
  async runOmniCapability(
    id: string,
    payload: unknown,
    options?: OmniPortOptions
  ): Promise<OmniPortResult> {
    const timeoutMs = options?.timeoutMs ?? 10000;

    try {
      const result = await this.executeByCapabilityId(id, payload, timeoutMs);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: errorMessage,
        code: "OMNI_EXECUTION_ERROR",
        confidence: 0,
      };
    }
  }

  // Describir capability (metadata)
  describeCapability(id: string): OmniCapabilityMetadata | null {
    const def = getCapabilityDef(id);
    if (!def) return null;
    return {
      id: def.id,
      domain: def.domain,
      risk: def.risk,
      prerequisites: def.prerequisites,
      description: def.description,
    };
  }

  // Cleanup - no hay recursos persistentes en estos hacks
  async cleanupCapability(_id: string): Promise<void> {
    // Los hacks son stateless, no hay cleanup necesario
  }

  // ============================================================================
  // Ejecución interna por tipo de capability
  // ============================================================================

  private async executeByCapabilityId(
    id: string,
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    switch (id) {
      case "omni.evaluate.raw":
        return this.executeEvaluate(payload, timeoutMs);
      case "omni.device.genoma":
        return this.executeDeviceGenoma(payload, timeoutMs);
      case "omni.device.portStats":
        return this.executeDevicePortStats(payload, timeoutMs);
      case "omni.topology.physical":
        return this.executeTopologyPhysical(payload, timeoutMs);
      case "omni.environment.rules":
        return this.executeEnvironmentRules(payload, timeoutMs);
      case "omni.assessment.read":
        return this.executeAssessment(payload, timeoutMs);
      case "omni.process.inspect":
        return this.executeProcessInspect(payload, timeoutMs);
      case "omni.environment.inspect":
        return this.executeEnvironmentInspect(payload, timeoutMs);
      case "omni.globalscope.inspect":
        return this.executeGlobalScopeInspect(payload, timeoutMs);
      default:
        return {
          ok: false,
          error: `Unknown capability id: ${id}`,
          code: "UNKNOWN_CAPABILITY",
          confidence: 0,
        };
    }
  }

  private async executeEvaluate(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    if (!isValidEvaluatePayload(payload)) {
      return createInvalidPayloadError("Payload debe contener 'code' (string)");
    }

    return executeAndParse(this.bridge, "omni.evaluate.raw", buildEvaluatePayload(payload), timeoutMs);
  }

  private async executeDeviceGenoma(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    if (!isValidDeviceNamePayload(payload)) {
      return createInvalidPayloadError("Payload debe contener 'deviceName' (string)");
    }

    return executeAndParse(
      this.bridge,
      "getNetworkGenoma",
      buildDeviceGenomaPayload(payload),
      timeoutMs
    );
  }

  private async executeDevicePortStats(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    if (!isValidPortStatsPayload(payload)) {
      return createInvalidPayloadError(
        "Payload debe contener 'deviceName' (string) y 'portName' (string)"
      );
    }

    return executeAndParse(
      this.bridge,
      "getPortDeepStats",
      buildDevicePortStatsPayload(payload),
      timeoutMs
    );
  }

  private async executeTopologyPhysical(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    return executeAndParse(
      this.bridge,
      "siphonPhysicalTopology",
      buildTopologyPhysicalPayload(payload as {  }),
      timeoutMs
    );
  }

  private async executeEnvironmentRules(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    if (!isValidRulesPayload(payload)) {
      return createInvalidPayloadError("Payload debe contener 'rules' (object)");
    }

    return executeAndParse(
      this.bridge,
      "setEnvironmentRules",
      buildEnvironmentRulesPayload(payload),
      timeoutMs
    );
  }

  private async executeAssessment(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    if (!isValidAssessmentPayload(payload) || !isValidAssessmentAction(payload.action)) {
      return createInvalidPayloadError("Payload debe contener 'action' válida");
    }

    let code: string;
    try {
      code = buildAssessmentCode(payload as AssessmentPayload);
    } catch (err) {
      return createExecutionError(err);
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "omni.evaluate.raw",
      { code },
      timeoutMs
    );

    return parseResponseWithEvidence(res, { assessmentAction: payload.action });
  }

  private async executeProcessInspect(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const code = buildProcessInspectCode(payload as ProcessInspectPayload);
    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "omni.evaluate.raw",
      { code },
      timeoutMs
    );

    const parsedValue = parseProcessInspectResponse(res.value?.result);

    return {
      ok: res.ok,
      value: parsedValue,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeEnvironmentInspect(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const code = buildEnvironmentInspectCode(payload as EnvironmentInspectPayload);
    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "omni.evaluate.raw",
      { code },
      timeoutMs
    );

    const parsedValue = parseEnvironmentInspectResponse(res.value?.result);

    return {
      ok: res.ok,
      value: parsedValue,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res, inspectScope: (payload as EnvironmentInspectPayload).scope ?? "appWindow" },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeGlobalScopeInspect(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const code = buildGlobalScopeInspectCode(payload as GlobalScopeInspectPayload);
    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "omni.evaluate.raw",
      { code },
      timeoutMs
    );

    const parsedValue = parseGlobalScopeInspectResponse(res.value?.result);

    return {
      ok: res.ok,
      value: parsedValue,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res, inspectTarget: (payload as GlobalScopeInspectPayload).target ?? "all" },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }
}

// ============================================================================
// Factory function - para mantener el patrón del proyecto
// ============================================================================

export function createOmniAdapter(deps: RuntimeOmniAdapterDeps): RuntimeOmniAdapter {
  return new RuntimeOmniAdapter(deps);
}
