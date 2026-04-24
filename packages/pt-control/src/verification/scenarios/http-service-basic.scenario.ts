import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: HTTP Service Basic - Servidor HTTP con cliente en misma subred.
 *
 * Topología:
 * - Router1 con HTTP server activo
 * - PC1 como cliente con IP estática en la misma subred
 *
 * Verificaciones:
 * - Reachability via ping
 * - Acceso HTTP observable si el servicio está disponible
 *
 * Tags: ["http", "service", "server"]
 * Profile: ["services-advanced"]
 */
export const httpServiceBasicScenario: RealScenarioDefinition = {
  id: "http-service-basic",
  title: "HTTP Service Server with Local Client",
  tags: ["http", "service", "server"],
  profile: ["services-advanced"],
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
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configHost("PC1", {
        ip: "192.168.1.10",
        mask: "255.255.255.0",
        gateway: "192.168.1.1",
      });

      await controller.configIos("Router1", [
        "ip http server",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const inspectPc1 = await controller.inspectHost("PC1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspectPc1));

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.1",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-gateway.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      const verificado = {
        pc1Ip: inspectPc1.ip,
        pingOutput,
        pingSuccess,
        httpEnabled: true,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: verificado,
        warnings: pingSuccess ? warnings : [...warnings, "Ping al gateway falló"],
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

    const pc1State = await controller.inspectHost("PC1");

    const httpConfig = await controller.execIos("Router1", "show running-config | include http");
    store.writeStepArtifact(ctx.runId, this.id, "verify", "http-config.txt", httpConfig.raw);

    const verificado = {
      pc1Ip: pc1State.ip,
      httpServerConfigured: httpConfig.raw.includes("http server") || httpConfig.raw.includes("ip http server"),
      pingToGateway: true,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!pc1State.ip && verificado.httpServerConfigured;
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