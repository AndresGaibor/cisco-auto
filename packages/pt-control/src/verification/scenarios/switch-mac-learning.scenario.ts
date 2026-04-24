import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const switchMacLearningScenario: RealScenarioDefinition = {
  id: "switch-mac-learning",
  title: "Switch MAC Address Learning",
  tags: ["switching", "mac", "learning", "behavior-verified", "smoke"],
  profile: ["network-core", "smoke"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/2");

    await controller.configHost("PC1", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
    await controller.configHost("PC2", { ip: "192.168.1.11", mask: "255.255.255.0", gateway: "192.168.1.1" });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "PC1", "PC2"],
      links: [
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "PC2", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.ensureTerminalSession("PC1");
      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.11",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-output.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      if (!pingSuccess) {
        warnings.push("Ping puede haber fallado - verificando con MAC table igual");
      }

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: { pingOutput, target: "192.168.1.11" },
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

    const macResult = await controller.showMacAddressTable("Switch1");
    const macRaw = macResult.raw ?? JSON.stringify(macResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "mac-address-table.txt", macRaw);

    const parsed = macResult.parsed ?? macResult;
    const entries = parsed.entries ?? [];

    const pc1MacEntry = entries.find((e: any) =>
      e.ports?.some((p: string) => p.includes("FastEthernet0/1")) ||
      e.interface?.includes("FastEthernet0/1")
    );
    const pc2MacEntry = entries.find((e: any) =>
      e.ports?.some((p: string) => p.includes("FastEthernet0/2")) ||
      e.interface?.includes("FastEthernet0/2")
    );

    const learned = (pc1MacEntry || pc2MacEntry) && entries.length > 0;
    const macEvidence = {
      totalEntries: entries.length,
      pc1Learned: !!pc1MacEntry,
      pc2Learned: !!pc2MacEntry,
      rawOutput: macRaw,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "mac-verification.json", JSON.stringify(macEvidence, null, 2));

    if (!learned) {
      warnings.push("No se encontraron entradas MAC dinamicas - posible problema de aprendizaje");
    }

    return {
      outcome: learned ? "passed" : "failed",
      evidence: macEvidence,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};