// ============================================================================
// Omni Registry — Registro único de omni adapters
// ============================================================================

import type { OmniResult } from "./index.js";

export type OmniRisk = "safe" | "elevated" | "dangerous" | "experimental";
export type OmniDomain = "script" | "assessment" | "scope" | "process" | "app" | "device";

export interface OmniContext {
  ipc: any;
  global: any;
  assessment?: any;
  app?: any;
  device?: any;
}

export interface OmniAdapterEntry {
  id: string;
  domain: OmniDomain;
  risk: OmniRisk;
  prerequisites?: string[];
  description: string;
  handler: string;
  fn: (payload: unknown, context: OmniContext) => Promise<OmniResult>;
}

const omniRegistry = new Map<string, OmniAdapterEntry>();

export function registerOmniAdapter(entry: OmniAdapterEntry): void {
  if (omniRegistry.has(entry.id)) {
    throw new Error(`Duplicate omni adapter id: ${entry.id}`);
  }
  omniRegistry.set(entry.id, entry);
}

export function getOmniAdapter(id: string): OmniAdapterEntry | undefined {
  return omniRegistry.get(id);
}

export function listOmniAdapters(): string[] {
  return Array.from(omniRegistry.keys());
}

export function getOmniAdaptersByDomain(domain: OmniDomain): string[] {
  const result: string[] = [];
  for (const [id, entry] of omniRegistry) {
    if (entry.domain === domain) {
      result.push(id);
    }
  }
  return result;
}

export function getOmniAdaptersByRisk(risk: OmniRisk): string[] {
  const result: string[] = [];
  for (const [id, entry] of omniRegistry) {
    if (entry.risk === risk) {
      result.push(id);
    }
  }
  return result;
}

export async function executeOmniAdapter(
  id: string,
  payload: unknown,
  context: OmniContext
): Promise<OmniResult> {
  const adapter = omniRegistry.get(id);
  if (!adapter) {
    return { ok: false, error: `Unknown adapter: ${id}`, code: "ADAPTER_NOT_FOUND", confidence: 0 };
  }
  return adapter.fn(payload, context);
}

// ============================================================================
// Registro de Omni Adapters
// ============================================================================

// omni.evaluate.raw - Evaluación de código JavaScript raw
registerOmniAdapter({
  id: "omni.evaluate.raw",
  domain: "script",
  risk: "dangerous",
  prerequisites: ["PT en modo runtime activo", "scriptEngine disponible"],
  description: "Ejecutar código JavaScript directamente en el motor C++ de PT via scriptEngine.evaluate()",
  handler: "evaluateExpression",
  fn: async (payload: unknown, context: OmniContext) => {
    const { code } = payload as { code: string };
    const global = context.global;
    try {
      const result = global.scriptEngine?.evaluate?.(code);
      return { ok: true, value: result, evidence: { code, result }, confidence: 1 };
    } catch (e) {
      return { ok: false, error: String(e), code: "EVAL_FAILED", confidence: 0 };
    }
  },
});

// omni.assessment.read - Lectura de assessment items
registerOmniAdapter({
  id: "omni.assessment.read",
  domain: "assessment",
  risk: "experimental",
  prerequisites: ["AssessmentModel disponible en global scope"],
  description: "Leer assessment items del Activity - valores, corrección, configuración",
  handler: "getAssessmentItem",
  fn: async (payload: unknown, context: OmniContext) => {
    const { itemId } = payload as { itemId: string };
    const assessment = context.global?.AssessmentModel;
    if (!assessment) {
      return { ok: false, error: "AssessmentModel no disponible", code: "NO_ASSESSMENT_MODEL", confidence: 0 };
    }
    try {
      const value = assessment.getAssessmentItemValue?.(itemId);
      const correct = assessment.isAssessmentItemCorrect?.(itemId);
      return {
        ok: true,
        value: { itemId, value, correct },
        evidence: { itemId, value, correct },
        confidence: correct ? 1 : 0,
      };
    } catch (e) {
      return { ok: false, error: String(e), code: "ASSESSMENT_GET_FAILED", confidence: 0 };
    }
  },
});

// omni.process.inspect - Inspeccionar procesos activos
registerOmniAdapter({
  id: "omni.process.inspect",
  domain: "process",
  risk: "dangerous",
  prerequisites: ["Device existente con CLI activo"],
  description: "Inspeccionar procesos activos de un dispositivo (Ping, WebBrowser, Terminal, Telnet, SSH, Email)",
  handler: "getProcess",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName, processName } = payload as { deviceName: string; processName?: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    if (processName) {
      try {
        const proc = dev.getProcess?.(processName);
        return { ok: true, value: proc, evidence: { name: processName, found: !!proc }, confidence: proc ? 1 : 0 };
      } catch (e) {
        return { ok: false, error: String(e), code: "PROCESS_GET_FAILED", confidence: 0 };
      }
    }

    // Escanear todos los procesos comunes
    const commonProbes = ["PingProcess", "WebBrowserProcess", "TerminalProcess", "TelnetProcess", "SshProcess", "EmailProcess"];
    const active: string[] = [];
    for (const name of commonProbes) {
      try {
        const p = dev.getProcess?.(name);
        if (p) {
          const state = (typeof p.isStopped === "function" && p.isStopped()) ? "STOPPED" : "RUNNING";
          active.push(`${name}:${state}`);
        }
      } catch {}
    }
    return { ok: true, value: active, evidence: { device: deviceName, processes: active }, confidence: 1 };
  },
});

