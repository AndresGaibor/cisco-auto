import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const multiSwitchVlanScenario: RealScenarioDefinition = {
  id: "multi-switch-vlan",
  title: "VLAN Extended Across Multiple Switches",
  tags: ["trunk", "multi-switch", "vlan"],
  profile: ["switching-advanced"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("Switch2", "2960-24TT");
    await controller.addDevice("Switch3", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Switch3", "FastEthernet0/1");
    await controller.addLink("Switch1", "FastEthernet0/24", "Switch2", "FastEthernet0/23");
    await controller.addLink("Switch2", "FastEthernet0/24", "Switch3", "FastEthernet0/23");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "Switch3", "PC1", "PC2"],
      topology: "chain",
      links: [
        { from: "PC1", to: "Switch1" },
        { from: "PC2", to: "Switch3" },
        { from: "Switch1", to: "Switch2" },
        { from: "Switch2", to: "Switch3" },
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
        "name EXTENDED_VLAN",
        "exit",
        "interface FastEthernet0/1",
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
        "exit",
        "interface FastEthernet0/23",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10",
        "exit",
        "interface FastEthernet0/24",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10",
        "end",
      ], { save: false });

      await controller.configIos("Switch3", [
        "enable",
        "configure terminal",
        "vlan 10",
        "exit",
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/23",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10",
        "end",
      ], { save: false });

      await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC2", { ip: "192.168.10.20", mask: "255.255.255.0", gateway: "192.168.10.1" });

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.10.20",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-extremes.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: { pingOutput, target: "192.168.10.20" },
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

    const vlanResults = await Promise.all([
      controller.showVlan("Switch1"),
      controller.showVlan("Switch2"),
      controller.showVlan("Switch3"),
    ]);

    const vlanRaw1 = vlanResults[0].raw ?? JSON.stringify(vlanResults[0]);
    const vlanRaw2 = vlanResults[1].raw ?? JSON.stringify(vlanResults[1]);
    const vlanRaw3 = vlanResults[2].raw ?? JSON.stringify(vlanResults[2]);

    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-brief-switch1.txt", vlanRaw1);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-brief-switch2.txt", vlanRaw2);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-brief-switch3.txt", vlanRaw3);

    const parsed1 = vlanResults[0].parsed ?? vlanResults[0];
    const parsed2 = vlanResults[1].parsed ?? vlanResults[1];
    const parsed3 = vlanResults[2].parsed ?? vlanResults[2];

    const vlan10Switch1 = (parsed1.vlans ?? []).find((v: any) => v.id === 10 || v.vlan === 10);
    const vlan10Switch2 = (parsed2.vlans ?? []).find((v: any) => v.id === 10 || v.vlan === 10);
    const vlan10Switch3 = (parsed3.vlans ?? []).find((v: any) => v.id === 10 || v.vlan === 10);

    const verificado = {
      vlan10OnSwitch1: !!vlan10Switch1,
      vlan10OnSwitch2: !!vlan10Switch2,
      vlan10OnSwitch3: !!vlan10Switch3,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "vlan-verification.json", JSON.stringify(verificado, null, 2));

    const success = verificado.vlan10OnSwitch1 && verificado.vlan10OnSwitch2 && verificado.vlan10OnSwitch3;
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
      await controller.removeLink("Switch1", "FastEthernet0/24");
      await controller.removeLink("Switch2", "FastEthernet0/24");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Switch2");
      await controller.removeDevice("Switch3");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
