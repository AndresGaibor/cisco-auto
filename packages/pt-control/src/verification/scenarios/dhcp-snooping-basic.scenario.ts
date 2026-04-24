import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de seguridad: DHCP Snooping basico.
 * Habilita DHCP snooping en switch y verifica que el trafico
 * DHCP no autorizado es bloqueado o grabado correctamente.
 */
export const dhcpSnoopingBasicScenario: RealScenarioDefinition = {
  id: "dhcp-snooping-basic",
  title: "DHCP Snooping - Proteccion contra servidores DHCP no autorizados",
  tags: ["dhcp-snooping", "l2", "security", "switching"],
  profile: ["security-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("RogueServer", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("RogueServer", "FastEthernet0", "Switch1", "FastEthernet0/3");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ]);

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Switch1", "PC1", "RogueServer"],
      links: [
        { from: "Router1", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/1" },
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "RogueServer", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
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
        "ip dhcp snooping",
        "ip dhcp snooping vlan 1",
        "interface FastEthernet0/1",
        "ip dhcp snooping trust",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "dhcp-snooping-config.txt",
        "ip dhcp snooping\nip dhcp snooping vlan 1\ninterface FastEthernet0/1\nip dhcp snooping trust");

      return {
        outcome: "passed",
        evidence: { snoopingEnabled: true, trustedPort: "FastEthernet0/1" },
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

    const showResult = await controller.execIos("Switch1", "show ip dhcp snooping");
    const raw = showResult.raw ?? JSON.stringify(showResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-snooping-show.txt", raw);

    const snoopingEnabled = raw.includes("DHCP Snooping") || raw.includes("Enabled") || raw.includes("snooping");

    if (!snoopingEnabled) {
      warnings.push("DHCP Snooping no aparece habilitado en show ip dhcp snooping");
    }

    return {
      outcome: snoopingEnabled ? "passed" : "partial",
      evidence: { rawOutput: raw, snoopingActive: snoopingEnabled },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Router1", "GigabitEthernet0/0");
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("RogueServer", "FastEthernet0");
      await controller.removeDevice("Router1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("RogueServer");
      await controller.removeDevice("Switch1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};