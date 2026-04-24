import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const vlanBasicScenario: RealScenarioDefinition = {
  id: "vlan-basic",
  title: "VLAN Basic Configuration",
  tags: ["vlan", "switching", "l2", "smoke"],
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
      await controller.configIos("Switch1", [
        "enable",
        "configure terminal",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "vlan 20",
        "name DATA_VLAN20",
        "exit",
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/2",
        "switchport mode access",
        "switchport access vlan 20",
        "exit",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "vlan-config-commands.txt",
        "vlan 10 name DATA_VLAN10\nvlan 20 name DATA_VLAN20\ninterface FastEthernet0/1 switchport mode access switchport access vlan 10\ninterface FastEthernet0/2 switchport mode access switchport access vlan 20");

      return {
        outcome: "passed",
        evidence: { vlans: [10, 20], ports: ["FastEthernet0/1", "FastEthernet0/2"] },
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

    const vlanResult = await controller.showVlan("Switch1");
    const vlanRaw = vlanResult.raw ?? JSON.stringify(vlanResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-brief.txt", vlanRaw);

    const parsed = vlanResult.parsed ?? vlanResult;
    const vlans = parsed.vlans ?? [];

    const vlan10 = vlans.find((v: any) => v.id === 10 || v.vlan === 10);
    const vlan20 = vlans.find((v: any) => v.id === 20 || v.vlan === 20);

    const vlanEvidence = {
      totalVlans: vlans.length,
      vlan10Exists: !!vlan10,
      vlan20Exists: !!vlan20,
      vlan10Name: vlan10?.name ?? "N/A",
      vlan20Name: vlan20?.name ?? "N/A",
      rawOutput: vlanRaw,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-verification.json", JSON.stringify(vlanEvidence, null, 2));

    const verified = !!vlan10 && !!vlan20;
    if (!verified) {
      warnings.push("VLAN 10 o 20 no encontradas en show vlan brief");
    }

    return {
      outcome: verified ? "passed" : "failed",
      evidence: vlanEvidence,
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