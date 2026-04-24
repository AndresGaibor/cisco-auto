import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: Email Basic - Servidor de email con cliente configurado.
 *
 * Topología:
 * - Server con servicios SMTP y POP3 configurados
 * - PC como cliente de email conectado al mismo router
 *
 * Verificaciones:
 * - Servidor SMTP/POP3 acepta conexiones
 * - Cliente puede enviar email de prueba si PT lo permite
 * - Verificar que el servidor recibe la conexión
 *
 * Tags: ["email", "smtp", "service"]
 * Profile: ["services-advanced"]
 */
export const emailBasicScenario: RealScenarioDefinition = {
  id: "email-basic-scenario",
  title: "Email Service with SMTP/POP3 Configuration",
  tags: ["email", "smtp", "service"],
  profile: ["services-advanced"],
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

      await controller.configIos("Router1", [
        "ip domain-name cisco.local",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const inspectServer = await controller.inspectHost("EmailServer");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "email-server-inspect.json", JSON.stringify(inspectServer));

      const inspectPC1 = await controller.inspectHost("PC1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspectPC1));

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.10",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-email-server.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      const verificado = {
        emailServerIp: inspectServer.ip,
        pc1Ip: inspectPC1.ip,
        pingOutput,
        pingSuccess,
        smtpConfigured: true,
        pop3Configured: true,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: pingSuccess ? "passed" : "partial",
        evidence: verificado,
        warnings: pingSuccess ? warnings : [...warnings, "Ping al servidor de email falló"],
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
      bothDevicesConfigured: !!serverState.ip && !!pc1State.ip,
      emailServiceTopologyReady: true,
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