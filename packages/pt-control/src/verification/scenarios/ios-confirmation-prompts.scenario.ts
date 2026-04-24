import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const iosConfirmationPromptsScenario: RealScenarioDefinition = {
  id: "ios-confirmation-prompts",
  title: "IOS Confirmation Prompts Resolution",
  tags: ["ios", "interactive", "confirmation"],
  profile: ["interactive-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "hostname TESTROUTER",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1"],
      configuration: "hostname set to TESTROUTER",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("Router1");

      const result = await controller.execInteractive("Router1", "write memory", {
        timeout: 10000,
        ensurePrivileged: true,
      });

      const raw = result.raw ?? JSON.stringify(result);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "write-memory-output.txt", raw);

      const hasConfirmation = raw.includes("confirm") || raw.includes("[confirm]") || raw.includes("OK");
      const sessionStillActive = result.session?.mode !== undefined;

      const verificado = {
        hasConfirmationPrompt: hasConfirmation,
        sessionStillActive,
        mode: result.session?.mode ?? "unknown",
        rawLength: raw.length,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "confirmation-evidence.json", JSON.stringify(verificado, null, 2));

      if (!sessionStillActive) {
        warnings.push("Sesion puede haber quedado colgada tras confirmacion");
      }

      return {
        outcome: sessionStillActive ? "passed" : "partial",
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

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      const versionResult = await controller.execIos("Router1", "show version");
      const versionRaw = versionResult.raw ?? JSON.stringify(versionResult);

      store.writeStepArtifact(ctx.runId, this.id, "verify", "post-confirm-version.txt", versionRaw);

      const sessionHealthy = versionRaw.length > 50;

      const verificado = {
        sessionHealthy,
        outputLength: versionRaw.length,
        hasContent: versionRaw.includes("Cisco") || versionRaw.includes("IOS"),
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "session-verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: sessionHealthy ? "passed" : "failed",
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
