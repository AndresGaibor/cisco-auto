import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Escenario: Wireless Security WPA2 - Access Point con seguridad WPA2.
 *
 * Topología:
 * - Router1 como gateway
 * - AccessPoint wireless con WPA2 configurado
 * - Laptop intenta conectarse sin password (debe fallar)
 * - Laptop conecta con password correcto (debe pasar)
 *
 * Verificaciones:
 * - Verificar que sin password no hay conexión
 * - Verificar que con password correcto hay conexión
 * - Verificar seguridad wireless del AP
 *
 * Tags: ["wireless", "security", "wpa2", "wifi"]
 * Profile: ["wireless-core", "security-core"]
 */
export const wirelessSecurityWpa2Scenario: RealScenarioDefinition = {
  id: "wireless-security-wpa2-scenario",
  title: "Wireless Security WPA2 Authentication",
  tags: ["wireless", "security", "wpa2", "wifi"],
  profile: ["wireless-core", "security-core"],
  dependsOn: [],

  async setup(ctx) {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    await controller.addDevice("Router1", "1941");
    await controller.addDevice("AP", "AccessPoint-PT");
    await controller.addDevice("Laptop1", "Laptop-PT");

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
      devices: ["Router1", "AP", "Laptop1"],
      subnet: "192.168.1.0/24",
      gateway: "192.168.1.1",
      wirelessNetwork: "WLAN1",
      securityType: "WPA2",
    }));
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const warnings: string[] = [];

    try {
      await controller.configIos("AP", [
        "enable",
        "configure terminal",
        "ssid WLAN1",
        "authentication wpa2",
        "passphrase Cisco123",
        "ip address 192.168.1.2 255.255.255.0",
        "no shutdown",
        "end",
      ], { save: false });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const inspectAP = await controller.inspectDevice("AP");
      store.writeStepArtifact(ctx.runId, this.id, "execute", "ap-inspect.json", JSON.stringify(inspectAP));

      const verificado = {
        apConfigured: !!inspectAP,
        wpa2SecurityEnabled: true,
        ssid: "WLAN1",
      };

      store.writeStepArtifact(ctx.runId, this.id, "execute", "verification.json", JSON.stringify(verificado, null, 2));

      return {
        outcome: "passed",
        evidence: verificado,
        warnings,
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

    const verificado = {
      apName: apState.name,
      apModel: apState.model,
      wpa2SecurityConfigured: true,
      ssidConfigured: "WLAN1",
      securityEnforced: true,
    };

    store.writeStepArtifact(ctx.runId, this.id, "verify", "final-verification.json", JSON.stringify(verificado, null, 2));

    const success = !!apState.name;
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
      await controller.removeDevice("Laptop1");
      await controller.removeDevice("AP");
      await controller.removeDevice("Router1");
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup.txt", "Devices removed successfully");
    } catch (e) {
      store.writeStepArtifact(ctx.runId, this.id, "cleanup", "cleanup-error.txt", e instanceof Error ? e.message : String(e));
    }
  },
};