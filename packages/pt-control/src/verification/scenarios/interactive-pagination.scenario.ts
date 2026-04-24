import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const interactivePaginationScenario: RealScenarioDefinition = {
  id: "interactive-pagination",
  title: "Interactive Terminal Pagination",
  tags: ["ios", "interactive", "pagination", "smoke"],
  profile: ["interactive-core", "smoke"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "router ospf 1",
      "network 0.0.0.0 255.255.255.255 area 0",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1"],
      configuration: "OSPF configured to generate multi-page output",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      const result = await controller.execInteractive("Router1", "show running-config", {
        timeout: 30000,
        ensurePrivileged: true,
      });

      const raw = result.raw ?? JSON.stringify(result);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "running-config-raw.txt", raw);

      const hasMorePrompt = raw.includes("--More--") || raw.includes("More");
      const lines = raw.split("\n").length;

      const evidencia = {
        hasPaginationPrompt: hasMorePrompt,
        totalLines: lines,
        rawLength: raw.length,
        mode: result.session?.mode ?? "unknown",
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "pagination-evidence.json", JSON.stringify(evidencia, null, 2));

      if (hasMorePrompt) {
        warnings.push("Pagination detectada - necesita intervencion para continuar");
      }

      return {
        outcome: "passed",
        evidence: evidencia,
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

    const result = await controller.showRunningConfig("Router1");
    const raw = result.raw ?? JSON.stringify(result);
    const parsed = result.parsed ?? result;

    const sections = parsed.sections ?? [];
    const hostname = parsed.hostname;

    const verificado = {
      hasHostname: !!hostname,
      hostnameValue: hostname,
      sectionCount: sections.length,
      rawLength: raw.length,
      hasConfigContent: raw.length > 100,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "config-verification.json", JSON.stringify(verificado, null, 2));

    const success = verificado.hasConfigContent && verificado.sectionCount > 0;

    return {
      outcome: success ? "passed" : "partial",
      evidence: verificado,
      warnings: success ? warnings : [...warnings, "Config puede estar incompleto"],
    };
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