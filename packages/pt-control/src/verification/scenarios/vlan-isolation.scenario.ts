import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const vlanIsolationScenario: RealScenarioDefinition = {
  id: "vlan-isolation",
  title: "VLAN Isolation Between Broadcast Domains",
  tags: ["vlan", "isolation", "l2"],
  profile: ["switching-advanced"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");
    await controller.addDevice("PC3", "PC-PT");
    await controller.addDevice("PC4", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC3", "FastEthernet0", "Switch1", "FastEthernet0/3");
    await controller.addLink("PC4", "FastEthernet0", "Switch1", "FastEthernet0/4");

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
      "switchport access vlan 10",
      "exit",
      "interface FastEthernet0/3",
      "switchport mode access",
      "switchport access vlan 20",
      "exit",
      "interface FastEthernet0/4",
      "switchport mode access",
      "switchport access vlan 20",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "PC1", "PC2", "PC3", "PC4"],
      vlans: [10, 20],
      vlanAssignment: { PC1: "VLAN 10", PC2: "VLAN 10", PC3: "VLAN 20", PC4: "VLAN 20" },
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC2", { ip: "192.168.10.11", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC3", { ip: "192.168.20.10", mask: "255.255.255.0", gateway: "192.168.20.1" });
      await controller.configHost("PC4", { ip: "192.168.20.11", mask: "255.255.255.0", gateway: "192.168.20.1" });

      const pingSameVlan = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.10.11",
      });

      const pingSameVlanOutput = typeof pingSameVlan === "string" ? pingSameVlan : (pingSameVlan.raw ?? JSON.stringify(pingSameVlan));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-same-vlan.txt", pingSameVlanOutput);

      const pingDiffVlan = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.20.10",
      });

      const pingDiffVlanOutput = typeof pingDiffVlan === "string" ? pingDiffVlan : (pingDiffVlan.raw ?? JSON.stringify(pingDiffVlan));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-diff-vlan.txt", pingDiffVlanOutput);

      const sameVlanReachable = pingSameVlanOutput.includes("Success") || pingSameVlanOutput.includes("TTL");
      const diffVlanUnreachable = !pingDiffVlanOutput.includes("Success") || pingDiffVlanOutput.includes("100%");

      if (!diffVlanUnreachable) {
        warnings.push("PC1 puede alcanzar PC3 en VLAN diferente - aislamiento puede no funcionar");
      }

      return {
        outcome: sameVlanReachable && diffVlanUnreachable ? "passed" : "partial",
        evidence: {
          sameVlanPing: pingSameVlanOutput,
          diffVlanPing: pingDiffVlanOutput,
          sameVlanReachable,
          diffVlanUnreachable,
        },
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

    const verificado = {
      totalVlans: vlans.length,
      vlan10Exists: !!vlan10,
      vlan20Exists: !!vlan20,
      rawOutput: vlanRaw,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-verification.json", JSON.stringify(verificado, null, 2));

    return {
      outcome: !!vlan10 && !!vlan20 ? "passed" : "failed",
      evidence: verificado,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("PC3", "FastEthernet0");
      await controller.removeLink("PC4", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("PC3");
      await controller.removeDevice("PC4");
      await controller.removeDevice("Switch1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
