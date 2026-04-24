/**
 * Escenario DHCPv6 Stateful - Router como server DHCPv6
 *
 * Topología: Router --- PC
 * - Router: Server DHCPv6 stateful
 * - PC: Cliente DHCPv6 que solicita IPv6
 *
 * Configura:
 * - IPv6 en interfaces del router
 * - Pool DHCPv6 stateful con prefix y DNS
 *
 * Verifica:
 * - show ipv6 dhcp pool
 * - show ipv6 dhcp binding (PC recibe dirección)
 *
 * @scenario ipv6-dhcpv6-stateful
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ipv6Dhcpv6StatefulScenario: RealScenarioDefinition = {
  id: "ipv6-dhcpv6-stateful",
  title: "IPv6 DHCPv6 Stateful - Router as DHCPv6 Server",
  tags: ["ipv6", "dhcpv6", "stateful"],
  profile: ["ipv6-core", "dhcp-core"],
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
      "ipv6 nd prefix default 2001:db8:cafe::/64",
      "ipv6 dhcp server DHCPV6_POOL",
      "no shutdown",
      "ipv6 dhcp pool DHCPV6_POOL",
      "address prefix 2001:db8:cafe::/64",
      "dns-server 2001:db8::53",
      "domain-name ejemplo.com",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["R1", "PC1"],
      links: [{ from: "R1", to: "PC1", port: "GigabitEthernet0/0" }],
      dhcp_pool: "DHCPV6_POOL",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    await new Promise(resolve => setTimeout(resolve, 3000));

    const dhcp_pool = await controller.show("R1", "show ipv6 dhcp pool");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "dhcp-pool.txt", typeof dhcp_pool === "string" ? dhcp_pool : JSON.stringify(dhcp_pool));

    const r1_ipv6_int = await controller.show("R1", "show ipv6 interface brief");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "r1-ipv6-int.txt", typeof r1_ipv6_int === "string" ? r1_ipv6_int : JSON.stringify(r1_ipv6_int));

    return {
      outcome: "passed",
      evidence: {
        dhcp_pool,
        r1_ipv6_int,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const dhcp_binding = await controller.show("R1", "show ipv6 dhcp binding");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-binding.txt", typeof dhcp_binding === "string" ? dhcp_binding : JSON.stringify(dhcp_binding));

    const pc_state = await controller.inspectHost("PC1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "pc1-state.json", JSON.stringify(pc_state));

    const has_binding = typeof dhcp_binding === "string" ? dhcp_binding.includes("2001:db8:cafe") : JSON.stringify(dhcp_binding).includes("2001:db8:cafe");

    return {
      outcome: has_binding ? "passed" : "partial",
      evidence: {
        dhcp_binding,
        pc_state,
        has_binding,
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
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "IPv6 DHCPv6 stateful scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
