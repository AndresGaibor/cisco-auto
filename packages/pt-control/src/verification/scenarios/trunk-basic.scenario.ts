import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const trunkBasicScenario: RealScenarioDefinition = {
  id: "trunk-basic",
  title: "Trunk Link Configuration Between Switches",
  tags: ["trunk", "switching", "l2", "vlan"],
  profile: ["switching-advanced"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("Switch2", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");
    await controller.addDevice("PC3", "PC-PT");
    await controller.addDevice("PC4", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC3", "FastEthernet0", "Switch2", "FastEthernet0/1");
    await controller.addLink("PC4", "FastEthernet0", "Switch2", "FastEthernet0/2");
    await controller.addLink("Switch1", "FastEthernet0/24", "Switch2", "FastEthernet0/24");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "PC1", "PC2", "PC3", "PC4"],
      links: [
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "PC2", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "PC3", to: "Switch2", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "PC4", to: "Switch2", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "Switch1", to: "Switch2", portFrom: "FastEthernet0/24", portTo: "FastEthernet0/24" },
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
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/2",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/24",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10",
        "end",
      ], { save: false });

      await controller.configIos("Switch2", [
        "enable",
        "configure terminal",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/2",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/24",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "trunk-config.txt",
        "Switch1 and Switch2 configured with VLAN 10 and trunk on FastEthernet0/24");

      await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC2", { ip: "192.168.10.11", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC3", { ip: "192.168.10.12", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC4", { ip: "192.168.10.13", mask: "255.255.255.0", gateway: "192.168.10.1" });

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.10.12",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-cross-switch.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: { pingOutput, target: "192.168.10.12" },
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

    const vlanResult2 = await controller.showVlan("Switch2");
    const vlanRaw2 = vlanResult2.raw ?? JSON.stringify(vlanResult2);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-brief-switch2.txt", vlanRaw2);

    const parsed = vlanResult.parsed ?? vlanResult;
    const vlans = parsed.vlans ?? [];
    const vlan10 = vlans.find((v: any) => v.id === 10 || v.vlan === 10);

    const verificado = {
      vlan10Exists: !!vlan10,
      vlan10Name: vlan10?.name ?? "N/A",
      switch1VlanCount: vlans.length,
      switch2VlanCount: (vlanResult2.parsed ?? vlanResult2).vlans?.length ?? 0,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!vlan10;
    return {
      outcome: success ? "passed" : "failed",
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
      await controller.removeLink("Switch1", "FastEthernet0/24");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("PC3");
      await controller.removeDevice("PC4");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Switch2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
