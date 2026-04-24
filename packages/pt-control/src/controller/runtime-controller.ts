/**
 * RuntimeController - Controlador especializado para gestión del runtime de PT.
 *
 * Maneja la carga de runtime, diagnósticos del sistema, y recolección de basura.
 * Proporciona acceso de bajo nivel al motor de Packet Tracer.
 *
 * @example
 * ```typescript
 * const runtime = new RuntimeController(bridgeService, primitivePort);
 * await runtime.loadRuntimeFromFile("/path/to/runtime.js");
 * const health = await runtime.diagnostics();
 * await runtime.gc();
 * ```
 */

import type { RuntimePrimitivePort } from "../ports/runtime-primitive-port.js";

export class RuntimeController {
  constructor(
    private readonly bridgeService: {
      loadRuntime(code: string): Promise<void>;
      loadRuntimeFromFile(filePath: string): Promise<void>;
      getBridge(): unknown;
      getTopologyCache(): unknown;
      stop(): Promise<void>;
    },
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly contextService: {
      getContextSummary(): {
        bridgeReady: boolean;
        topologyMaterialized: boolean;
        deviceCount: number;
        linkCount: number;
      };
      getHealthSummary(): Promise<{
        bridgeReady: boolean;
        topologyHealth: string;
        heartbeatState: "ok" | "stale" | "missing" | "unknown";
        warnings: string[];
      }>;
      getBridgeStatus(): {
        ready: boolean;
        queuedCount?: number;
        inFlightCount?: number;
        warnings?: string[];
      };
    },
  ) {}

  async loadRuntime(code: string): Promise<void> {
    return this.bridgeService.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridgeService.loadRuntimeFromFile(filePath);
  }

  getBridge(): unknown {
    return this.bridgeService.getBridge();
  }

  getTopologyCache(): unknown {
    return this.bridgeService.getTopologyCache();
  }

  getContextSummary(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
  } {
    return this.contextService.getContextSummary();
  }

  async getHealthSummary(): Promise<{
    bridgeReady: boolean;
    topologyHealth: string;
    heartbeatState: "ok" | "stale" | "missing" | "unknown";
    warnings: string[];
  }> {
    return this.contextService.getHealthSummary();
  }

  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this.contextService.getBridgeStatus();
  }

  async gc(): Promise<void> {
    await this.primitivePort.runPrimitive("gc", {});
  }

  async diagnostics(): Promise<{
    context: ReturnType<RuntimeController["getContextSummary"]>;
    health: Awaited<ReturnType<RuntimeController["getHealthSummary"]>>;
    bridge: ReturnType<RuntimeController["getBridgeStatus"]>;
  }> {
    return {
      context: this.getContextSummary(),
      health: await this.getHealthSummary(),
      bridge: this.getBridgeStatus(),
    };
  }
}