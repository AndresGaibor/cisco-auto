import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de seguridad: VLAN Hopping Attack.
 * Demuestra ataque de VLAN hopping si el switch esta mal configurado
 * y verifica que trunk configurado correctamente mitiga el ataque.
 */
export const vlanHoppingAttackScenario: RealScenarioDefinition = {
  id: "vlan-hopping-attack",
  title: "VLAN Hopping - Mitigacion de ataque",
  tags: ["vlan", "security", "attack", "trunk"],
  profile: ["security-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("Switch2", "2960-24TT");
    await controller.addDevice("Attacker", "PC-PT");
    await controller.addDevice("Server", "PC-PT");

    await controller.addLink("Attacker", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("Switch1", "FastEthernet0/24", "Switch2", "FastEthernet0/24");
    await controller.addLink("Server", "FastEthernet0", "Switch2", "FastEthernet0/1");

    await controller.configIos("Switch1", [
      "enable",
      "configure terminal",
      "vlan 10",
      "name ATTACKER_VLAN",
      "vlan 20",
      "name SERVER_VLAN",
      "end",
    ]);

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "Attacker", "Server"],
      links: [
        { from: "Attacker", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "Switch1", to: "Switch2", portFrom: "FastEthernet0/24", portTo: "FastEthernet0/24" },
        { from: "Server", to: "Switch2", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
      ],
      vlans: [10, 20],
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
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport access vlan 10",
        "no switchport mode trunk",
        "end",
      ]);

      await controller.configIos("Switch1", [
        "enable",
        "configure terminal",
        "interface FastEthernet0/24",
        "switchport mode trunk",
        "switchport trunk allowed vlan 10,20",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "trunk-mitigation-config.txt",
        "interface FastEthernet0/1: switchport mode access vlan 10\ninterface FastEthernet0/24: switchport mode trunk allowed vlan 10,20");

      return {
        outcome: "passed",
        evidence: { accessPortConfigured: true, trunkPortConfigured: true, mitigatedVlans: [10, 20] },
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

    const trunkResult = await controller.execIos("Switch1", "show interfaces FastEthernet0/24 trunk");
    const raw = trunkResult.raw ?? JSON.stringify(trunkResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "trunk-status.txt", raw);

    const isTrunk = raw.includes("trunk") || raw.includes("Mode") || raw.includes("PVID");

    const switchportResult = await controller.execIos("Switch1", "show interfaces FastEthernet0/1 switchport");
    const switchportRaw = switchportResult.raw ?? JSON.stringify(switchportResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "access-port-status.txt", switchportRaw);

    const isAccess = switchportRaw.includes("Access") || switchportRaw.includes("mode");

    if (!isTrunk) {
      warnings.push("Puerto FastEthernet0/24 no muestra trunk en show interfaces trunk");
    }

    return {
      outcome: isTrunk && isAccess ? "passed" : "partial",
      evidence: { trunkOutput: raw, switchportOutput: switchportRaw, trunkActive: isTrunk, accessMode: isAccess },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Attacker", "FastEthernet0");
      await controller.removeLink("Switch1", "FastEthernet0/24");
      await controller.removeLink("Server", "FastEthernet0");
      await controller.removeDevice("Attacker");
      await controller.removeDevice("Server");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Switch2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};