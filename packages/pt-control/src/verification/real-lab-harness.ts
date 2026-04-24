import type { PTController } from "../controller/index.js";
import type { RealEnvironmentHealth } from "./real-run-types.js";
import { getRealRunStore } from "./real-run-store.js";

export interface LabHarnessContext {
  controller: PTController;
  runId: string;
  artifactsRoot: string;
}

export class RealLabHarness {
  private controller: PTController;
  private runId: string;
  private runStore: ReturnType<typeof getRealRunStore>;
  private contaminated: boolean = false;
  private degraded: boolean = false;

  constructor(controller: PTController, runId: string) {
    this.controller = controller;
    this.runId = runId;
    this.runStore = getRealRunStore();
  }

  async startRun(): Promise<void> {
    await this.controller.start();
  }

  async prepareScenario(scenarioId: string): Promise<void> {
    try {
      const context = this.controller.getContextSummary();
      const snapshot = context.topologyMaterialized
        ? this.controller.getTopologyCache().getSnapshot()
        : { context };
      this.runStore.writeStepArtifact(this.runId, scenarioId, "setup", "initial-snapshot.json", JSON.stringify(snapshot, null, 2));
    } catch (e) {
      this.contaminated = true;
    }
  }

  async captureSnapshot(label: string, scenarioId: string): Promise<void> {
    try {
      const snapshot = await this.controller.snapshot();
      this.runStore.writeStepArtifact(this.runId, scenarioId, "snapshots", `${label}.snapshot.json`, JSON.stringify(snapshot, null, 2));
    } catch (e) {
      this.runStore.writeStepArtifact(this.runId, scenarioId, "snapshots", `${label}.error.txt`, String(e));
    }
  }

  async cleanupScenario(scenarioId: string): Promise<{ ok: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    try {
      await this.controller.clearTopology();
    } catch (e) {
      warnings.push(`Cleanup failed: ${e}`);
      this.contaminated = true;
    }
    this.runStore.writeStepArtifact(this.runId, scenarioId, "cleanup", "cleanup-result.json", JSON.stringify({ ok: warnings.length === 0, warnings }, null, 2));
    return { ok: warnings.length === 0, warnings };
  }

  async cleanupRun(): Promise<void> {
    try {
      await this.controller.clearTopology();
    } catch {
      // ignore cleanup errors at run level
    }
  }

  markScenarioContaminated(): void {
    this.contaminated = true;
  }

  markRunDegraded(): void {
    this.degraded = true;
  }

  isContaminated(): boolean {
    return this.contaminated;
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  getController(): PTController {
    return this.controller;
  }
}
