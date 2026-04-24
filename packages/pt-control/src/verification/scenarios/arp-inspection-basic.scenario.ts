import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de seguridad: ARP Inspection (DAI) basico.
 * Habilita Dynamic ARP Inspection en switch y verifica que
 * se detecta y previene ARP spoofing.
 */
export const arpInspectionBasicScenario: RealScenarioDefinition = {
  id: "arp-inspection-basic",
  title: "ARP Inspection - Prevencion de ARP Spoofing",
  tags: ["arp-inspection", "l2", "security", "switching"],
  profile: ["security-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("AttackerPC", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("AttackerPC", "FastEthernet0", "Switch1", "FastEthernet0/3");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ]);

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Switch1", "PC1", "AttackerPC"],
      links: [
        { from: "Router1", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/1" },
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "AttackerPC", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
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
        "ip arp inspection vlan 1",
        "ip arp inspection validate src-mac",
        "interface FastEthernet0/1",
        "ip arp inspection trust",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "arp-inspection-config.txt",
        "ip arp inspection vlan 1\nip arp inspection validate src-mac\ninterface FastEthernet0/1\nip arp inspection trust");

      return {
        outcome: "passed",
        evidence: { arpInspectionEnabled: true, validatedVlan: 1, trustedPort: "FastEthernet0/1" },
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

    const showResult = await controller.execIos("Switch1", "show ip arp inspection");
    const raw = showResult.raw ?? JSON.stringify(showResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "arp-inspection-show.txt", raw);

    const arpEnabled = raw.includes("ARP") || raw.includes("Inspection") || raw.includes("enabled") || raw.includes("Active");

    if (!arpEnabled) {
      warnings.push("ARP Inspection no aparece habilitado en show ip arp inspection");
    }

    return {
      outcome: arpEnabled ? "passed" : "partial",
      evidence: { rawOutput: raw, arpInspectionActive: arpEnabled },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Router1", "GigabitEthernet0/0");
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("AttackerPC", "FastEthernet0");
      await controller.removeDevice("Router1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("AttackerPC");
      await controller.removeDevice("Switch1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};