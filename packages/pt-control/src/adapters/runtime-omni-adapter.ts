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

// ============================================================================
// Metadata de capabilities - risk/prereqs/description
// ============================================================================

interface CapabilityDef {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  description?: string;
}

const CAPABILITY_REGISTRY: Record<string, CapabilityDef> = {
  "omni.evaluate.raw": {
    id: "omni.evaluate.raw",
    domain: "script",
    risk: "dangerous",
    prerequisites: ["PT en modo runtime activo"],
    description: "Ejecutar JavaScript raw en el motor C++ de Packet Tracer via eval()",
  },
  "omni.device.genoma": {
    id: "omni.device.genoma",
    domain: "device",
    risk: "elevated",
    prerequisites: ["Runtime activo"],
    description: "Obtener el genoma (XML de configuración) de un dispositivo",
  },
  "omni.device.portStats": {
    id: "omni.device.portStats",
    domain: "device",
    risk: "elevated",
    prerequisites: ["Runtime activo"],
    description: "Obtener estadísticas profundas de un puerto específico",
  },
  "omni.topology.physical": {
    id: "omni.topology.physical",
    domain: "scope",
    risk: "elevated",
    prerequisites: ["Runtime activo"],
    description: "Extraer topología física de la red (enlaces entre dispositivos)",
  },
  "omni.environment.rules": {
    id: "omni.environment.rules",
    domain: "app",
    risk: "experimental",
    prerequisites: ["Runtime activo"],
    description: "Configurar reglas de entorno de Packet Tracer",
  },
  "omni.assessment.read": {
    id: "omni.assessment.read",
    domain: "assessment",
    risk: "elevated",
    prerequisites: ["Simulation mode o runtime activo"],
    description: "Leer assessment model - configuraciones, estados, PDU info",
  },
  "omni.process.inspect": {
    id: "omni.process.inspect",
    domain: "process",
    risk: "elevated",
    prerequisites: ["Runtime activo"],
    description: "Inspeccionar procesos activos en Packet Tracer",
  },
  "omni.environment.inspect": {
    id: "omni.environment.inspect",
    domain: "app",
    risk: "safe",
    prerequisites: [],
    description: "Inspeccionar entorno PT - version, workspace, archivos",
  },
  "omni.globalscope.inspect": {
    id: "omni.globalscope.inspect",
    domain: "scope",
    risk: "elevated",
    prerequisites: ["Runtime activo"],
    description: "Inspeccionar global scope - ipc, dprint, AssessmentModel, etc.",
  },
};

// ============================================================================
// Tipos internos del adapter
// ============================================================================

interface EvaluatePayload {
  code: string;
}

interface AssessmentPayload {
  action: "getRunningConfig" | "getAssessmentItemValue" | "isAssessmentItemCorrect" | "getTimeElapsed" | "startPeriodicPDU";
  deviceId?: string;
  itemId?: string;
  pduId?: string;
  intervalMs?: number;
}

interface ProcessInspectPayload {
  processName?: string;
}

interface EnvironmentInspectPayload {
  scope?: "appWindow" | "version" | "workspace" | "fileManager";
}

interface GlobalScopeInspectPayload {
  target?: "ipc" | "assessmentModel" | "dprint" | "scriptEngine" | "all";
}

interface DeviceGenomaPayload {
  deviceName: string;
}

interface DevicePortStatsPayload {
  deviceName: string;
  portName: string;
}

interface TopologyPhysicalPayload {
  // Sin parámetros - siphonPhysicalTopology no recibe argumentos
}

interface EnvironmentRulesPayload {
  rules: Record<string, unknown>;
}

// ============================================================================
// Funciones de ejecución por capability
// ============================================================================

function buildEvaluateCode(payload: EvaluatePayload): string {
  return payload.code;
}

