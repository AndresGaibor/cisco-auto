// ============================================================================
// Control Composition Root - Punto único de composición de dependencias
// ============================================================================
// Construye y cablea todas las dependencias de pt-control.
// La CLI usa este módulo para obtener instancias concretas de adapters y ports.

// Adapters reales
import { RuntimePrimitiveAdapter } from "../../adapters/runtime-primitive-adapter";
import { createRuntimeTerminalAdapter } from "../../adapters/runtime-terminal-adapter";
import { RuntimeOmniAdapter } from "../../adapters/runtime-omni-adapter";

// Puertos (contratos)
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port";
import type { RuntimeOmniPort } from "../../ports/runtime-omni-port";

// Orchestrator
import {
  createOrchestrator,
  type OrchestratorContext,
  type OrchestratorConfig,
} from "../orchestration/index";

// Puerto del bridge - la implementación concreta viene de pt-runtime
import type { FileBridgePort } from "../ports/file-bridge.port";

// ============================================================================
// Infraestructura y servicios de aplicación
// ============================================================================

import { TopologyCache } from "../../infrastructure/pt/topology-cache";
import { BridgeService } from "../../controller/bridge-service";
import { TopologyService } from "../../application/services/topology-service";
import { DeviceService } from "../../application/services/device-service";
import { IosService } from "../../application/services/ios-service";
import { CanvasService } from "../../application/services/canvas-service";
import { ControllerContextService } from "../../controller/context-service";
import { SnapshotService } from "../../controller/snapshot-service";
import { CommandTraceService } from "../../controller/command-trace-service";
import { ControllerIosService } from "../../controller/ios-service";
import { ControllerCanvasService } from "../../controller/canvas-service";
import { ControllerTopologyService } from "../../controller/topology-service";
import { OmniscienceService } from "../../application/services/omniscience-service";
import { LabService } from "../../application/services/lab-service";

// ============================================================================
// Configuration
// ============================================================================

export interface ControlCompositionConfig {
  bridge: FileBridgePort;
  defaultTimeout?: number;
  maxRetries?: number;
  enableFallback?: boolean;
}

// ============================================================================
// Composition Root
// ============================================================================

export interface ControlComposition {
  // Ports (contratos hacia el runtime de PT)
  primitivePort: RuntimePrimitivePort;
  terminalPort: RuntimeTerminalPort;
  omniPort: RuntimeOmniPort;

  // Orchestrator (orquesta Intent → Plan → Execution → Verdict)
  orchestrator: OrchestratorContext;

  // Bridge (referencia al bridge para debugging)
  bridge: FileBridgePort;

  // Infraestructura
  topologyCache: TopologyCache;
  bridgeService: BridgeService;

  // Servicios de aplicación (expuestos para el controller)
  omniscience: OmniscienceService;
  labService: LabService;
  topologyService: TopologyService;
  deviceService: DeviceService;
  iosService: IosService;
  canvasService: CanvasService;
  contextService: ControllerContextService;
  snapshotService: SnapshotService;
  commandTraceService: CommandTraceService;
  controllerIosService: ControllerIosService;
  canvasFacade: ControllerCanvasService;
  topologyFacade: ControllerTopologyService;
}

/**
 * Construye el grafo completo de dependencias de pt-control.
 *
 * Usage:
 * ```typescript
 * const composition = createControlComposition({
 *   bridge: myFileBridgeInstance,
 *   defaultTimeout: 30000,
 * });
 *
 * const { primitivePort, terminalPort, omniPort } = composition;
 * ```
 */
export function createControlComposition(
  config: ControlCompositionConfig
): ControlComposition {
  const {
    bridge,
    defaultTimeout = 30_000,
    maxRetries = 3,
    enableFallback = true,
  } = config;

  // Adapter de primitivas (device.add, link.remove, etc.)
  const primitiveAdapter = new RuntimePrimitiveAdapter(bridge);

  // Adapter de terminal (planes de comandos IOS interactivos)
  const terminalAdapter = createRuntimeTerminalAdapter({
    bridge,
    generateId: () => crypto.randomUUID(),
    defaultTimeout,
  });

  // Adapter Omni (capacidades privilegiadas del kernel de PT)
  const omniAdapter = new RuntimeOmniAdapter({ bridge });

  // Orchestrator con configuración
  const orchestratorConfig: OrchestratorConfig = {
    defaultTimeout,
    maxRetries,
    enableFallback,
  };

  const orchestrator = createOrchestrator(orchestratorConfig, bridge);

  // Infraestructura
  const topologyCache = new TopologyCache(bridge);
  const omniscience = new OmniscienceService(omniAdapter);

  const generateId = () => `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Servicios de aplicación
  const topologyService = new TopologyService(primitiveAdapter, topologyCache, generateId);
  const deviceService = new DeviceService(primitiveAdapter, topologyCache, generateId);
  const canvasService = new CanvasService(primitiveAdapter, generateId);
  const contextService = new ControllerContextService(bridge, topologyCache);
  const snapshotService = new SnapshotService(topologyService, topologyCache);
  const commandTraceService = new CommandTraceService(bridge);

  const iosService = new IosService(bridge, generateId, (d) => deviceService.inspect(d), terminalAdapter);

  // Facades del controller
  const bridgeService = new BridgeService(bridge, topologyCache);
  const controllerIosService = new ControllerIosService(iosService, deviceService);
  const topologyFacade = new ControllerTopologyService(topologyService, deviceService);
  const canvasFacade = new ControllerCanvasService(canvasService);

  const labService = new LabService(
    primitiveAdapter,
    topologyCache,
    deviceService,
    iosService,
    topologyService,
  );

  return {
    primitivePort: primitiveAdapter,
    terminalPort: terminalAdapter,
    omniPort: omniAdapter,
    orchestrator,
    bridge,
    topologyCache,
    bridgeService,
    omniscience,
    labService,
    topologyService,
    deviceService,
    iosService,
    canvasService,
    contextService,
    snapshotService,
    commandTraceService,
    controllerIosService,
    canvasFacade,
    topologyFacade,
  };
}

// ============================================================================
// Singleton para uso directo en la CLI
// ============================================================================

let _globalComposition: ControlComposition | null = null;

/**
 * Obtiene o crea la composición global.
 * Útil para la CLI que necesita acceso rápido a las dependencias.
 */
export function getGlobalComposition(): ControlComposition | null {
  return _globalComposition;
}

/**
 * Registra la composición global.
 * Debe llamarse antes de usar getGlobalComposition().
 */
export function setGlobalComposition(composition: ControlComposition): void {
  _globalComposition = composition;
}

/**
 * Crea y registra la composición global.
 */
export function bootstrapControl(config: ControlCompositionConfig): ControlComposition {
  const composition = createControlComposition(config);
  setGlobalComposition(composition);
  return composition;
}
