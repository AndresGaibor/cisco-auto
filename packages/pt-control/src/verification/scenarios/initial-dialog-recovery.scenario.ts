import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const initialDialogRecoveryScenario: RealScenarioDefinition = {
  id: "initial-dialog-recovery",
  title: "Initial Dialog Resolution on Fresh Router",
  tags: ["ios", "interactive", "initial-dialog"],
  profile: ["interactive-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1"],
      state: "freshly created",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("Router1");

      const versionResult = await controller.execIos("Router1", "show version");
      const versionRaw = versionResult.raw ?? JSON.stringify(versionResult);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "show-version.txt", versionRaw);

      const hasVersionOutput = versionRaw.length > 50;
      const hasPrompt = versionRaw.includes("Router") || versionRaw.includes("Router>") || versionRaw.includes("Router#");

      const verificado = {
        hasVersionOutput,
        hasPrompt,
        outputLength: versionRaw.length,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "version-evidence.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: hasVersionOutput && hasPrompt ? "passed" : "partial",
        evidence: verificado,
        warnings: verificado.hasVersionOutput ? warnings : [...warnings, "Show version puede no haber respondido correctamente"],
      };
    } catch (e) {
      return {
        outcome: "failed",
        evidence: {},
        warnings,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("Router1");

      const versionResult = await controller.execIos("Router1", "show version");
      const versionRaw = versionResult.raw ?? JSON.stringify(versionResult);

      const verificado = {
        hasVersionContent: versionRaw.includes("Cisco") || versionRaw.includes("IOS"),
        outputLength: versionRaw.length,
        rawOutput: versionRaw.substring(0, 500),
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "version-verification.json", JSON.stringify(verificado, null, 2));

      const success = verificado.hasVersionContent;
      return {
        outcome: success ? "passed" : "failed",
        evidence: verificado,
        warnings,
      };
    } catch (e) {
      return {
        outcome: "failed",
        evidence: {},
        warnings,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Device removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