function buildAssessmentCode(payload: AssessmentPayload): string {
  const { action, deviceId, itemId, pduId, intervalMs } = payload;
  switch (action) {
    case "getRunningConfig":
      return `global.AssessmentModel.getRunningConfig('${deviceId ?? ''}')`;
    case "getAssessmentItemValue":
      return `global.AssessmentModel.getAssessmentItemValue('${itemId ?? ''}')`;
    case "isAssessmentItemCorrect":
      return `global.AssessmentModel.isAssessmentItemCorrect('${itemId ?? ''}')`;
    case "getTimeElapsed":
      return `global.AssessmentModel.getTimeElapsed()`;
    case "startPeriodicPDU":
      return `global.AssessmentModel.startPeriodicPDU('${pduId ?? ''}', ${intervalMs ?? 1000})`;
    default:
      throw new Error(`Unknown assessment action: ${action}`);
  }
}

function buildProcessInspectCode(payload: ProcessInspectPayload): string {
  const { processName } = payload;
  if (processName) {
    return `(function() {
      var net = ipc.network();
      var devs = [];
      for (var i = 0; i < net.getDeviceCount(); i++) {
        var d = net.getDeviceAt(i);
        if (d) {
          var p = d.getProcess ? d.getProcess('${processName}') : null;
          if (p) devs.push(d.getName() + ':' + '${processName}');
        }
      }
      return devs.join(',') || 'NOT_FOUND';
    })()`;
  }
  return `(function() {
    var net = ipc.network();
    var result = [];
    for (var i = 0; i < net.getDeviceCount(); i++) {
      var d = net.getDeviceAt(i);
      if (d) result.push(d.getName() + '[' + d.getModel() + ']');
    }
    return result.join('|');
  })()`;
}

function buildEnvironmentInspectCode(payload: EnvironmentInspectPayload): string {
  const { scope } = payload ?? {};
  switch (scope) {
    case "version":
      return `ipc.appWindow().getVersion()`;
    case "workspace":
      return `(function() {
        var ws = ipc.appWindow().getActiveWorkspace();
        return JSON.stringify({
          isLogicalView: ws.isLogicalView ? ws.isLogicalView() : null,
          isGeoView: ws.isGeoView ? ws.isGeoView() : null,
          isRackView: ws.isRackView ? ws.isRackView() : null
        });
      })()`;
    case "fileManager":
      return `(function() {
        var fm = ipc.systemFileManager();
        return fm ? 'AVAILABLE' : 'UNAVAILABLE';
      })()`;
    case "appWindow":
    default:
      return `(function() {
        var aw = ipc.appWindow();
        return JSON.stringify({
          version: aw.getVersion(),
          basePath: aw.getBasePath ? aw.getBasePath() : null,
          tempFileLocation: aw.getTempFileLocation ? aw.getTempFileLocation() : null,
          userFolder: aw.getUserFolder ? aw.getUserFolder() : null,
          isPTSA: aw.isPTSA ? aw.isPTSA() : null,
          isRealtimeMode: aw.isRealtimeMode ? aw.isRealtimeMode() : null,
          isSimulationMode: aw.isSimulationMode ? aw.isSimulationMode() : null
        });
      })()`;
  }
}

function buildGlobalScopeInspectCode(payload: GlobalScopeInspectPayload): string {
  const { target } = payload ?? {};
  switch (target) {
    case "ipc":
      return `(function() {
        return Object.keys(ipc).join(',');
      })()`;
    case "assessmentModel":
      return `(function() {
        var am = global.AssessmentModel;
        return am ? 'AVAILABLE' : 'UNAVAILABLE';
      })()`;
    case "dprint":
      return `typeof dprint`;
    case "scriptEngine":
      return `(function() {
        return typeof scriptEngine !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE';
      })()`;
    case "all":
    default:
      return `(function() {
        return JSON.stringify({
          ipc: Object.keys(ipc).slice(0, 10),
          hasAssessmentModel: typeof global.AssessmentModel !== 'undefined',
          hasScriptEngine: typeof scriptEngine !== 'undefined',
          hasDprint: typeof dprint !== 'undefined',
          hasPrivileged: typeof privileged !== 'undefined'
        });
      })()`;
  }
}

