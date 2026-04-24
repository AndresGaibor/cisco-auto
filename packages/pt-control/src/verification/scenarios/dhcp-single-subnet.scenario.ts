import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const dhcpSingleSubnetScenario: RealScenarioDefinition = {
  id: "dhcp-single-subnet",
  title: "DHCP Server Single Subnet Configuration",
  tags: ["dhcp", "host", "service"],
  profile: ["dhcp-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("PC1", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Router1", "GigabitEthernet0/0");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "PC1"],
      gateway: "192.168.1.1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configureDhcpServer("Router1", {
        poolName: "DHCP_POOL",
        network: "192.168.1.0",
        subnetMask: "255.255.255.0",
        defaultRouter: "192.168.1.1",
        leaseTime: 7,
      });

      await controller.configHost("PC1", { dhcp: true });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const inspectResult = await controller.inspectHost("PC1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspectResult));

      const ipAssigned = inspectResult.ip ?? "";
      const hasIpFromPool = ipAssigned.startsWith("192.168.1.");

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.1",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-gateway.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      return {
        outcome: hasIpFromPool && pingSuccess ? "passed" : "partial",
        evidence: { ipAssigned, pingOutput, hasIpFromPool, pingSuccess },
        warnings: hasIpFromPool ? warnings : [...warnings, "PC1 puede no haber recibido IP por DHCP"],
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

    const dhcpInspect = await controller.inspectDhcpServer("Router1");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-server-inspect.json", JSON.stringify(dhcpInspect));

    const verificado = {
      poolCount: dhcpInspect.poolCount,
      pools: dhcpInspect.pools,
      ipAssigned: (await controller.inspectHost("PC1")).ip,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "dhcp-verification.json", JSON.stringify(verificado, null, 2));

    const success = dhcpInspect.poolCount > 0 && !!verificado.ipAssigned;
    return {
      outcome: success ? "passed" : "failed",
      evidence: verificado,
      warnings,
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};
