/**
 * Escenario OSPF Failover - Topología con enlaces redundantes
 *
 * Topología: Triángulo R1 - R2 - R3 con enlaces redundantes
 * - R1-R2: enlace primario
 * - R1-R3: enlace secundario
 * - R2-R3: enlace terciario (backbone backup)
 *
 * Se verifica conectividad, se remove un enlace y se observa la reconvergencia OSPF.
 *
 * @scenario ospf-failover
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ospfFailoverScenario: RealScenarioDefinition = {
  id: "ospf-failover",
  title: "OSPF Failover with Redundant Links",
  tags: ["ospf", "routing", "failover", "convergence"],
  profile: ["dynamic-routing-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const r1 = await buildBasicRouter(controller, "R1", { x: 150, y: 150 });
    const r2 = await buildBasicRouter(controller, "R2", { x: 350, y: 150 });
    const r3 = await buildBasicRouter(controller, "R3", { x: 250, y: 300 });

    await controller.addLink("R1", "GigabitEthernet0/0", "R2", "GigabitEthernet0/0");
    await controller.addLink("R1", "GigabitEthernet0/1", "R3", "GigabitEthernet0/0");
    await controller.addLink("R2", "GigabitEthernet0/1", "R3", "GigabitEthernet0/1");

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.12.1 255.255.255.252",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.13.1 255.255.255.252",
      "no shutdown",
      "router ospf 1",
      "network 10.0.12.0 0.0.0.3 area 0",
      "network 10.0.13.0 0.0.0.3 area 0",
      "end",
    ], { save: false });

    await controller.configIos("R2", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.12.2 255.255.255.252",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.23.1 255.255.255.252",
      "no shutdown",
      "router ospf 1",
      "network 10.0.12.0 0.0.0.3 area 0",
      "network 10.0.23.0 0.0.0.3 area 0",
      "end",
    ], { save: false });

    await controller.configIos("R3", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.13.2 255.255.255.252",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.23.2 255.255.255.252",
      "no shutdown",
      "router ospf 1",
      "network 10.0.13.0 0.0.0.3 area 0",
      "network 10.0.23.0 0.0.0.3 area 0",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      routers: ["R1", "R2", "R3"],
      topology: "triangle",
      links: [
        { from: "R1", to: "R2", subnet: "10.0.12.0/30" },
        { from: "R1", to: "R3", subnet: "10.0.13.0/30" },
        { from: "R2", to: "R3", subnet: "10.0.23.0/30" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 4000));

    const r1NeighborBefore = await controller.show("R1", "ip ospf neighbor");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-neighbor-before.txt", typeof r1NeighborBefore === "string" ? r1NeighborBefore : JSON.stringify(r1NeighborBefore));

    const pingBefore = await controller.execIos("R1", "ping 10.0.23.2");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-r1-to-r3-before.txt", typeof pingBefore === "string" ? pingBefore : JSON.stringify(pingBefore));

    await controller.removeLink("R1", "GigabitEthernet0/1");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "link-removal.txt", "Removed R1-R3 link");

    await new Promise(resolve => setTimeout(resolve, 5000));

    const r1NeighborAfter = await controller.show("R1", "ip ospf neighbor");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-neighbor-after.txt", typeof r1NeighborAfter === "string" ? r1NeighborAfter : JSON.stringify(r1NeighborAfter));

    const r1RouteAfter = await controller.show("R1", "ip route");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-routes-after.txt", typeof r1RouteAfter === "string" ? r1RouteAfter : JSON.stringify(r1RouteAfter));

    const pingAfter = await controller.execIos("R1", "ping 10.0.23.2");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-r1-to-r3-after.txt", typeof pingAfter === "string" ? pingAfter : JSON.stringify(pingAfter));

    const connectivityMaintained = typeof pingAfter === "string" && pingAfter.includes("Success");

    return {
      outcome: connectivityMaintained ? "passed" : "failed",
      evidence: {
        pingBefore,
        pingAfter,
        r1NeighborBefore,
        r1NeighborAfter,
        r1RouteAfter,
        connectivityMaintained,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const r2Neighbor = await controller.show("R2", "ip ospf neighbor");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "r2-neighbor.txt", typeof r2Neighbor === "string" ? r2Neighbor : JSON.stringify(r2Neighbor));

    const r2ToR1 = await controller.execIos("R2", "ping 10.0.12.1");
    const r2ToR3 = await controller.execIos("R2", "ping 10.0.23.2");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r2-to-r1.txt", typeof r2ToR1 === "string" ? r2ToR1 : JSON.stringify(r2ToR1));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r2-to-r3.txt", typeof r2ToR3 === "string" ? r2ToR3 : JSON.stringify(r2ToR3));

    const r2PingR1Ok = typeof r2ToR1 === "string" && r2ToR1.includes("Success");
    const r2PingR3Ok = typeof r2ToR3 === "string" && r2ToR3.includes("Success");

    return {
      outcome: r2PingR1Ok && r2PingR3Ok ? "passed" : "failed",
      evidence: {
        r2PingR1Ok,
        r2PingR3Ok,
        r2Neighbor,
        r2ToR1,
        r2ToR3,
      },
      warnings: warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeDevice("R3");
      await controller.removeDevice("R2");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "OSPF failover scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};