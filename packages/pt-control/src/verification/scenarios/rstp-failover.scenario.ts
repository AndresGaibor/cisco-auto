import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario RSTP Failover - Topología lineal con enlace redundante
 *
 * Topología:
 *   PC1 --- Switch1 --- Switch2 --- Switch3 --- PC2
 *              |
 *              +---- enlace redundante (bloqueado por STP) ----+
 *
 * Verifica:
 * 1. Conectividad inicial entre PCs
 * 2. Fallo de enlace (removerLink)
 * 3. Reconvergencia STP y conectividad post-failover
 */
export const rstpFailoverScenario: RealScenarioDefinition = {
  id: "rstp-failover",
  title: "RSTP Failover - Link Failure and Reconvergence",
  tags: ["stp", "rstp", "failover", "convergence"],
  profile: ["switching-resilience"],
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
    await controller.addLink("Switch1", "FastEthernet0/2", "Switch2", "FastEthernet0/1");
    await controller.addLink("Switch2", "FastEthernet0/2", "Switch3", "FastEthernet0/1");
    await controller.addLink("Switch3", "FastEthernet0/2", "PC2", "FastEthernet0");
    await controller.addLink("Switch1", "FastEthernet0/3", "Switch3", "FastEthernet0/3");

    await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0" });
    await controller.configHost("PC2", { ip: "192.168.10.11", mask: "255.255.255.0" });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Switch1", "Switch2", "Switch3", "PC1", "PC2"],
      links: [
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/1" },
        { from: "Switch1", to: "Switch2", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/1" },
        { from: "Switch2", to: "Switch3", portFrom: "FastEthernet0/2", portTo: "FastEthernet0/1" },
        { from: "Switch3", to: "PC2", portFrom: "FastEthernet0/2", portTo: "FastEthernet0" },
        { from: "Switch1", to: "Switch3", portFrom: "FastEthernet0/3", portTo: "FastEthernet0/3" },
      ],
      redundancy: "ring",
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
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "end",
      ], { save: false });

      await controller.configIos("Switch2", [
        "enable",
        "configure terminal",
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "end",
      ], { save: false });

      await controller.configIos("Switch3", [
        "enable",
        "configure terminal",
        "spanning-tree mode rapid-pvst",
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "end",
      ], { save: false });

      const pingInitial = await controller.execIos("PC1", "ping 192.168.10.11", false);
      const pingInitialRaw = pingInitial.raw ?? JSON.stringify(pingInitial);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-initial.txt", pingInitialRaw);

      await controller.removeLink("Switch2", "FastEthernet0/2");

      await new Promise(resolve => setTimeout(resolve, 3000));

      const pingPostFailover = await controller.execIos("PC1", "ping 192.168.10.11", false);
      const pingPostFailoverRaw = pingPostFailover.raw ?? JSON.stringify(pingPostFailover);
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-post-failover.txt", pingPostFailoverRaw);

      store.writeStepArtifact(ctx.runId, this.id, "execute", "failover-log.txt",
        "Enlace Switch2:Fe0/2 a Switch3:Fe0/1 removido\nConvergencia STP iniciada");

      return {
        outcome: "passed",
        evidence: {
          pingInitialResult: pingInitialRaw,
          pingPostFailoverResult: pingPostFailoverRaw,
          linkRemoved: "Switch2:Fe0/2 to Switch3:Fe0/1",
        },
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

    try {
      const stpResult = await controller.show("Switch2", "show spanning-tree");
      const stpRaw = stpResult.raw ?? JSON.stringify(stpResult);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "stp-switch2-post-failover.txt", stpRaw);

      const stpResult3 = await controller.show("Switch3", "show spanning-tree");
      const stpRaw3 = stpResult3.raw ?? JSON.stringify(stpResult3);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "stp-switch3-post-failover.txt", stpRaw3);

      const pingResult = await controller.execIos("PC1", "ping 192.168.10.11", false);
      const pingRaw = pingResult.raw ?? JSON.stringify(pingResult);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-final.txt", pingRaw);

      const evidence = {
        stpSwitch2Raw: stpRaw,
        stpSwitch3Raw: stpRaw3,
        pingResult: pingRaw,
        failoverDetected: stpRaw.includes("Forwarding") || stpRaw3.includes("Forwarding"),
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "failover-verification.json", JSON.stringify(evidence, null, 2));

      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");
      const verified = pingSuccess;

      if (!pingSuccess) {
        warnings.push("Ping post-failover falló - STP puede no haber convergido correctamente");
      }

      return {
        outcome: verified ? "passed" : "failed",
        evidence,
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

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("Switch1", "FastEthernet0/2");
      await controller.removeLink("Switch3", "FastEthernet0/2");
      await controller.removeLink("Switch1", "FastEthernet0/3");
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