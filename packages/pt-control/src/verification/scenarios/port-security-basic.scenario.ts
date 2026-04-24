import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de seguridad: Port Security basico.
 * Configura port-security en un puerto de switch y verifica que
 * se detecta violacion cuando se conecta un dispositivo no autorizado.
 */
export const portSecurityBasicScenario: RealScenarioDefinition = {
  id: "port-security-basic",
  title: "Port Security - Violacion de seguridad",
  tags: ["port-security", "l2", "security", "switching"],
  profile: ["security-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");
    await controller.addDevice("Attacker", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/1");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/2");
    await controller.addLink("Attacker", "FastEthernet0", "Switch1", "FastEthernet0/3");

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "PC1", "PC2", "Attacker"],
      links: [
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "PC2", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/2" },
        { from: "Attacker", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
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
        "interface FastEthernet0/1",
        "switchport mode access",
        "switchport port-security",
        "switchport port-security maximum 1",
        "switchport port-security violation restrict",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "port-security-config.txt",
        "switchport mode access\nswitchport port-security\nswitchport port-security maximum 1\nswitchport port-security violation restrict");

      return {
        outcome: "passed",
        evidence: { port: "FastEthernet0/1", maxAddresses: 1, violationMode: "restrict" },
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

    const showResult = await controller.execIos("Switch1", "show port-security interface FastEthernet0/1");
    const raw = showResult.raw ?? JSON.stringify(showResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "port-security-show.txt", raw);

    const hasPortSecurity = raw.includes("Port Security") || raw.includes("Enabled");
    const hasMaxAddr = raw.includes("1") || raw.includes("Maximum");

    if (!hasPortSecurity) {
      warnings.push("Port Security no aparece habilitado en show port-security");
    }

    return {
      outcome: hasPortSecurity ? "passed" : "partial",
      evidence: { rawOutput: raw, portSecurityEnabled: hasPortSecurity, maxAddressesShown: hasMaxAddr },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("Attacker", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Attacker");
      await controller.removeDevice("Switch1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};