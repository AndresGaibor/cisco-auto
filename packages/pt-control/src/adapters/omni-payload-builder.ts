// ============================================================================
// Omni Payload Builder - Construcción de payloads para cada capability
// ============================================================================
// Extrae la lógica de construir payloads (código JavaScript) para ejecutar en el runtime PT.
// Cada función recibe un payload tipado y retorna el código a inyectar via __evaluate.

// Tipos del dominio
import type { OmniDomain, OmniRisk } from "../ports/runtime-omni-port.js";

// ============================================================================
// Definiciones de tipos de payload
// ============================================================================

export interface EvaluatePayload {
  code: string;
}

export interface AssessmentPayload {
  action: "getRunningConfig" | "getAssessmentItemValue" | "isAssessmentItemCorrect" | "getTimeElapsed" | "startPeriodicPDU";
  deviceId?: string;
  itemId?: string;
  pduId?: string;
  intervalMs?: number;
}

export interface ProcessInspectPayload {
  processName?: string;
}

export interface EnvironmentInspectPayload {
  scope?: "appWindow" | "version" | "workspace" | "fileManager";
}

export interface GlobalScopeInspectPayload {
  target?: "ipc" | "assessmentModel" | "dprint" | "scriptEngine" | "all";
}

export interface DeviceGenomaPayload {
  deviceName: string;
}

export interface DevicePortStatsPayload {
  deviceName: string;
  portName: string;
}

export interface TopologyPhysicalPayload {
  // Sin parámetros - siphonPhysicalTopology no recibe argumentos
}

export interface EnvironmentRulesPayload {
  rules: Record<string, unknown>;
}

// ============================================================================
// Registry de capabilities - metadata de cada capability
// ============================================================================

export interface OmniCapabilityDef {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  description?: string;
}

export const OMNI_CAPABILITY_REGISTRY: Record<string, OmniCapabilityDef> = {
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

/**
 * Obtiene la definición de una capability por su ID.
 * @param id - ID de la capability (ej: "omni.device.genoma")
 * @returns Definición de la capability o undefined si no existe
 */
export function getCapabilityDef(id: string): OmniCapabilityDef | undefined {
  return OMNI_CAPABILITY_REGISTRY[id];
}

/**
 * Lista todos los IDs de capabilities disponibles.
 * @returns Array de IDs de capabilities
 */
export function listCapabilityIds(): string[] {
  return Object.keys(OMNI_CAPABILITY_REGISTRY);
}

// ============================================================================
// Funciones de construcción de código por capability
// ============================================================================

/**
 * Construye el código JavaScript para capability evaluate.
 * @param payload - Payload con el código a ejecutar
 * @returns Código JavaScript a inyectar
 */
export function buildEvaluateCode(payload: EvaluatePayload): string {
  return payload.code;
}

/**
 * Construye el código JavaScript para capability assessment.
 * @param payload - Payload con la acción y parámetros
 * @returns Código JavaScript a inyectar
 * @throws Error si la acción no es válida
 */
export function buildAssessmentCode(payload: AssessmentPayload): string {
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

/**
 * Construye el código JavaScript para capability process.inspect.
 * @param payload - Payload con nombre de proceso opcional
 * @returns Código JavaScript a inyectar
 */
export function buildProcessInspectCode(payload: ProcessInspectPayload): string {
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

/**
 * Construye el código JavaScript para capability environment.inspect.
 * @param payload - Payload con el scope a inspeccionar
 * @returns Código JavaScript a inyectar
 */
export function buildEnvironmentInspectCode(payload: EnvironmentInspectPayload): string {
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

/**
 * Construye el código JavaScript para capability globalscope.inspect.
 * @param payload - Payload con el target a inspeccionar
 * @returns Código JavaScript a inyectar
 */
export function buildGlobalScopeInspectCode(payload: GlobalScopeInspectPayload): string {
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
// Funciones de construcción de payloads para el bridge
// ============================================================================

/**
 * Payload para enviar al bridge para evaluate.
 */
export function buildEvaluatePayload(payload: EvaluatePayload): { code: string } {
  return { code: payload.code };
}

/**
 * Payload para enviar al bridge para getNetworkGenoma.
 */
export function buildDeviceGenomaPayload(payload: DeviceGenomaPayload): { deviceName: string } {
  return { deviceName: payload.deviceName };
}

/**
 * Payload para enviar al bridge para getPortDeepStats.
 */
export function buildDevicePortStatsPayload(payload: DevicePortStatsPayload): { deviceName: string; portName: string } {
  return { deviceName: payload.deviceName, portName: payload.portName };
}

/**
 * Payload para enviar al bridge para siphonPhysicalTopology (vacío).
 */
export function buildTopologyPhysicalPayload(_payload: TopologyPhysicalPayload): Record<string, unknown> {
  return {};
}

/**
 * Payload para enviar al bridge para setEnvironmentRules.
 */
export function buildEnvironmentRulesPayload(payload: EnvironmentRulesPayload): Record<string, unknown> {
  return payload.rules;
}

/**
 * Payload genérico para evaluar código arbitrario.
 */
export function buildEvaluateArbitraryPayload(code: string): { code: string } {
  return { code };
}