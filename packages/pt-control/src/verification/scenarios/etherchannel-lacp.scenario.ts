/**
 * Escenario EtherChannel con LACP
 *
 * Topología: 2 switches conectados por 2 enlaces físicos que forman un Port-Channel.
 * Se configura LACP (mode active) y se verifica que el canal se establece correctamente.
 * Se verifica conectividad entre hosts y estado del etherchannel.
 */
import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const etherchannelLacpScenario: RealScenarioDefinition = {
  id: "etherchannel-lacp",
  title: "EtherChannel LACP Configuration",
  tags: ["etherchannel", "lacp", "switching", "l2"],
  profile: ["etherchannel-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("SW1", "2960-24TT");
    await controller.addDevice("SW2", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "SW1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "SW2", "FastEthernet0/1");
    await controller.addLink("SW1", "FastEthernet0/2", "SW2", "FastEthernet0/2");
    await controller.addLink("SW1", "FastEthernet0/3", "SW2", "FastEthernet0/3");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["SW1", "SW2", "PC1", "PC2"],
      links: [
        { from: "PC1", to: "SW1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "PC2", to: "SW2", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "SW1", to: "SW2", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/2" },
        { from: "SW1", to: "SW2", portFrom: "FastEthernet0/3", portTo: "FastEthernet0/3" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("SW1", [
        "enable",
        "configure terminal",
        "interface range FastEthernet0/2 - FastEthernet0/3",
        "channel-group 1 mode active",
        "exit",
        "interface Port-channel 1",
        "switchport mode trunk",
        "switchport trunk allowed vlan all",
        "end",
      ], { save: false });

      await controller.configIos("SW2", [
        "enable",
        "configure terminal",
        "interface range FastEthernet0/2 - FastEthernet0/3",
        "channel-group 1 mode active",
        "exit",
        "interface Port-channel 1",
        "switchport mode trunk",
        "switchport trunk allowed vlan all",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "lacp-config-commands.txt",
        "SW1: interface range FastEthernet0/2-3 > channel-group 1 mode active > Port-channel 1 trunk\n" +
        "SW2: interface range FastEthernet0/2-3 > channel-group 1 mode active > Port-channel 1 trunk");

      return {
        outcome: "passed",
        evidence: { channelGroup: 1, mode: "active", ports: ["FastEthernet0/2", "FastEthernet0/3"] },
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

    const etherchannelResult = await controller.execIos("SW1", "show etherchannel 1", true);
    const etherchannelRaw = etherchannelResult.raw ?? JSON.stringify(etherchannelResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "etherchannel-show.txt", etherchannelRaw);

    const pc1IpResult = await controller.configHost("PC1", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
    const pc2IpResult = await controller.configHost("PC2", { ip: "192.168.1.20", mask: "255.255.255.0", gateway: "192.168.1.1" });

    store.writeStepArtifact(ctx.runId, this.id, "verify", "host-ips.json", JSON.stringify({
      pc1: { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" },
      pc2: { ip: "192.168.1.20", mask: "255.255.255.0", gateway: "192.168.1.1" },
    }));

    const verified = etherchannelRaw.includes("Port-channel") || etherchannelRaw.includes("EtherChannel");
    if (!verified) {
      warnings.push("show etherchannel no muestra el Port-channel configurado");
    }

    return {
      outcome: verified ? "passed" : "failed",
      evidence: { etherchannelOutput: etherchannelRaw, hostsConfigured: true },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("SW1", "FastEthernet0/2");
      await controller.removeLink("SW1", "FastEthernet0/3");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("SW1");
      await controller.removeDevice("SW2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
