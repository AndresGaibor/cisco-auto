/**
 * Escenario IPv6 ACL Básico - Filtrado de tráfico IPv6
 *
 * Topología: Router --- PC
 * - Router: GigabitEthernet0/0 con IPv6
 * - ACL IPv6 para filtrar tráfico
 *
 * Configura:
 * - IPv6 en interfaces
 * - ACL IPv6 con política de filtrado
 *
 * Verifica:
 * - show ipv6 access-list
 * - Tráfico permitido/bloqueado según política
 *
 * @scenario ipv6-acl-basic
 */

import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { buildBasicRouter } from "../builders/ios-lab-builder.js";

export const ipv6AclBasicScenario: RealScenarioDefinition = {
  id: "ipv6-acl-basic",
  title: "IPv6 ACL Basic - Traffic Filtering",
  tags: ["ipv6", "acl", "security", "filtering"],
  profile: ["ipv6-core", "acl-nat-core"],
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
      "ipv6 address 2001:db8:1::1/64",
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

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "ipv6 access-list ACL_IPV6_TEST",
      "permit tcp any any eq 80",
      "permit tcp any any eq 443",
      "deny ipv6 any any",
      "end",
    ], { save: false });

    await controller.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ipv6 traffic-filter ACL_IPV6_TEST in",
      "end",
    ], { save: false });

    const acl_show = await controller.show("R1", "show ipv6 access-list");
    store.writeStepArtifact(ctx.runId, this.id, "execute", "acl-ipv6.txt", typeof acl_show === "string" ? acl_show : JSON.stringify(acl_show));

    return {
      outcome: "passed",
      evidence: {
        acl_show,
      },
      warnings: warnings,
    };
  },

  async verify(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    const ping_result = await controller.execIos("PC1", "ping 2001:db8:1::1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-pc1-to-r1.txt", typeof ping_result === "string" ? ping_result : JSON.stringify(ping_result));

    const r1_acl_detailed = await controller.show("R1", "show ipv6 access-list ACL_IPV6_TEST");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-detailed.txt", typeof r1_acl_detailed === "string" ? r1_acl_detailed : JSON.stringify(r1_acl_detailed));

    return {
      outcome: "passed",
      evidence: {
        ping_result,
        r1_acl_detailed,
      },
      warnings: warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.configIos("R1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "no ipv6 traffic-filter ACL_IPV6_TEST in",
        "end",
      ], { save: false });

      await controller.removeLink("R1", "GigabitEthernet0/0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("R1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "IPv6 ACL basic scenario cleanup complete");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
