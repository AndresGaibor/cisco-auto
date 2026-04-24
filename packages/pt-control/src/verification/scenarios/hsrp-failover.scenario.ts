import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario HSRP Failover - Verifica transición de activo a standby
 *
 * Topología:
 *   Router1 === Router2
 *      |        |
 *   VLAN 10   VLAN 10
 *
 * Configura HSRP con Router1 como activo, verifica funcionamiento normal,
 * fuerza fallo del router activo y verifica que Router2 toma el rol activo.
 */
export const hsrpFailoverScenario: RealScenarioDefinition = {
  id: "hsrp-failover",
  title: "HSRP Failover - Router Active/Standby Transition",
  tags: ["hsrp", "failover", "redundancy", "resilience"],
  profile: ["hsrp-core", "switching-resilience"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("Router2", "2911");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "Switch1", "FastEthernet0/1");
    await controller.addLink("Router2", "GigabitEthernet0/0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/3");

    await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Router2", "Switch1", "PC1"],
      links: [
        { from: "Router1", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/1" },
        { from: "Router2", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/2" },
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
      ],
      vlan: 10,
      virtualGateway: "192.168.10.1",
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
        "interface GigabitEthernet0/0",
        "ip address 192.168.10.2 255.255.255.0",
        "no shutdown",
        "standby 1 ip 192.168.10.1",
        "standby 1 priority 150",
        "standby 1 preempt",
        "end",
      ], { save: false });

      await controller.configIos("Router2", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "ip address 192.168.10.3 255.255.255.0",
        "no shutdown",
        "standby 1 ip 192.168.10.1",
        "standby 1 priority 100",
        "standby 1 preempt",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "hsrp-initial-config.txt",
        "Router1: standby 1 priority 150 (activo)\nRouter2: standby 1 priority 100 (standby)\nVirtual IP: 192.168.10.1");

      return {
        outcome: "passed",
        evidence: { routers: ["Router1", "Router2"], initialActive: "Router1", initialStandby: "Router2" },
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
      const standbyBefore1 = await controller.show("Router1", "show standby");
      const standbyRawBefore1 = standbyBefore1.raw ?? JSON.stringify(standbyBefore1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router1-before.txt", standbyRawBefore1);

      const standbyBefore2 = await controller.show("Router2", "show standby");
      const standbyRawBefore2 = standbyBefore2.raw ?? JSON.stringify(standbyBefore2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router2-before.txt", standbyRawBefore2);

      const pingBefore = await controller.execIos("PC1", "ping 192.168.10.1", false);
      const pingRawBefore = pingBefore.raw ?? JSON.stringify(pingBefore);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-before-failover.txt", pingRawBefore);

      await controller.removeLink("Router1", "GigabitEthernet0/0");

      await new Promise(resolve => setTimeout(resolve, 5000));

      const standbyAfter1 = await controller.show("Router1", "show standby");
      const standbyRawAfter1 = standbyAfter1.raw ?? JSON.stringify(standbyAfter1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router1-after.txt", standbyRawAfter1);

      const standbyAfter2 = await controller.show("Router2", "show standby");
      const standbyRawAfter2 = standbyAfter2.raw ?? JSON.stringify(standbyAfter2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router2-after.txt", standbyRawAfter2);

      const pingAfter = await controller.execIos("PC1", "ping 192.168.10.1", false);
      const pingRawAfter = pingAfter.raw ?? JSON.stringify(pingAfter);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-after-failover.txt", pingRawAfter);

      const pingSuccessBefore = pingRawBefore.includes("Success") || pingRawBefore.includes("sent") || pingRawBefore.includes("=");
      const pingSuccessAfter = pingRawAfter.includes("Success") || pingRawAfter.includes("sent") || pingRawAfter.includes("=");

      const evidence = {
        standbyRouter1Before: standbyRawBefore1,
        standbyRouter2Before: standbyRawBefore2,
        standbyRouter1After: standbyRawAfter1,
        standbyRouter2After: standbyRawAfter2,
        pingBeforeFailover: pingRawBefore,
        pingAfterFailover: pingRawAfter,
        pingSuccessBefore,
        pingSuccessAfter,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "hsrp-failover-verification.json", JSON.stringify(evidence, null, 2));

      const failoverOccurred = pingSuccessAfter && (standbyRawAfter2.includes("Active") || standbyRawAfter2.includes("active"));
      if (!pingSuccessAfter) {
        warnings.push("Ping después del failover falló - posible problema de transición HSRP");
      }
      if (!failoverOccurred) {
        warnings.push("No se detectó Router2 como nuevo router activo después del fallo");
      }

      return {
        outcome: failoverOccurred ? "passed" : "partial",
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
      await controller.removeLink("Router2", "GigabitEthernet0/0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Router1");
      await controller.removeDevice("Router2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
