import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const dhcpMultiVlanScenario: RealScenarioDefinition = {
  id: "dhcp-multi-vlan",
  title: "DHCP Server Multi-VLAN with Router-on-a-Stick",
  tags: ["dhcp", "multi-vlan", "router-on-stick"],
  profile: ["dhcp-core", "routing-intervlan"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("Switch1", "FastEthernet0/1", "Router1", "GigabitEthernet0/0");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/3");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Switch1", "PC1", "PC2"],
      topology: "router-on-stick with DHCP",
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
        "name VLAN10",
        "exit",
        "vlan 20",
        "name VLAN20",
        "exit",
        "interface FastEthernet0/2",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/3",
        "switchport mode access",
        "switchport access vlan 20",
        "exit",
        "interface FastEthernet0/1",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10,20",
        "end",
      ], { save: false });

      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "no shutdown",
        "exit",
        "interface GigabitEthernet0/0.10",
        "encapsulation dot1Q 10",
        "ip address 192.168.10.1 255.255.255.0",
        "exit",
        "interface GigabitEthernet0/0.20",
        "encapsulation dot1Q 20",
        "ip address 192.168.20.1 255.255.255.0",
        "end",
      ], { save: false });

      await controller.configureDhcpServer("Router1", {
        poolName: "VLAN10_POOL",
        network: "192.168.10.0",
        subnetMask: "255.255.255.0",
        defaultRouter: "192.168.10.1",
        leaseTime: 7,
      });

      await controller.configureDhcpServer("Router1", {
        poolName: "VLAN20_POOL",
        network: "192.168.20.0",
        subnetMask: "255.255.255.0",
        defaultRouter: "192.168.20.1",
        leaseTime: 7,
      });

      await controller.configHost("PC1", { dhcp: true });
      await controller.configHost("PC2", { dhcp: true });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const inspect1 = await controller.inspectHost("PC1");
      const inspect2 = await controller.inspectHost("PC2");

      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspect1));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc2-inspect.json", JSON.stringify(inspect2));

      const pc1Ip = inspect1.ip ?? "";
      const pc2Ip = inspect2.ip ?? "";
      const pc1FromPool = pc1Ip.startsWith("192.168.10.");
      const pc2FromPool = pc2Ip.startsWith("192.168.20.");

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.20.10",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-inter-vlan.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      return {
        outcome: pc1FromPool && pc2FromPool && pingSuccess ? "passed" : "partial",
        evidence: { pc1Ip, pc2Ip, pc1FromPool, pc2FromPool, pingOutput, pingSuccess },
        warnings: [!pc1FromPool && "PC1 puede no haber recibido IP", !pc2FromPool && "PC2 puede no haber recibido IP"].filter(Boolean) as string[],
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

    const dhcpInspect = await controller.inspectDhcpServer("Router1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-server-inspect.json", JSON.stringify(dhcpInspect));

    const pc1 = await controller.inspectHost("PC1");
    const pc2 = await controller.inspectHost("PC2");

    const verificado = {
      poolCount: dhcpInspect.poolCount,
      pools: dhcpInspect.pools,
      pc1Ip: pc1.ip,
      pc2Ip: pc2.ip,
      pc1FromCorrectPool: (pc1.ip ?? "").startsWith("192.168.10."),
      pc2FromCorrectPool: (pc2.ip ?? "").startsWith("192.168.20."),
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-verification.json", JSON.stringify(verificado, null, 2));

    const success = verificado.poolCount >= 2 && verificado.pc1FromCorrectPool && verificado.pc2FromCorrectPool;
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
      await controller.removeLink("Switch1", "FastEthernet0/1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