// omni.globalscope.inspect - Acceso a globals de PT
registerOmniAdapter({
  id: "omni.globalscope.inspect",
  domain: "scope",
  risk: "dangerous",
  prerequisites: [],
  description: "Acceder a globals de PT - ipc, dprint, AssessmentModel, scriptEngine",
  handler: "accessGlobal",
  fn: async (payload: unknown, context: OmniContext) => {
    const { key, target } = payload as { key?: string; target?: string };
    if (key) {
      try {
        const value = context.global[key];
        return { ok: true, value, evidence: { key, value: typeof value }, confidence: value !== undefined ? 1 : 0 };
      } catch (e) {
        return { ok: false, error: String(e), code: "GLOBAL_ACCESS_FAILED", confidence: 0 };
      }
    }

    // Overview del global scope
    const info = {
      hasIpc: !!context.ipc,
      hasAssessmentModel: !!context.global?.AssessmentModel,
      hasScriptEngine: !!context.global?.scriptEngine,
      hasDprint: typeof context.global?.dprint === "function",
      hasPrivileged: !!context.global?.privileged,
      keys: context.ipc ? Object.keys(context.ipc).slice(0, 20) : [],
    };
    return { ok: true, value: info, evidence: info, confidence: 1 };
  },
});

// omni.environment.probe - Sondeo del entorno PT
registerOmniAdapter({
  id: "omni.environment.probe",
  domain: "app",
  risk: "safe",
  prerequisites: [],
  description: "Sondear información del entorno PT - version, workspace, archivos",
  handler: "getEnvironmentInfo",
  fn: async (_payload: unknown, context: OmniContext) => {
    const app = context.ipc?.appWindow?.();
    if (!app) return { ok: false, error: "AppWindow no disponible", code: "APP_UNAVAILABLE", confidence: 0 };
    try {
      const version = app.getVersion?.();
      const workspace = app.getActiveWorkspace?.();
      return { ok: true, value: { version, workspace }, evidence: { version }, confidence: 1 };
    } catch (e) {
      return { ok: false, error: String(e), code: "ENV_GET_FAILED", confidence: 0 };
    }
  },
});

// omni.device.serialize - Serialización de dispositivo a XML
registerOmniAdapter({
  id: "omni.device.serialize",
  domain: "device",
  risk: "elevated",
  prerequisites: ["Device debe existir"],
  description: "Serializar dispositivo a XML usando serializeToXml() o activityTreeToXml()",
  handler: "serializeDevice",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      const xml = (dev as any).serializeToXml?.() || (dev as any).activityTreeToXml?.() || "";
      return { ok: true, value: xml, evidence: { deviceName, xmlLength: xml?.length || 0 }, confidence: xml ? 1 : 0 };
    } catch (e) {
      return { ok: false, error: String(e), code: "SERIALIZE_FAILED", confidence: 0 };
    }
  },
});

// omni.device.skipboot - Bypass de booteo IOS
registerOmniAdapter({
  id: "omni.device.skipboot",
  domain: "device",
  risk: "dangerous",
  prerequisites: ["Device debe existir"],
  description: "Ejecutar device.skipBoot() para bypass del diálogo inicial IOS",
  handler: "skipBootDevice",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      (dev as any).skipBoot?.();
      return { ok: true, value: true, evidence: { deviceName, skipped: true }, confidence: 1 };
    } catch (e) {
      return { ok: false, error: String(e), code: "SKIPBOOT_FAILED", confidence: 0 };
    }
  },
});

// omni.device.mactable - Extraer tabla MAC de switch
registerOmniAdapter({
  id: "omni.device.mactable",
  domain: "device",
  risk: "dangerous",
  prerequisites: ["Device debe existir"],
  description: "Extraer tabla MAC de un switch via getMacAddressTable()",
  handler: "getMacAddressTable",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      const table = (dev as any).getMacAddressTable?.();
      const count = (table as any)?.getEntryCount?.() ?? 0;
      return {
        ok: true,
        value: { count },
        evidence: { deviceName, entryCount: count },
        confidence: count > 0 ? 1 : 0.5,
      };
    } catch (e) {
      return { ok: false, error: String(e), code: "MACTABLE_FAILED", confidence: 0 };
    }
  },
});

// omni.device.arp - Extraer tabla ARP
registerOmniAdapter({
  id: "omni.device.arp",
  domain: "device",
  risk: "dangerous",
  prerequisites: ["Device debe existir"],
  description: "Extraer tabla ARP de un dispositivo via getArpTable()",
  handler: "getArpTable",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      const table = (dev as any).getArpTable?.();
      return { ok: true, value: table, evidence: { deviceName, found: !!table }, confidence: table ? 1 : 0 };
    } catch (e) {
      return { ok: false, error: String(e), code: "ARP_FAILED", confidence: 0 };
    }
  },
});

