/**
 * Escenario OSPF Básico - 3 routers en cadena
 *
 * Topología: R1 - R2 - R3 (cadena lineal)
 * - R1: 10.0.1.0/24 (Gig0/0) y 10.0.12.0/30 (Gig0/1)
 * - R2: 10.0.12.0/30 (Gig0/0) y 10.0.23.0/30 (Gig0/1)
 * - R3: 10.0.23.0/30 (Gig0/0) y 10.0.3.0/24 (Gig0/1)
 *
 * OSPF: process ID 1, área 0 en todas las interfaces
 *
 * @scenario ospf-basic
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ospfBasicScenario: RealScenarioDefinition = {
  id: "ospf-basic",
  title: "OSPF Basic Three-Router Chain",
  tags: ["ospf", "routing", "dynamic", "convergence"],
  profile: ["dynamic-routing-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const r1 = await buildBasicRouter(controller, "R1", { x: 100, y: 200 });
    const r2 = await buildBasicRouter(controller, "R2", { x: 250, y: 200 });
    const r3 = await buildBasicRouter(controller, "R3", { x: 400, y: 200 });

    await controller.addLink("R1", "GigabitEthernet0/1", "R2", "GigabitEthernet0/0");
    await controller.addLink("R2", "GigabitEthernet0/1", "R3", "GigabitEthernet0/0");

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.1.1 255.255.255.0",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.12.1 255.255.255.252",
      "no shutdown",
      "router ospf 1",
      "network 10.0.1.0 0.0.0.255 area 0",
      "network 10.0.12.0 0.0.0.3 area 0",
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
      "ip address 10.0.23.2 255.255.255.252",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.3.1 255.255.255.0",
      "no shutdown",
      "router ospf 1",
      "network 10.0.23.0 0.0.0.3 area 0",
      "network 10.0.3.0 0.0.0.255 area 0",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      routers: ["R1", "R2", "R3"],
      links: [
        { from: "R1", to: "R2", subnet: "10.0.12.0/30" },
        { from: "R2", to: "R3", subnet: "10.0.23.0/30" },
      ],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 4000));

    const r1Neighbor = await controller.show("R1", "ip ospf neighbor");
    const r2Neighbor = await controller.show("R2", "ip ospf neighbor");
    const r3Neighbor = await controller.show("R3", "ip ospf neighbor");

    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ospf-neighbor.txt", typeof r1Neighbor === "string" ? r1Neighbor : JSON.stringify(r1Neighbor));
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r2-ospf-neighbor.txt", typeof r2Neighbor === "string" ? r2Neighbor : JSON.stringify(r2Neighbor));
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r3-ospf-neighbor.txt", typeof r3Neighbor === "string" ? r3Neighbor : JSON.stringify(r3Neighbor));

    const r1Route = await controller.show("R1", "ip route");
    const r3Route = await controller.show("R3", "ip route");

    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-routes.txt", typeof r1Route === "string" ? r1Route : JSON.stringify(r1Route));
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r3-routes.txt", typeof r3Route === "string" ? r3Route : JSON.stringify(r3Route));

    const r1HasOspfRoute = typeof r1Route === "string" ? r1Route.includes("O") : JSON.stringify(r1Route).includes('"protocol":"ospf"');
    const r3HasOspfRoute = typeof r3Route === "string" ? r3Route.includes("O") : JSON.stringify(r3Route).includes('"protocol":"ospf"');

    const neighborsFormed = r1Neighbor && r2Neighbor && r3Neighbor;

    return {
      outcome: neighborsFormed && r1HasOspfRoute && r3HasOspfRoute ? "passed" : "partial",
      evidence: {
        neighborsFormed,
        r1HasOspfRoute,
        r3HasOspfRoute,
        r1Neighbor,
        r2Neighbor,
        r3Neighbor,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const r2Route = await controller.show("R2", "ip route");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "r2-routes.txt", typeof r2Route === "string" ? r2Route : JSON.stringify(r2Route));

    const r1ToR3 = await controller.execIos("R1", "ping 10.0.3.1");
    const r3ToR1 = await controller.execIos("R3", "ping 10.0.1.1");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r1-to-r3.txt", typeof r1ToR3 === "string" ? r1ToR3 : JSON.stringify(r1ToR3));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r3-to-r1.txt", typeof r3ToR1 === "string" ? r3ToR1 : JSON.stringify(r3ToR1));

    const r1PingOk = typeof r1ToR3 === "string" ? r1ToR3.includes("Success") : false;
    const r3PingOk = typeof r3ToR1 === "string" ? r3ToR1.includes("Success") : false;

    return {
      outcome: r1PingOk && r3PingOk ? "passed" : "failed",
      evidence: {
        r1PingOk,
        r3PingOk,
        r1ToR3,
        r3ToR1,
        r2Route,
      },
      warnings: warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("R1", "GigabitEthernet0/1");
      await controller.removeLink("R2", "GigabitEthernet0/1");
      await controller.removeDevice("R3");
      await controller.removeDevice("R2");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "OSPF basic scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};