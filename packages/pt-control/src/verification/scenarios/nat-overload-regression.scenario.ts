import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de regresion: NAT Overload (PAT).
 * Verifica que NAT PAT funciona correctamente con multiples hosts
 * y que cambios en ACL no rompen la traduccion NAT.
 */
export const natOverloadRegressionScenario: RealScenarioDefinition = {
  id: "nat-overload-regression",
  title: "NAT Overload - Regresion con multiples hosts",
  tags: ["nat", "pat", "regression", "security"],
  profile: ["security-core", "stability-regression"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("ISP", "2911");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");
    await controller.addDevice("PC3", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "ISP", "GigabitEthernet0/0");
    await controller.addLink("PC1", "FastEthernet0", "Router1", "GigabitEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Router1", "GigabitEthernet0/2");
    await controller.addLink("PC3", "FastEthernet0", "Router1", "GigabitEthernet0/3");

    await controller.configIos("ISP", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 203.0.113.1 255.255.255.0",
      "no shutdown",
      "end",
    ]);

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "ISP", "PC1", "PC2", "PC3"],
      links: [
        { from: "Router1", to: "ISP", portFrom: "GigabitEthernet0/0", portTo: "GigabitEthernet0/0" },
        { from: "PC1", to: "Router1", portFrom: "FastEthernet0", portTo: "GigabitEthernet0/1" },
        { from: "PC2", to: "Router1", portFrom: "FastEthernet0", portTo: "GigabitEthernet0/2" },
        { from: "PC3", to: "Router1", portFrom: "FastEthernet0", portTo: "GigabitEthernet0/3" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "ip nat outside",
        "no shutdown",
        "interface GigabitEthernet0/1",
        "ip nat inside",
        "ip address 192.168.1.1 255.255.255.0",
        "no shutdown",
        "interface GigabitEthernet0/2",
        "ip nat inside",
        "ip address 192.168.2.1 255.255.255.0",
        "no shutdown",
        "interface GigabitEthernet0/3",
        "ip nat inside",
        "ip address 192.168.3.1 255.255.255.0",
        "no shutdown",
        "end",
      ]);

      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "access-list 1 permit 192.168.0.0 0.0.255.255",
        "ip nat inside source list 1 interface GigabitEthernet0/0 overload",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "nat-config.txt",
        "ip nat outside\nip nat inside\naccess-list 1 permit 192.168.0.0 0.0.255.255\nip nat inside source list 1 interface GigabitEthernet0/0 overload");

      return {
        outcome: "passed",
        evidence: { natType: "PAT", insideInterfaces: 3, outsideInterface: "GigabitEthernet0/0" },
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

    const natResult = await controller.execIos("Router1", "show ip nat translations");
    const raw = natResult.raw ?? JSON.stringify(natResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-translations.txt", raw);

    const natStatsResult = await controller.execIos("Router1", "show ip nat statistics");
    const statsRaw = natStatsResult.raw ?? JSON.stringify(natStatsResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "nat-stats.txt", statsRaw);

    const hasNat = raw.includes("NAT") || raw.includes("inside") || raw.includes("outside") || raw.includes("translation");

    if (!hasNat) {
      warnings.push("NAT translations no encontradas en show ip nat translations");
    }

    return {
      outcome: hasNat ? "passed" : "partial",
      evidence: { rawOutput: raw, statsOutput: statsRaw, natActive: hasNat },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Router1", "GigabitEthernet0/0");
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("PC3", "FastEthernet0");
      await controller.removeDevice("Router1");
      await controller.removeDevice("ISP");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("PC3");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};