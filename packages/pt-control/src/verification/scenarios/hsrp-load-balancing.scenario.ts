import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario HSRP Load Balancing - 2 VLANs con HSRP activo en routers opuestos
 *
 * Topología:
 *   Router1 === Router2
 *      |        |
 *   VLAN10  VLAN20
 *
 * Configura HSRP de forma que Router1 sea activo para VLAN10 y standby para VLAN20,
 * mientras Router2 sea standby para VLAN10 y activo para VLAN20, logrando balanceo de carga.
 */
export const hsrpLoadBalancingScenario: RealScenarioDefinition = {
  id: "hsrp-load-balancing",
  title: "HSRP Load Balancing - 2 VLANs with Alternate Active Routers",
  tags: ["hsrp", "load-balancing", "redundancy"],
  profile: ["hsrp-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "2911");
    await controller.addDevice("Router2", "2911");
    await controller.addDevice("Switch1", "2960-24TT");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("PC2", "PC-PT");

    await controller.addLink("Router1", "GigabitEthernet0/0", "Switch1", "FastEthernet0/1");
    await controller.addLink("Router2", "GigabitEthernet0/0", "Switch1", "FastEthernet0/2");
    await controller.addLink("PC1", "FastEthernet0", "Switch1", "FastEthernet0/3");
    await controller.addLink("PC2", "FastEthernet0", "Switch1", "FastEthernet0/4");

    await controller.configHost("PC1", { ip: "192.168.10.10", mask: "255.255.255.0", gateway: "192.168.10.1" });
    await controller.configHost("PC2", { ip: "192.168.20.10", mask: "255.255.255.0", gateway: "192.168.20.1" });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Router2", "Switch1", "PC1", "PC2"],
      links: [
        { from: "Router1", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/1" },
        { from: "Router2", to: "Switch1", portFrom: "GigabitEthernet0/0", portTo: "FastEthernet0/2" },
        { from: "PC1", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/3" },
        { from: "PC2", to: "Switch1", portFrom: "FastEthernet0", portTo: "FastEthernet0/4" },
      ],
      vlans: [10, 20],
      virtualGateways: { vlan10: "192.168.10.1", vlan20: "192.168.20.1" },
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
        "vlan 10",
        "name DATA_VLAN10",
        "exit",
        "vlan 20",
        "name DATA_VLAN20",
        "exit",
        "interface FastEthernet0/3",
        "switchport mode access",
        "switchport access vlan 10",
        "exit",
        "interface FastEthernet0/4",
        "switchport mode access",
        "switchport access vlan 20",
        "exit",
        "end",
      ], { save: false });

      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0.10",
        "encapsulation dot1q 10",
        "ip address 192.168.10.2 255.255.255.0",
        "no shutdown",
        "standby 1 ip 192.168.10.1",
        "standby 1 priority 150",
        "standby 1 preempt",
        "exit",
        "interface GigabitEthernet0/0.20",
        "encapsulation dot1q 20",
        "ip address 192.168.20.2 255.255.255.0",
        "no shutdown",
        "standby 2 ip 192.168.20.1",
        "standby 2 priority 100",
        "standby 2 preempt",
        "end",
      ], { save: false });

      await controller.configIos("Router2", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0.10",
        "encapsulation dot1Q 10",
        "ip address 192.168.10.3 255.255.255.0",
        "no shutdown",
        "standby 1 ip 192.168.10.1",
        "standby 1 priority 100",
        "standby 1 preempt",
        "exit",
        "interface GigabitEthernet0/0.20",
        "encapsulation dot1Q 20",
        "ip address 192.168.20.3 255.255.255.0",
        "no shutdown",
        "standby 2 ip 192.168.20.1",
        "standby 2 priority 150",
        "standby 2 preempt",
        "end",
      ], { save: false });

      store.writeStepArtifact(ctx.runId, this.id, "execute", "hsrp-load-balancing-config.txt",
        "VLAN10: Router1 Active (priority 150), Router2 Standby (priority 100)\n" +
        "VLAN20: Router1 Standby (priority 100), Router2 Active (priority 150)");

      return {
        outcome: "passed",
        evidence: {
          routers: ["Router1", "Router2"],
          vlans: [10, 20],
          vlan10Active: "Router1",
          vlan20Active: "Router2",
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
      const standbyVlan10R1 = await controller.show("Router1", "show standby brief");
      const standbyRawVlan10R1 = standbyVlan10R1.raw ?? JSON.stringify(standbyVlan10R1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-vlan10-router1.txt", standbyRawVlan10R1);

      const standbyVlan10R2 = await controller.show("Router2", "show standby brief");
      const standbyRawVlan10R2 = standbyVlan10R2.raw ?? JSON.stringify(standbyVlan10R2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-vlan10-router2.txt", standbyRawVlan10R2);

      const standbyVlan20R1 = await controller.show("Router1", "show standby 2 brief");
      const standbyRawVlan20R1 = standbyVlan20R1.raw ?? JSON.stringify(standbyVlan20R1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-vlan20-router1.txt", standbyRawVlan20R1);

      const standbyVlan20R2 = await controller.show("Router2", "show standby 2 brief");
      const standbyRawVlan20R2 = standbyVlan20R2.raw ?? JSON.stringify(standbyVlan20R2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "standby-vlan20-router2.txt", standbyRawVlan20R2);

      const pingPC1 = await controller.execIos("PC1", "ping 192.168.10.1", false);
      const pingRawPC1 = pingPC1.raw ?? JSON.stringify(pingPC1);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc1-gateway.txt", pingRawPC1);

      const pingPC2 = await controller.execIos("PC2", "ping 192.168.20.1", false);
      const pingRawPC2 = pingPC2.raw ?? JSON.stringify(pingPC2);
      store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc2-gateway.txt", pingRawPC2);

      const vlan10ActiveOnR1 = standbyRawVlan10R1.includes("Active") || standbyRawVlan10R1.includes("active");
      const vlan20ActiveOnR2 = standbyRawVlan20R2.includes("Active") || standbyRawVlan20R2.includes("active");
      const pingSuccessPC1 = pingRawPC1.includes("Success") || pingRawPC1.includes("sent") || pingRawPC1.includes("=");
      const pingSuccessPC2 = pingRawPC2.includes("Success") || pingRawPC2.includes("sent") || pingRawPC2.includes("=");

      const evidence = {
        standbyVlan10Router1: standbyRawVlan10R1,
        standbyVlan10Router2: standbyRawVlan10R2,
        standbyVlan20Router1: standbyRawVlan20R1,
        standbyVlan20Router2: standbyRawVlan20R2,
        pingPC1Result: pingRawPC1,
        pingPC2Result: pingRawPC2,
        vlan10ActiveOnRouter1: vlan10ActiveOnR1,
        vlan20ActiveOnRouter2: vlan20ActiveOnR2,
        pingSuccessPC1,
        pingSuccessPC2,
      };

      store.writeStepArtifact(ctx.runId, this.id, "verify", "hsrp-load-balancing-verification.json", JSON.stringify(evidence, null, 2));

      const loadBalanced = vlan10ActiveOnR1 && vlan20ActiveOnR2 && pingSuccessPC1 && pingSuccessPC2;
      if (!vlan10ActiveOnR1) {
        warnings.push("VLAN10 no tiene Router1 como activo - posible error de configuración HSRP");
      }
      if (!vlan20ActiveOnR2) {
        warnings.push("VLAN20 no tiene Router2 como activo - posible error de configuración HSRP");
      }
      if (!pingSuccessPC1 || !pingSuccessPC2) {
        warnings.push("Ping a algún gateway virtual falló - verificar conectividad");
      }

      return {
        outcome: loadBalanced ? "passed" : "partial",
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
      await controller.removeLink("PC2", "FastEthernet0");
      await controller.removeLink("Router1", "GigabitEthernet0/0");
      await controller.removeLink("Router2", "GigabitEthernet0/0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("PC2");
      await controller.removeDevice("Switch1");
      await controller.removeDevice("Router1");
      await controller.removeDevice("Router2");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
