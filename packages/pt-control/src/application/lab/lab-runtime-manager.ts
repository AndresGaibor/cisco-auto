// LabRuntimeManager - Gestor unificado de runtime PT para laboratorios declarativos
// Fase 5: Unificar runtime PT y file-bridge

import { RuntimeGenerator, type RuntimeGeneratorConfig } from "@cisco-auto/pt-runtime";
import type { FileBridgePort } from "../ports/file-bridge.port.js";

export interface LabRuntimeStatus {
  runtimeDeployed: boolean;
  runtimeLoaded: boolean;
  mainJsVersion?: string;
  runtimeJsVersion?: string;
  lastDeployAt?: number;
}

export interface LabRuntimeManagerConfig {
  devDir: string;
  autoDeploy: boolean;
  autoLoad: boolean;
}

const DEFAULT_CONFIG: LabRuntimeManagerConfig = {
  devDir: process.env.PT_DEV_DIR ?? `${process.env.HOME}/pt-dev`,
  autoDeploy: true,
  autoLoad: true,
};

export class LabRuntimeManager {
  private config: LabRuntimeManagerConfig;
  private generator: RuntimeGenerator;
  private status: LabRuntimeStatus = {
    runtimeDeployed: false,
    runtimeLoaded: false,
  };

  constructor(
    config: Partial<LabRuntimeManagerConfig> = {},
    private bridge?: FileBridgePort
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.generator = new RuntimeGenerator({
      devDir: this.config.devDir,
    });
  }

  async ensureRuntime(): Promise<void> {
    if (this.config.autoDeploy && !this.status.runtimeDeployed) {
      await this.deployRuntime();
    }

    if (this.config.autoLoad && !this.status.runtimeLoaded) {
      await this.loadRuntimeInPT();
    }
  }

  async deployRuntime(): Promise<void> {
    await this.generator.deploy();
    this.status.runtimeDeployed = true;
    this.status.lastDeployAt = Date.now();
  }

  async loadRuntimeInPT(): Promise<void> {
    if (!this.bridge) {
      throw new Error("FileBridge not available - cannot load runtime in PT");
    }

    const runtimePath = `${this.config.devDir}/runtime.js`;
    await this.bridge.loadRuntimeFromFile(runtimePath);
    this.status.runtimeLoaded = true;
  }

  async reloadRuntime(): Promise<void> {
    this.status.runtimeLoaded = false;
    await this.loadRuntimeInPT();
  }

  getStatus(): LabRuntimeStatus {
    return { ...this.status };
  }

  isReady(): boolean {
    return this.status.runtimeDeployed && this.status.runtimeLoaded;
  }
}
