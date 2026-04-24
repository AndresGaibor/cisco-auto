import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: Wireless Basic - Access Point con laptops wireless.
 *
 * Topología:
 * - Router1 como gateway
 * - AccessPoint wireless conectado al router
 * - 2 Laptops conectadas wireless al AP
 *
 * Verificaciones:
 * - Configurar red WLAN básica
 * - Laptops pueden conectarse wireless
 * - Verificar conectividad entre laptops y router via AP
 * - Verificar que el AP muestra devices asociados si es observable
 *
 * Tags: ["wireless", "wifi", "laptop", "access-point"]
 * Profile: ["wireless-core"]
 */
export const wirelessBasicScenario: RealScenarioDefinition = {
  id: "wireless-basic-scenario",
  title: "Wireless Access Point with Laptop Clients",
  tags: ["wireless", "wifi", "laptop", "access-point"],
  profile: ["wireless-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("AP", "AccessPoint-PT");
    await controller.addDevice("Laptop1", "Laptop-PT");
    await controller.addDevice("Laptop2", "Laptop-PT");

    await controller.addLink("AP", "FastEthernet0", "Router1", "GigabitEthernet0/0");

    await controller.configIos("Router1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "end",
    ], { save: false });

    store.writeStepArtifact(ctx.runId, this.id, "setup", "topology.json", JSON.stringify({
      devices: ["Router1", "AP", "Laptop1", "Laptop2"],
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
      wirelessNetwork: "WLAN1",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configHost("Router1", {
        ip: "192.168.1.1",
        mask: "255.255.255.0",
        gateway: undefined,
      });

      await controller.configIos("AP", [
        "enable",
        "configure terminal",
        "ssid WLAN1",
        "ip address 192.168.1.2 255.255.255.0",
        "no shutdown",
        "end",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const inspectAP = await controller.inspectDevice("AP");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ap-inspect.json", JSON.stringify(inspectAP));

      const inspectLaptop1 = await controller.inspectHost("Laptop1");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "laptop1-inspect.json", JSON.stringify(inspectLaptop1));

      const inspectLaptop2 = await controller.inspectHost("Laptop2");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "laptop2-inspect.json", JSON.stringify(inspectLaptop2));

      const pingLaptop1 = await controller.runOmniCapability("device.exec", {
        device: "Laptop1",
        command: "ping 192.168.1.1",
      });

      const pingLaptop1Output = typeof pingLaptop1 === "string" ? pingLaptop1 : (pingLaptop1.raw ?? JSON.stringify(pingLaptop1));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-laptop1-gateway.txt", pingLaptop1Output);

      const pingLaptop2 = await controller.runOmniCapability("device.exec", {
        device: "Laptop2",
        command: "ping 192.168.1.1",
      });

      const pingLaptop2Output = typeof pingLaptop2 === "string" ? pingLaptop2 : (pingLaptop2.raw ?? JSON.stringify(pingLaptop2));
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ping-laptop2-gateway.txt", pingLaptop2Output);

      const pingSuccessLaptop1 = pingLaptop1Output.includes("Success") || pingLaptop1Output.includes("TTL");
      const pingSuccessLaptop2 = pingLaptop2Output.includes("Success") || pingLaptop2Output.includes("TTL");

      const verificado = {
        apConfigured: !!inspectAP,
        laptop1Connected: !!inspectLaptop1.ip,
        laptop2Connected: !!inspectLaptop2.ip,
        laptop1PingGateway: pingSuccessLaptop1,
        laptop2PingGateway: pingSuccessLaptop2,
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      const bothConnected = pingSuccessLaptop1 && pingSuccessLaptop2;
      return {
        outcome: bothConnected ? "passed" : "partial",
        evidence: verificado,
        warnings: bothConnected ? warnings : [...warnings, "Una o ambas laptops no pudieron hacer ping al gateway"],
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

    const apState = await controller.inspectDevice("AP");
    const laptop1State = await controller.inspectHost("Laptop1");
    const laptop2State = await controller.inspectHost("Laptop2");

    const verificado = {
      apState: apState.name,
      laptop1Connected: !!laptop1State.ip,
      laptop2Connected: !!laptop2State.ip,
      wirelessTopologyComplete: !!laptop1State.ip && !!laptop2State.ip,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!laptop1State.ip && !!laptop2State.ip;
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
      await controller.removeLink("AP", "FastEthernet0");
      await controller.removeDevice("Laptop2");
      await controller.removeDevice("Laptop1");
      await controller.removeDevice("AP");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};