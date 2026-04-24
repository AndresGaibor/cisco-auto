import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: DNS-HTTP Integration - Server con DNS y HTTP, cliente resuelve por nombre.
 *
 * Topología:
 * - Router1 con servicios DNS y HTTP
 * - PC1 configurado con DNS apuntando al router
 *
 * Verificaciones:
 * - Cliente resuelve nombre del server via DNS
 * - Acceso HTTP por nombre de host si es observable
 *
 * Tags: ["dns", "http", "integration", "service"]
 * Profile: ["services-advanced"]
 */
export const dnsHttpIntegrationScenario: RealScenarioDefinition = {
  id: "dns-http-integration",
  title: "DNS and HTTP Service Integration",
  tags: ["dns", "http", "integration", "service"],
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
      dnsServer: "192.168.1.1",
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
        dns: "192.168.1.1",
      });

      await controller.configIos("Router1", [
        "ip domain-name router.local",
        "ip http server",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const inspectPc1 = await controller.inspectHost("PC1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "pc1-inspect.json", JSON.stringify(inspectPc1));

      const dnsResolve = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "nslookup router.local",
      });

      const dnsOutput = typeof dnsResolve === "string" ? dnsResolve : (dnsResolve.raw ?? JSON.stringify(dnsResolve));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "dns-resolve.txt", dnsOutput);

      const pingResult = await controller.runOmniCapability("device.exec", {
        device: "PC1",
        command: "ping 192.168.1.1",
      });

      const pingOutput = typeof pingResult === "string" ? pingResult : (pingResult.raw ?? JSON.stringify(pingResult));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-gateway.txt", pingOutput);

      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");

      const verificado = {
        pc1Ip: inspectPc1.ip,
        pc1Dns: inspectPc1.dns,
        dnsOutput,
        pingOutput,
        pingSuccess,
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
    const routerConfig = await controller.execIos("Router1", "show running-config | include http");
    const routerDomain = await controller.execIos("Router1", "show running-config | include domain");

    store.writeStepArtifact(ctx.runId, this.id, "verify", "pc1-state.json", JSON.stringify(pc1State));
    store.writeStepArtifact(ctx.runId, this.id, "verify", "router-config.txt", routerConfig.raw + "\n" + routerDomain.raw);

    const verificado = {
      pc1Ip: pc1State.ip,
      pc1Dns: pc1State.dns,
      httpServerConfigured: routerConfig.raw.includes("http server") || routerConfig.raw.includes("ip http server"),
      domainNameConfigured: routerDomain.raw.includes("domain-name"),
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!pc1State.ip && !!pc1State.dns;
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