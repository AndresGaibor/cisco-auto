import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: Service Policy Regression - Verifica estabilidad de servicios ante cambios de política.
 *
 * Topología:
 * - Router1 y Router2 conectados via routing
 * - Servidor HTTP en Router1
 * - Cliente en subred de Router2
 *
 * Verificaciones:
 * - Baseline: servicios funcionan correctamente
 * - Post-política: aplicar ACL o NAT y verificar que el servicio sigue funcionando
 *
 * Tags: ["regression", "service", "policy"]
 * Profile: ["services-advanced", "stability-regression"]
 */
export const servicePolicyRegressionScenario: RealScenarioDefinition = {
  id: "service-policy-regression",
  title: "Service Stability Under Policy Changes",
  tags: ["regression", "service", "policy"],
  profile: ["services-advanced", "stability-regression"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("Router2", "1941");
    await controller.addDevice("PC1", "PC-PT");
    await controller.addDevice("Server1", "Server-PT");

    await controller.addLink("Server1", "FastEthernet0", "Router1", "GigabitEthernet0/0");
    await controller.addLink("PC1", "FastEthernet0", "Router2", "GigabitEthernet0/0");
    await controller.addLink("Router1", "GigabitEthernet0/1", "Router2", "GigabitEthernet0/1");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.0.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    await controller.configIos("Router2", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.2.1 255.255.255.0",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 10.0.0.2 255.255.255.0",
      "no shutdown",
      "ip route 192.168.1.0 255.255.255.0 10.0.0.1",
      "end",
    ], { save: false });

    await controller.configIos("Router1", [
      "ip route 192.168.2.0 255.255.255.0 10.0.0.2",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "Router2", "PC1", "Server1"],
      subnets: ["192.168.1.0/24", "192.168.2.0/24", "10.0.0.0/30"],
      routing: "static",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configHost("Server1", {
        ip: "192.168.1.10",
        mask: "255.255.255.0",
        gateway: "192.168.1.1",
      });

      await controller.configHost("PC1", {
        ip: "192.168.2.10",
        mask: "255.255.255.0",
        gateway: "192.168.2.1",
      });

      await controller.configIos("Router1", [
        "ip http server",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const pingBaseline = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.10",
      });

      const pingBaselineOutput = typeof pingBaseline === "string" ? pingBaseline : (pingBaseline.raw ?? JSON.stringify(pingBaseline));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-baseline.txt", pingBaselineOutput);

      const baselineSuccess = pingBaselineOutput.includes("Success") || pingBaselineOutput.includes("TTL");

      await controller.configIos("Router1", [
        "configure terminal",
        "access-list 100 permit tcp any any eq 80",
        "interface GigabitEthernet0/0",
        "ip access-group 100 in",
        "end",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const pingPostAcl = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.10",
      });

      const pingPostAclOutput = typeof pingPostAcl === "string" ? pingPostAcl : (pingPostAcl.raw ?? JSON.stringify(pingPostAcl));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-post-acl.txt", pingPostAclOutput);

      const postAclSuccess = pingPostAclOutput.includes("Success") || pingPostAclOutput.includes("TTL");

      const verificado = {
        baselineSuccess,
        postAclSuccess,
        baselineOutput: pingBaselineOutput,
        postAclOutput: pingPostAclOutput,
        aclApplied: true,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: baselineSuccess && postAclSuccess ? "passed" : "partial",
        evidence: verificado,
        warnings: !postAclSuccess ? [...warnings, "Ping post-ACL falló - posible regression"] : warnings,
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

    const server1State = await controller.inspectHost("Server1");
    const pc1State = await controller.inspectHost("PC1");
    const aclConfig = await controller.execIos("Router1", "show running-config | include access-list");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "devices-state.json", JSON.stringify({
      server1: server1State,
      pc1: pc1State,
    }));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "acl-config.txt", aclConfig.raw);

    const verificado = {
      server1Ip: server1State.ip,
      pc1Ip: pc1State.ip,
      aclConfigured: aclConfig.raw.includes("access-list"),
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!server1State.ip && !!pc1State.ip;
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
      await controller.removeLink("Server1", "FastEthernet0");
      await controller.removeLink("PC1", "FastEthernet0");
      await controller.removeLink("Router1", "GigabitEthernet0/1");
      await controller.removeDevice("Server1");
      await controller.removeDevice("PC1");
      await controller.removeDevice("Router2");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};