// omni.device.routing - Extraer tabla de enrutamiento
registerOmniAdapter({
  id: "omni.device.routing",
  domain: "device",
  risk: "dangerous",
  prerequisites: ["Device debe existir"],
  description: "Extraer tabla de enrutamiento via getRoutingTable()",
  handler: "getRoutingTable",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      const table = (dev as any).getRoutingTable?.();
      return { ok: true, value: table, evidence: { deviceName, found: !!table }, confidence: table ? 1 : 0 };
    } catch (e) {
      return { ok: false, error: String(e), code: "ROUTING_FAILED", confidence: 0 };
    }
  },
});

// omni.port.inspect - Inspeccionar puerto físico (LED, BIA, OSPF, ACL)
registerOmniAdapter({
  id: "omni.port.inspect",
  domain: "device",
  risk: "dangerous",
  prerequisites: ["Device y puerto deben existir"],
  description: "Inspeccionar propiedades físicas de puerto - LED status, BIA, OSPF intervals, ACL applied",
  handler: "inspectPort",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName, portName } = payload as { deviceName: string; portName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    const port = (dev as any).getPort?.(portName) || (dev as any).getPortAt?.(portName);
    if (!port) return { ok: false, error: `Port not found: ${portName}`, code: "PORT_NOT_FOUND", confidence: 0 };

    try {
      const lightStatus = (port as any).getLightStatus?.();
      const bia = (port as any).getBia?.();
      const ospfHello = (port as any).getOspfHelloInterval?.();
      const ospfDead = (port as any).getOspfDeadInterval?.();
      const ospfCost = (port as any).getOspfCost?.();
      const aclIn = (port as any).getAclInID?.();
      const aclOut = (port as any).getAclOutID?.();

      return {
        ok: true,
        value: { lightStatus, bia, ospfHello, ospfDead, ospfCost, aclIn, aclOut },
        evidence: { deviceName, portName, lightStatus, hasOspf: ospfHello != null, hasAcl: aclIn != null || aclOut != null },
        confidence: lightStatus !== undefined ? 1 : 0,
      };
    } catch (e) {
      return { ok: false, error: String(e), code: "PORT_INSPECT_FAILED", confidence: 0 };
    }
  },
});

// omni.simulation.forward - Avanzar simulación N frames
registerOmniAdapter({
  id: "omni.simulation.forward",
  domain: "app",
  risk: "dangerous",
  prerequisites: ["Simulation API disponible"],
  description: "Avanzar N frames de simulación para forzar convergencia (STP, ARP)",
  handler: "forwardSimulation",
  fn: async (payload: unknown, context: OmniContext) => {
    const { frames = 1 } = payload as { frames?: number };
    const sim = context.ipc?.simulation?.();
    if (!sim) return { ok: false, error: "Simulation API no disponible", code: "SIM_UNAVAILABLE", confidence: 0 };

    try {
      const simMode = (sim as any).isSimulationMode?.() ?? false;
      if (!simMode) (sim as any).setSimulationMode?.(true);
      for (let i = 0; i < frames; i++) (sim as any).forward?.();
      if (!simMode) (sim as any).setSimulationMode?.(false);
      return { ok: true, value: { framesAdvanced: frames }, evidence: { frames }, confidence: 1 };
    } catch (e) {
      return { ok: false, error: String(e), code: "SIM_FORWARD_FAILED", confidence: 0 };
    }
  },
});

// omni.workspace.delete - Borrar dispositivo por referencia (bypass de nombres)
registerOmniAdapter({
  id: "omni.workspace.delete",
  domain: "app",
  risk: "dangerous",
  prerequisites: ["LogicalWorkspace disponible"],
  description: "Borrar dispositivo por referencia de objeto usando w.deleteDevice() - bypass de nombres duplicados",
  handler: "deleteDeviceByRef",
  fn: async (payload: unknown, context: OmniContext) => {
    const { deviceName } = payload as { deviceName: string };
    const net = context.ipc?.network?.();
    if (!net) return { ok: false, error: "IPC network no disponible", code: "IPC_UNAVAILABLE", confidence: 0 };

    const dev = net.getDevice?.(deviceName);
    if (!dev) return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND", confidence: 0 };

    try {
      const workspace = context.global?.appWindow?.()?.getActiveWorkspace?.();
      const lw = workspace?.getLogicalWorkspace?.();
      const deleted = (lw as any)?.deleteDevice?.(dev) ?? false;
      if (!deleted) {
        net.removeDevice?.(deviceName);
      }
      return { ok: true, value: { deleted: true }, evidence: { deviceName }, confidence: 1 };
    } catch (e) {
      return { ok: false, error: String(e), code: "DELETE_FAILED", confidence: 0 };
    }
  },
});