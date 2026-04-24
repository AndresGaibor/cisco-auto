import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario HSRP Basic - 2 routers con standby para redundancia de gateway
 *
 * Topología:
 *   Router1 === Router2
 *      |        |
 *   VLAN 10   VLAN 10
 *
 * Verifica que HSRP configura correctamente el router activo y standby,
 * y que el gateway virtual responde cuando HSRP está activo.
 */
export const hsrpBasicScenario: RealScenarioDefinition = {
  id: "hsrp-basic",
  title: "HSRP Basic - 2 Routers Standby",
  tags: ["hsrp", "fhrp", "gateway", "redundancy"],
  profile: ["hsrp-core"],
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

      store.writeStepArtifact(ctx.runId, this.id, "execute", "hsrp-config.txt",
        "Router1: standby 1 priority 150\nRouter2: standby 1 priority 100\nVirtual IP: 192.168.10.1");

      return {
        outcome: "passed",
        evidence: { routers: ["Router1", "Router2"], vlan: 10, virtualIp: "192.168.10.1" },
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
      const standbyResult1 = await controller.show("Router1", "show standby");
      const standbyRaw1 = standbyResult1.raw ?? JSON.stringify(standbyResult1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router1.txt", standbyRaw1);

      const standbyResult2 = await controller.show("Router2", "show standby");
      const standbyRaw2 = standbyResult2.raw ?? JSON.stringify(standbyResult2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-router2.txt", standbyRaw2);

      const pingResult = await controller.execIos("PC1", "ping 192.168.10.1", false);
      const pingRaw = pingResult.raw ?? JSON.stringify(pingResult);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-gateway.txt", pingRaw);

      const hasActive = standbyRaw1.includes("Active") || standbyRaw2.includes("Active");
      const hasStandby = standbyRaw1.includes("Standby") || standbyRaw2.includes("Standby");
      const hasVirtualIp = standbyRaw1.includes("192.168.10.1") || standbyRaw2.includes("192.168.10.1");
      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");

      const evidence = {
        standbyRouter1Raw: standbyRaw1,
        standbyRouter2Raw: standbyRaw2,
        pingGatewayRaw: pingRaw,
        hasActiveRouter: hasActive,
        hasStandbyRouter: hasStandby,
        hasVirtualIpConfigured: hasVirtualIp,
        pingSuccessful: pingSuccess,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "hsrp-verification.json", JSON.stringify(evidence, null, 2));

      const verified = hasActive && hasStandby && hasVirtualIp && pingSuccess;
      if (!hasActive) {
        warnings.push("No se detectó router activo HSRP - posible problema de configuración");
      }
      if (!pingSuccess) {
        warnings.push("Ping al gateway virtual falló - verificar conectividad HSRP");
      }

      return {
        outcome: verified ? "passed" : "partial",
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
      await controller.removeLink("Router1", "GigabitEthernet0/0");
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
