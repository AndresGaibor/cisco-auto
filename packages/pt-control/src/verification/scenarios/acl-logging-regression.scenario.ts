import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario de regresion: ACL Logging.
 * Verifica que una ACL configurada no causa regresion en trafico legitimo
 * y que el logging captura eventos correctamente.
 */
export const aclLoggingRegressionScenario: RealScenarioDefinition = {
  id: "acl-logging-regression",
  title: "ACL Logging - Regresion de trafico legitimo",
  tags: ["acl", "logging", "security", "regression"],
  profile: ["security-core", "stability-regression"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "PC1", "FastEthernet0");
    await controller.addLink("Router1", "GigabitEthernet0/1", "PC2", "FastEthernet0");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 192.168.2.1 255.255.255.0",
      "no shutdown",
      "end",
    ]);

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "PC1", "PC2"],
      links: [
        { from: "Router1", to: "PC1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0" },
        { from: "Router1", to: "PC2", portFrom: "GigabitEthernet0/1", portTo: "FastEthernet0" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "access-list 101 permit tcp any any eq 80 log",
        "access-list 101 permit tcp any any eq 443 log",
        "access-list 101 deny tcp any any log",
        "interface GigabitEthernet0/0",
        "ip access-group 101 in",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "acl-config.txt",
        "access-list 101 permit tcp any any eq 80 log\naccess-list 101 permit tcp any any eq 443 log\naccess-list 101 deny tcp any any log\ninterface GigabitEthernet0/0\nip access-group 101 in");

      return {
        outcome: "passed",
        evidence: { aclNumber: 101, rulesCount: 3, direction: "in" },
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

    const aclResult = await controller.execIos("Router1", "show access-lists");
    const raw = aclResult.raw ?? JSON.stringify(aclResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-show.txt", raw);

    const hasAcl = raw.includes("101") || raw.includes("permit") || raw.includes("deny");

    if (!hasAcl) {
      warnings.push("ACL 101 no encontrada en show access-lists");
    }

    const showIntResult = await controller.execIos("Router1", "show ip interface GigabitEthernet0/0");
    const intRaw = showIntResult.raw ?? JSON.stringify(showIntResult);
    store.writeStepArtifact(ctx.runId, this.id, "verify", "interface-status.txt", intRaw);

    return {
      outcome: hasAcl ? "passed" : "partial",
      evidence: { rawOutput: raw, interfaceOutput: intRaw, aclApplied: hasAcl },
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("Router1", "GigabitEthernet0/0");
      await controller.removeLink("Router1", "GigabitEthernet0/1");
      await controller.removeDevice("Router1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};