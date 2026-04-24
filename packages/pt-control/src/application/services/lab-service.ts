// ============================================================================
// LabService - Capa de coordinación para laboratorios PT
// Delega el parsing XML y la orquestación de escenarios a módulos especializados
// ============================================================================

import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCache } from "../../infrastructure/pt/topology-cache.js";
import type { DeviceService } from "./device-service.js";
import type { IosService } from "./ios-service.js";
import type { TopologyService } from "./topology-service.js";

import {
  LabScenarioRunner,
  type LabScenario,
  type LabVerification,
  type LabContext,
  type LabCheck,
} from "./lab-scenario-runner.js";

import {
  type XmlPort,
  type XmlModule,
  type XmlVlan,
  type XmlRoutingEntry,
  type XmlArpEntry,
  type XmlMacEntry,
  type ParsedDeviceXml,
} from "./device-xml-parser.js";

export type {
  XmlPort,
  XmlModule,
  XmlVlan,
  XmlRoutingEntry,
  XmlArpEntry,
  XmlMacEntry,
  ParsedDeviceXml,
  LabScenario,
  LabVerification,
  LabCheck,
  LabContext,
};

export { LabScenarioRunner } from "./lab-scenario-runner.js";

export class LabService {
  private readonly runner: LabScenarioRunner;

  constructor(
    _bridge: unknown,
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly topologyCache: TopologyCache,
    private readonly deviceService: DeviceService,
    private readonly iosService: IosService,
    private readonly topologyService: TopologyService,
  ) {
    this.runner = new LabScenarioRunner({
      primitivePort: primitivePort,
      topologyCache: topologyCache,
      deviceService: deviceService,
    });
  }

  /**
   * Ejecuta un escenario completo de laboratorio
   * @param scenario - Escenario a ejecutar
   * @returns Resultado de la verificación
   */
  async runScenario(scenario: LabScenario): Promise<LabVerification> {
    return this.runner.runScenario(scenario);
  }

  /**
   * Obtiene y parsea el XML de un dispositivo
   * @param deviceName - Nombre del dispositivo
   * @returns Información parseada del dispositivo o null
   */
  async inspectDeviceXml(deviceName: string): Promise<ParsedDeviceXml | null> {
    return this.runner.inspectDeviceXml(deviceName);
  }

  /**
   * Obtiene un snapshot del estado actual de la topología
   */
  async getSnapshot(): Promise<Record<string, unknown>> {
    return this.topologyCache.getSnapshot() as Record<string, unknown>;
  }
}