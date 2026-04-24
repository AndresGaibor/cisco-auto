import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

export const hostCommandPromptConnectivityScenario: RealScenarioDefinition = {
  id: "host-command-prompt-connectivity",
  title: "Host Command Prompt Connectivity Check",
  tags: ["host", "connectivity", "ping", "smoke"],
  profile: ["host", "network-core", "smoke"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Gateway", "1941");
    await controller.addDevice("PC1", "PC-PT");

    await controller.addLink("PC1", "FastEthernet0", "Gateway", "GigabitEthernet0/0");

    await controller.configIos("Gateway", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    await controller.configHost("PC1", {
      ip: "192.168.1.10",
      mask: "255.255.255.0",
      gateway: "192.168.1.1",
    });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Gateway", "PC1"],
      gatewayIp: "192.168.1.1",
      pc1Ip: "192.168.1.10",
      pc1Gateway: "192.168.1.1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      const inspectResult = await controller.inspectHost("PC1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspectResult));

      const result = await controller.sendPing("PC1", "192.168.1.1");
      const pingOutput = result.raw;
      const pingSuccess = result.success;

      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-gateway.txt", pingOutput);

      const evidencia = {
        pc1Ip: inspectResult.ip,
        pc1Gateway: inspectResult.gateway,
        pingOutput: pingOutput,
        pingSuccess: pingSuccess,
      };

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: evidencia,
        warnings: pingSuccess ? warnings : [...warnings, "Ping puede haber fallado"],
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

    const arpResult = await controller.execHost("PC1", "arp -a", "host.arp");
    const arpOutput = arpResult.raw;
    store.writeStepArtifact(ctx.runId, this.id, "verify", "arp-output.txt", arpOutput);

    const pingResult = await controller.sendPing("PC1", "8.8.8.8");
    const pingInternet = pingResult.raw;
    store.writeStepArtifact(ctx.runId, this.id, "verify", "ping-internet.txt", pingInternet);

    const hasArpEntry = arpResult.success && (arpOutput.includes("192.168.1.1") || arpOutput.includes("gateway"));
    const internetReachable = pingResult.success;

    const verificado = {
      hasArpEntry: hasArpEntry,
      arpOutput: arpOutput,
      internetReachable: internetReachable,
      pingInternetOutput: pingInternet,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "connectivity-verification.json", JSON.stringify(verificado, null, 2));

    const success = hasArpEntry || internetReachable;

    return {
      outcome: success ? "passed" : "partial",
      evidence: verificado,
      warnings: success ? warnings : [...warnings, "Conectividad no verificada completamente"],
    };
  },

  async cleanup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    try {
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("Gateway");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};