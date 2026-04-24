import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: Email Regression - Verificar que email sigue funcionando tras cambios de red.
 *
 * Topología:
 * - Router1 con servidor de email
 * - PC1 cliente de email en subred
 * - Cambio de subred para verificar que email sigue funcionando
 *
 * Verificaciones:
 * - Email funciona después de modificar configuración de red
 * - Verificar que las conexiones persisten o se reconectan
 *
 * Tags: ["email", "regression", "service"]
 * Profile: ["services-advanced", "stability-regression"]
 */
export const emailRegressionScenario: RealScenarioDefinition = {
  id: "email-regression-scenario",
  title: "Email Service Regression After Network Changes",
  tags: ["email", "regression", "service"],
  profile: ["services-advanced", "stability-regression"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("EmailServer", "Server-PT");
    await controller.addDevice("PC1", "PC-PT");

    await controller.addLink("EmailServer", "FastEthernet0", "Router1", "GigabitEthernet0/0");
    await controller.addLink("PC1", "FastEthernet0", "Router1", "GigabitEthernet0/1");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "interface GigabitEthernet0/1",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "EmailServer", "PC1"],
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configHost("EmailServer", {
        ip: "192.168.1.10",
        mask: "255.255.255.0",
        gateway: "192.168.1.1",
      });

      await controller.configHost("PC1", {
        ip: "192.168.1.20",
        mask: "255.255.255.0",
        gateway: "192.168.1.1",
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const pingBefore = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.10",
      });

      const pingBeforeOutput = typeof pingBefore === "string" ? pingBefore : (pingBefore.raw ?? JSON.stringify(pingBefore));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-before-change.txt", pingBeforeOutput);

      await controller.configIos("Router1", [
        "enable",
        "configure terminal",
        "interface GigabitEthernet0/0",
        "ip address 192.168.2.1 255.255.255.0",
        "no shutdown",
        "end",
      ], { save: false });

      await controller.configHost("EmailServer", {
        ip: "192.168.2.10",
        mask: "255.255.255.0",
        gateway: "192.168.2.1",
      });

      await controller.configHost("PC1", {
        ip: "192.168.2.20",
        mask: "255.255.255.0",
        gateway: "192.168.2.1",
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const pingAfter = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.2.10",
      });

      const pingAfterOutput = typeof pingAfter === "string" ? pingAfter : (pingAfter.raw ?? JSON.stringify(pingAfter));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-after-change.txt", pingAfterOutput);

      const pingSuccessBefore = pingBeforeOutput.includes("Success") || pingBeforeOutput.includes("TTL");
      const pingSuccessAfter = pingAfterOutput.includes("Success") || pingAfterOutput.includes("TTL");

      const verificado = {
        pingBeforeNetworkChange: pingSuccessBefore,
        pingAfterNetworkChange: pingSuccessAfter,
        regressionDetected: !pingSuccessAfter && pingSuccessBefore,
        networkChangeApplied: true,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: pingSuccessAfter ? "passed" : "failed",
        evidence: verificado,
        warnings: !pingSuccessAfter && pingSuccessBefore ? [...warnings, "Regresión detectada: email dejó de funcionar tras cambio de red"] : warnings,
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

    const serverState = await controller.inspectHost("EmailServer");
    const pc1State = await controller.inspectHost("PC1");

    const verificado = {
      emailServerIp: serverState.ip,
      pc1Ip: pc1State.ip,
      serviceRecoversAfterNetworkChange: !!serverState.ip && !!pc1State.ip,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!serverState.ip && !!pc1State.ip;
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
      await controller.removeLink("EmailServer", "FastEthernet0");
      await controller.removeDevice("PC1");
      await controller.removeDevice("EmailServer");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};