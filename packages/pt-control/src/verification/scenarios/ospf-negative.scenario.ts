/**
 * Escenario OSPF Negative - Escenario deliberadamente mal configurado
 *
 * Errores intencionales:
 * - R2 tiene máscara incorrecta en el network statement (10.0.12.0/24 en vez de /30)
 * - R3 está configurado en área 1 (distinto a área 0 de R1 y R2)
 *
 * El sistema debe detectar el fallo de formación de vecindad o de rutas.
 * Se verifica que la mayoría de la topología sigue funcionando (R1-R2).
 *
 * @scenario ospf-negative
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ospfNegativeScenario: RealScenarioDefinition = {
  id: "ospf-negative",
  title: "OSPF Misconfiguration Detection",
  tags: ["ospf", "diagnosis", "broken-scenario"],
  profile: ["dynamic-routing-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const r1 = await buildBasicRouter(controller, "R1", { x: 100, y: 200 });
    const r2 = await buildBasicRouter(controller, "R2", { x: 250, y: 200 });
    const r3 = await buildBasicRouter(controller, "R3", { x: 400, y: 200 });

    await controller.addLink("R1", "GigabitEthernet0/0", "R2", "GigabitEthernet0/0");
    await controller.addLink("R2", "GigabitEthernet0/1", "R3", "GigabitEthernet0/0");

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 10.0.12.1 255.255.255.252",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.1.1 255.255.255.0",
      "no shutdown",
      "router ospf 1",
      "network 10.0.12.0 0.0.0.3 area 0",
      "network 10.0.1.0 0.0.0.255 area 0",
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
      "network 10.0.12.0 0.0.0.255 area 0",
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
      "network 10.0.23.0 0.0.0.3 area 1",
      "network 10.0.3.0 0.0.0.255 area 1",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      routers: ["R1", "R2", "R3"],
      intentionalErrors: [
        "R2: mask /24 instead of /30 on 10.0.12.0 network (should be 0.0.0.3 wildcard)",
        "R3: area 1 instead of area 0 (area mismatch with R1-R2)",
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
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-routes.txt", typeof r1Route === "string" ? r1Route : JSON.stringify(r1Route));

    const r1NeighborsCount = typeof r1Neighbor === "string" ? (r1Neighbor.match(/FULL/) || []).length : 0;
    const r3NeighborsCount = typeof r3Neighbor === "string" ? (r3Neighbor.match(/FULL/) || []).length : 0;

    const partialFailure = r1NeighborsCount >= 1 && r3NeighborsCount === 0;
    const completeFailure = r1NeighborsCount === 0;

    return {
      outcome: partialFailure ? "partial" : completeFailure ? "failed" : "passed",
      evidence: {
        r1NeighborsCount,
        r3NeighborsCount,
        r1Neighbor,
        r2Neighbor,
        r3Neighbor,
        r1Route,
        partialFailure,
        completeFailure,
      },
      warnings: ["OSPF misconfiguration detected - R3 not forming adjacency due to area mismatch and mask error"],
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const r1PingR2 = await controller.execIos("R1", "ping 10.0.12.2");
    const r1PingR3 = await controller.execIos("R1", "ping 10.0.23.2");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r1-to-r2.txt", typeof r1PingR2 === "string" ? r1PingR2 : JSON.stringify(r1PingR2));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-r1-to-r3.txt", typeof r1PingR3 === "string" ? r1PingR3 : JSON.stringify(r1PingR3));

    const r1ToR2Ok = typeof r1PingR2 === "string" && r1PingR2.includes("Success");
    const r1ToR3Fails = typeof r1PingR3 === "string" && !r1PingR3.includes("Success");

    const diagnosisCorrect = r1ToR2Ok && r1ToR3Fails;

    return {
      outcome: diagnosisCorrect ? "passed" : "partial",
      evidence: {
        r1ToR2Ok,
        r1ToR3Fails,
        r1PingR2,
        r1PingR3,
        diagnosisCorrect,
      },
      warnings: diagnosisCorrect ? warnings : ["Diagnosis may be incorrect - check OSPF configuration"],
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("R1", "GigabitEthernet0/0");
      await controller.removeLink("R2", "GigabitEthernet0/1");
      await controller.removeDevice("R3");
      await controller.removeDevice("R2");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "OSPF negative scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};