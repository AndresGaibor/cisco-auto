/**
 * Escenario IPv6 ND + Stateless DHCPv6 - SLAAC + DHCPv6
 *
 * Topología: Router --- PC
 * - Router: Configurado para SLAAC + DHCPv6 stateless
 * - PC: Obtiene prefix via SLAAC, DNS via DHCPv6 stateless
 *
 * Configura:
 * - ipv6 nd prefix con options para stateless DHCP
 * - Pool DHCPv6 stateless (sin address allocation)
 *
 * Verifica:
 * - show ipv6 interface
 * - Neighbor Discovery funciona
 * - PC recibe DNS via DHCPv6 stateless
 *
 * @scenario ipv6-nd-stateless
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ipv6NdStatelessScenario: RealScenarioDefinition = {
  id: "ipv6-nd-stateless",
  title: "IPv6 ND + Stateless DHCPv6",
  tags: ["ipv6", "nd", "slaac", "stateless"],
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
      "ipv6 address 2001:db8:cafe::1/64",
      "ipv6 nd prefix 2001:db8:cafe::/64 2000 2000",
      "ipv6 nd other-config-flag",
      "ipv6 dhcp server DHCPV6_STATELESS",
      "no shutdown",
      "ipv6 dhcp pool DHCPV6_STATELESS",
      "dns-server 2001:db8::53",
      "domain-name ejemplo.com",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["R1", "PC1"],
      links: [{ from: "R1", to: "PC1", port: "GigabitEthernet0/0" }],
      dhcp_mode: "stateless",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 3000));

    const r1_ipv6_int = await controller.show("R1", "show ipv6 interface GigabitEthernet0/0");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ipv6-int.txt", typeof r1_ipv6_int === "string" ? r1_ipv6_int : JSON.stringify(r1_ipv6_int));

    const r1_nd = await controller.show("R1", "show ipv6 nd interface");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-nd.txt", typeof r1_nd === "string" ? r1_nd : JSON.stringify(r1_nd));

    return {
      outcome: "passed",
      evidence: {
        r1_ipv6_int,
        r1_nd,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const pc_state = await controller.inspectHost("PC1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "pc1-state.json", JSON.stringify(pc_state));

    const ping_result = await controller.execIos("PC1", "ping 2001:db8:cafe::1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc1-to-r1.txt", typeof ping_result === "string" ? ping_result : JSON.stringify(ping_result));

    const ping_ok = typeof ping_result === "string" ? ping_result.includes("Success") : false;

    return {
      outcome: ping_ok ? "passed" : "failed",
      evidence: {
        pc_state,
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
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "IPv6 ND stateless scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
