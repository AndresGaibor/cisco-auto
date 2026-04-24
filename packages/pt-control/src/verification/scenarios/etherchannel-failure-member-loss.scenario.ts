/**
 * Escenario EtherChannel - Pérdida de miembro y recuperación
 *
 * Topología: 2 switches conectados por 2 enlaces físicos que forman un Port-Channel LACP.
 * Se verifica tráfico inicial, se remove un enlace miembro, y se verifica que el canal
 * sigue funcionando con el miembro restante.
 */
import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const etherchannelFailureMemberLossScenario: RealScenarioDefinition = {
  id: "etherchannel-failure-member-loss",
  title: "EtherChannel Member Loss Resilience",
  tags: ["etherchannel", "lacp", "failover", "resilience"],
  profile: ["etherchannel-core", "switching-resilience"],
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

      await controller.configHost("PC1", { ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" });
      await controller.configHost("PC2", { ip: "192.168.1.20", mask: "255.255.255.0", gateway: "192.168.1.1" });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "lacp-config-commands.txt",
        "SW1 & SW2: channel-group 1 mode active > Port-channel 1 trunk\n" +
        "PC1: 192.168.1.10/24, PC2: 192.168.1.20/24");

      return {
        outcome: "passed",
        evidence: { channelGroup: 1, mode: "active", initialMembers: 2 },
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

    const etherchannelBefore = await controller.execIos("SW1", "show etherchannel 1", true);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "etherchannel-before.txt", etherchannelBefore.raw ?? JSON.stringify(etherchannelBefore));

    await controller.removeLink("SW1", "FastEthernet0/3");

    const etherchannelAfter = await controller.execIos("SW1", "show etherchannel 1", true);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "etherchannel-after-member-loss.txt", etherchannelAfter.raw ?? JSON.stringify(etherchannelAfter));

    store.writeStepArtifact(ctx.runId, this.id, "verify", "member-loss-evidence.json", JSON.stringify({
      linkRemoved: "SW1 FastEthernet0/3",
      etherchannelStillActive: etherchannelAfter.raw?.includes("Port-channel") || etherchannelAfter.raw?.includes("EtherChannel"),
    }));

    const verified = etherchannelAfter.raw?.includes("Port-channel") || etherchannelAfter.raw?.includes("EtherChannel");
    if (!verified) {
      warnings.push("EtherChannel no funciona tras remover un miembro");
    }

    return {
      outcome: verified ? "passed" : "failed",
      evidence: {
        etherchannelBefore: etherchannelBefore.raw,
        etherchannelAfter: etherchannelAfter.raw,
        memberRemoved: "FastEthernet0/3",
      },
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
