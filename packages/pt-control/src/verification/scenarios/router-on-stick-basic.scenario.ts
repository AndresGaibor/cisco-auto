import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const routerOnStickBasicScenario: RealScenarioDefinition = {
  id: "router-on-stick-basic",
  title: "Router-on-a-Stick Inter-VLAN Routing",
  tags: ["router-on-stick", "inter-vlan", "routing"],
  profile: ["routing-intervlan"],
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
      topology: "router-on-stick",
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

      await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
      await controller.configHost("PC2", { ip: "192.168.20.10", mask: "255.255.255.0", gateway: "192.168.20.1" });

      const interfaceResult = await controller.showIpInterfaceBrief("Router1");
      const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ip-interface-brief.txt", interfaceRaw);

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.20.10",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-inter-vlan.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: { pingOutput, interfaceOutput: interfaceRaw },
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

    const interfaceResult = await controller.showIpInterfaceBrief("Router1");
    const interfaceRaw = interfaceResult.raw ?? JSON.stringify(interfaceResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ip-interface-brief-verify.txt", interfaceRaw);

    const parsed = interfaceResult.parsed ?? interfaceResult;
    const interfaces = parsed.interfaces ?? [];

    const hasSub10 = interfaces.some((i: any) =>
      i.interface?.includes("GigabitEthernet0/0.10") || i.name?.includes("GigabitEthernet0/0.10")
    );
    const hasSub20 = interfaces.some((i: any) =>
      i.interface?.includes("GigabitEthernet0/0.20") || i.name?.includes("GigabitEthernet0/0.20")
    );

    const verificado = {
      interfaceCount: interfaces.length,
      hasSubinterface10: hasSub10,
      hasSubinterface20: hasSub20,
      rawOutput: interfaceRaw,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "interface-verification.json", JSON.stringify(verificado, null, 2));

    return {
      outcome: hasSub10 && hasSub20 ? "passed" : "failed",
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