// ============================================================================
// RuntimeOmniAdapter
// ============================================================================

export interface RuntimeOmniAdapterDeps {
  bridge: FileBridgePort;
}

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
    const def = CAPABILITY_REGISTRY[id];
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
    const { code } = payload as EvaluatePayload;
    if (!code || typeof code !== "string") {
      return {
        ok: false,
        error: "Payload debe contener 'code' (string)",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "__evaluate",
      { code },
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeDeviceGenoma(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const { deviceName } = payload as DeviceGenomaPayload;
    if (!deviceName || typeof deviceName !== "string") {
      return {
        ok: false,
        error: "Payload debe contener 'deviceName' (string)",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "getNetworkGenoma",
      { deviceName },
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeDevicePortStats(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const { deviceName, portName } = payload as DevicePortStatsPayload;
    if (!deviceName || typeof deviceName !== "string") {
      return {
        ok: false,
        error: "Payload debe contener 'deviceName' (string)",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }
    if (!portName || typeof portName !== "string") {
      return {
        ok: false,
        error: "Payload debe contener 'portName' (string)",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "getPortDeepStats",
      { deviceName, portName },
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeTopologyPhysical(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "siphonPhysicalTopology",
      {},
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeEnvironmentRules(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const { rules } = payload as EnvironmentRulesPayload;
    if (!rules || typeof rules !== "object") {
      return {
        ok: false,
        error: "Payload debe contener 'rules' (object)",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "setEnvironmentRules",
      rules,
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeAssessment(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const assessPayload = payload as AssessmentPayload;
    if (!assessPayload.action) {
      return {
        ok: false,
        error: "Payload debe contener 'action'",
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    let code: string;
    try {
      code = buildAssessmentCode(assessPayload);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        code: "INVALID_PAYLOAD",
        confidence: 0,
      };
    }

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "__evaluate",
      { code },
      timeoutMs
    );

    return {
      ok: res.ok,
      value: res.value?.result,
      error: res.error?.message,
      code: res.error?.code,
      evidence: { rawResponse: res, assessmentAction: assessPayload.action },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeProcessInspect(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const inspectPayload = payload as ProcessInspectPayload;
    const code = buildProcessInspectCode(inspectPayload);

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "__evaluate",
      { code },
      timeoutMs
    );

    const rawValue = res.value?.result;
    let parsedValue = rawValue;
    if (typeof rawValue === "string" && rawValue.includes("|")) {
      parsedValue = rawValue.split("|").map((d) => {
        const idx = d.indexOf("[");
        const idx2 = d.indexOf("]");
        if (idx > 0 && idx2 > idx) {
          return { name: d.slice(0, idx), model: d.slice(idx + 1, idx2) };
        }
        return { name: d, model: "unknown" };
      });
    }

    return {
      ok: res.ok,
      value: parsedValue ?? rawValue,
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
    const inspectPayload = (payload as EnvironmentInspectPayload) ?? {};
    const code = buildEnvironmentInspectCode(inspectPayload);

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "__evaluate",
      { code },
      timeoutMs
    );

    let parsedValue = res.value?.result;
    if (typeof parsedValue === "string") {
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
      evidence: { rawResponse: res, inspectScope: inspectPayload.scope ?? "appWindow" },
      confidence: res.ok ? 1.0 : 0.0,
    };
  }

  private async executeGlobalScopeInspect(
    payload: unknown,
    timeoutMs: number
  ): Promise<OmniPortResult> {
    const inspectPayload = (payload as GlobalScopeInspectPayload) ?? {};
    const code = buildGlobalScopeInspectCode(inspectPayload);

    const res = await this.bridge.sendCommandAndWait<{ result?: unknown }>(
      "__evaluate",
      { code },
      timeoutMs
    );

    let parsedValue = res.value?.result;
    if (typeof parsedValue === "string") {
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
      evidence: { rawResponse: res, inspectTarget: inspectPayload.target ?? "all" },
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
