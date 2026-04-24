// ============================================================================
// LabScenarioRunner - Orquestación de escenarios de laboratorio PT
// Ejecuta el ciclo Setup → Action → Verify → Cleanup con snapshots
// ============================================================================

import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCache } from "../../infrastructure/pt/topology-cache.js";
import type { DeviceService } from "./device-service.js";
import type { ParsedDeviceXml } from "./device-xml-parser.js";

/**
 * Escenario de laboratorio con fases de setup, acción, verificación y cleanup
 */
export interface LabScenario {
  id: string;
  name: string;
  description: string;
  setup: (ctx: LabContext) => Promise<void>;
  action: (ctx: LabContext) => Promise<void>;
  verify: (ctx: LabContext) => Promise<LabVerification>;
  cleanup: (ctx: LabContext) => Promise<void>;
}

/**
 * Verificación individual dentro de un escenario
 */
export interface LabCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  message?: string;
}

/**
 * Resultado de la verificación de un escenario
 */
export interface LabVerification {
  ok: boolean;
  scenarioId: string;
  checks: LabCheck[];
  evidence: Record<string, unknown>;
  errors: string[];
  durationMs: number;
}

/**
 * Contexto compartido entre las fases del escenario
 */
export interface LabContext {
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  deviceXml?: Record<string, ParsedDeviceXml>;
}

/**
 * Contexto requerido por el runner para ejecutar escenarios
 */
export interface LabScenarioRunnerContext {
  primitivePort: RuntimePrimitivePort;
  topologyCache: TopologyCache;
  deviceService: DeviceService;
}

/**
 * Runner de escenarios de laboratorio
 * Maneja la ejecución del ciclo de vida completo: setup → action → verify → cleanup
 */
export class LabScenarioRunner {
  private readonly primitivePort: RuntimePrimitivePort;
  private readonly topologyCache: TopologyCache;
  private readonly deviceService: DeviceService;

  constructor(ctx: LabScenarioRunnerContext) {
    this.primitivePort = ctx.primitivePort;
    this.topologyCache = ctx.topologyCache;
    this.deviceService = ctx.deviceService;
  }

  /**
   * Ejecuta un escenario completo de laboratorio
   * Ciclo: snapshot before → setup → action → verify → cleanup → snapshot after
   * @param scenario - Escenario a ejecutar
   * @returns Resultado de la verificación del escenario
   */
  async runScenario(scenario: LabScenario): Promise<LabVerification> {
    const inicio = Date.now();
    const errors: string[] = [];
    const checks: LabCheck[] = [];
    const evidence: Record<string, unknown> = {};

    const contexto: LabContext = {};

    try {
      contexto.snapshotBefore = await this.getSnapshot();
      await scenario.setup(contexto);
      await scenario.action(contexto);
      const verificacion = await scenario.verify(contexto);
      checks.push(...verificacion.checks);
      Object.assign(evidence, verificacion.evidence);
      if (verificacion.errors.length > 0) {
        errors.push(...verificacion.errors);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    } finally {
      try {
        await scenario.cleanup(contexto);
      } catch (e) {
        errors.push(`Cleanup error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    contexto.snapshotAfter = await this.getSnapshot();
    const duracionMs = Date.now() - inicio;

    return {
      ok: errors.length === 0 && checks.every((c) => c.passed),
      scenarioId: scenario.id,
      checks,
      evidence,
      errors,
      durationMs: duracionMs,
    };
  }

  /**
   * Obtiene un snapshot del estado actual de la topología
   */
  private async getSnapshot(): Promise<Record<string, unknown>> {
    return this.topologyCache.getSnapshot() as Record<string, unknown>;
  }

  /**
   * Obtiene el XML parseado de un dispositivo
   * @param deviceName - Nombre del dispositivo
   * @returns XML parseado o null si no se puede obtener
   */
  async inspectDeviceXml(deviceName: string): Promise<ParsedDeviceXml | null> {
    try {
      const estado = await this.deviceService.inspect(deviceName, true);
      if (!estado || !estado.uuid) {
        return null;
      }
      const xmlBruto = await this.obtenerXmlDispositivo(deviceName);
      if (!xmlBruto) {
        return null;
      }
      const { parseDeviceXml } = await import("./device-xml-parser.js");
      return parseDeviceXml(xmlBruto);
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el XML bruto de un dispositivo desde PT
   */
  private async obtenerXmlDispositivo(deviceName: string): Promise<string | null> {
    try {
      const resultado = await this.primitivePort.runPrimitive("device.inspect", {
        device: deviceName,
        includeXml: true,
      });
      if (!resultado.ok) {
        return null;
      }
      return (resultado.value as { xml?: string }).xml ?? null;
    } catch {
      return null;
    }
  }
}