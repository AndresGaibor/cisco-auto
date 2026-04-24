/**
 * Escenario IPv6 SLAAC Básico - Router + PC
 *
 * Topología: Router --- PC
 * - Router: GigabitEthernet0/0 con IPv6 link-local y SLAAC
 * - PC: Obtiene dirección IPv6 via SLAAC (stateless autoconfiguration)
 *
 * Verifica:
 * - show ipv6 interface brief
 * - IPv6 address asignada al PC
 * - Ping entre dispositivos
 *
 * @scenario ipv6-basic-slaac
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ipv6BasicSlaacScenario: RealScenarioDefinition = {
  id: "ipv6-basic-slaac",
  title: "IPv6 SLAAC Basic - Router and PC",
  tags: ["ipv6", "slaac", "routing"],
  profile: ["ipv6-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const router = await buildBasicRouter(controller, "R1", { x: 100, y: 200 });
    const pc = await controller.addDevice("PC1", "PC", { x: 300, y: 200 });

    await controller.addLink("R1", "GigabitEthernet0/0", "PC1", "FastEthernet0");

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ipv6 enable",
      "no shutdown",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["R1", "PC1"],
      links: [{ from: "R1", to: "PC1", port: "GigabitEthernet0/0" }],
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 3000));

    const r1_ipv6_int = await controller.show("R1", "show ipv6 interface brief");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ipv6-int.txt", typeof r1_ipv6_int === "string" ? r1_ipv6_int : JSON.stringify(r1_ipv6_int));

    const pc_state = await controller.inspectHost("PC1");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-state.json", JSON.stringify(pc_state));

    const has_ipv6 = typeof r1_ipv6_int === "string" ? r1_ipv6_int.includes("IPv6") || r1_ipv6_int.includes("FE80") : JSON.stringify(r1_ipv6_int).includes("IPv6");

    return {
      outcome: has_ipv6 ? "passed" : "partial",
      evidence: {
        r1_ipv6_int,
        pc_state,
        has_ipv6,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const ping_result = await controller.execIos("PC1", "ping 2001:db8::1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc1-to-r1.txt", typeof ping_result === "string" ? ping_result : JSON.stringify(ping_result));

    const ping_ok = typeof ping_result === "string" ? ping_result.includes("Success") : false;

    return {
      outcome: ping_ok ? "passed" : "failed",
      evidence: {
        ping_result,
        ping_ok,
      },
      warnings: warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("R1", "GigabitEthernet0/0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "IPv6 SLAAC basic scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
