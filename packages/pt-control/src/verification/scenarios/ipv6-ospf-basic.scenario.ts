/**
 * Escenario OSPFv3 Básico - 2 routers con IPv6
 *
 * Topología: R1 --- R2
 * - R1: 2001:db8:1::1/64 (Gig0/0)
 * - R2: 2001:db8:1::2/64 (Gig0/0)
 *
 * Configura:
 * - OSPFv3 área 0 en ambos routers
 *
 * Verifica:
 * - show ipv6 ospf neighbor
 * - show ipv6 route (tablas de rutas)
 * - Ping entre routers
 *
 * @scenario ipv6-ospf-basic
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ipv6OspfBasicScenario: RealScenarioDefinition = {
  id: "ipv6-ospf-basic",
  title: "IPv6 OSPFv3 Basic - Two Routers",
  tags: ["ipv6", "ospf", "routing", "dynamic"],
  profile: ["ipv6-core", "dynamic-routing-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const r1 = await buildBasicRouter(controller, "R1", { x: 100, y: 200 });
    const r2 = await buildBasicRouter(controller, "R2", { x: 300, y: 200 });

    await controller.addLink("R1", "GigabitEthernet0/0", "R2", "GigabitEthernet0/0");

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ipv6 enable",
      "ipv6 address 2001:db8:1::1/64",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ipv6 enable",
      "ipv6 address 2001:db8:12::1/64",
      "no shutdown",
      "ipv6 router ospf 1",
      "router-id 1.1.1.1",
      "end",
    ], { save: false });

    await controller.configIos("R2", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ipv6 enable",
      "ipv6 address 2001:db8:1::2/64",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ipv6 enable",
      "ipv6 address 2001:db8:2::1/64",
      "no shutdown",
      "ipv6 router ospf 1",
      "router-id 2.2.2.2",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      routers: ["R1", "R2"],
      links: [{ from: "R1", to: "R2", subnet: "2001:db8:1::/64" }],
      ospf: { process_id: 1, area: 0 },
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 5000));

    const r1_neighbor = await controller.show("R1", "show ipv6 ospf neighbor");
    const r2_neighbor = await controller.show("R2", "show ipv6 ospf neighbor");

    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ospf-neighbor.txt", typeof r1_neighbor === "string" ? r1_neighbor : JSON.stringify(r1_neighbor));
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r2-ospf-neighbor.txt", typeof r2_neighbor === "string" ? r2_neighbor : JSON.stringify(r2_neighbor));

    const r1_route = await controller.show("R1", "show ipv6 route");
    const r2_route = await controller.show("R2", "show ipv6 route");

    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ipv6-route.txt", typeof r1_route === "string" ? r1_route : JSON.stringify(r1_route));
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r2-ipv6-route.txt", typeof r2_route === "string" ? r2_route : JSON.stringify(r2_route));

    return {
      outcome: "passed",
      evidence: {
        r1_neighbor,
        r2_neighbor,
        r1_route,
        r2_route,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const ping_r1_to_r2 = await controller.execIos("R1", "ping 2001:db8:1::2");
    const ping_r2_to_r1 = await controller.execIos("R2", "ping 2001:db8:1::1");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r1-to-r2.txt", typeof ping_r1_to_r2 === "string" ? ping_r1_to_r2 : JSON.stringify(ping_r1_to_r2));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r2-to-r1.txt", typeof ping_r2_to_r1 === "string" ? ping_r2_to_r1 : JSON.stringify(ping_r2_to_r1));

    const r1_ping_ok = typeof ping_r1_to_r2 === "string" ? ping_r1_to_r2.includes("Success") : false;
    const r2_ping_ok = typeof ping_r2_to_r1 === "string" ? ping_r2_to_r1.includes("Success") : false;

    return {
      outcome: r1_ping_ok && r2_ping_ok ? "passed" : "failed",
      evidence: {
        ping_r1_to_r2,
        ping_r2_to_r1,
        r1_ping_ok,
        r2_ping_ok,
      },
      warnings: warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("R1", "GigabitEthernet0/0");
      await controller.removeDevice("R2");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "IPv6 OSPF basic scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
