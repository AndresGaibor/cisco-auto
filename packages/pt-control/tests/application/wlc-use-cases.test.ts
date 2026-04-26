import { describe, it, expect, beforeEach } from "bun:test";
import {
  setupWlcNetwork,
  getWlcNetworkStatus,
  configureWlcIp,
  configureWlcGateway,
  enablePoE,
  addApPowerAdapter,
  configureSwitchSvi,
  type WlcPort,
} from "../../src/application/wlc/index.js";

function createMockOmniscience(evaluateResult: unknown): WlcPort {
  return {
    omniscience: {
      evaluate: async () => evaluateResult,
    },
  };
}

describe("WLC Use Cases", () => {
  describe("setupWlcNetwork", () => {
    it("retorna success=true cuando setup completa sin errores", async () => {
      const port = createMockOmniscience(JSON.stringify({
        success: true,
        configured: ["WLC1 (powered)", "WLC1 (192.168.10.2/24)", "SW1 Vlan10 (192.168.10.1/24)"],
        errors: [],
      }));

      const result = await setupWlcNetwork(port);

      expect(result.ok).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(result.data?.configured).toHaveLength(3);
      expect(result.data?.errors).toHaveLength(0);
      expect(result.advice).toContain("Usa pt wlc status para verificar el estado final");
    });

    it("retorna ok=false cuando errors array tiene contenido", async () => {
      const port = createMockOmniscience(JSON.stringify({
        success: false,
        configured: [],
        errors: ["WLC1: port not found"],
      }));

      const result = await setupWlcNetwork(port);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toContain("WLC1: port not found");
    });

    it("maneja JSON inválido gracefully", async () => {
      const port = createMockOmniscience("not json");

      const result = await setupWlcNetwork(port);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toContain("Unexpected");
    });

    it("maneja evaluate que lanza error", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("omni evaluate failed"); },
        },
      };

      const result = await setupWlcNetwork(port as WlcPort);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("omni evaluate failed");
    });
  });

  describe("getWlcNetworkStatus", () => {
    it("parsea devices y calcula allPowered correctamente", async () => {
      const port = createMockOmniscience(JSON.stringify([
        { name: "WLC1", power: true, model: "WLC", portsUp: ["management"], portsDown: [], ip: "192.168.10.2" },
        { name: "AP1", power: true, model: "LAP", portsUp: [], portsDown: ["GigabitEthernet0"], ip: "" },
      ]));

      const result = await getWlcNetworkStatus(port);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.devices).toHaveLength(2);
      expect(result.data.allPowered).toBe(true);
      expect(result.data.allConnected).toBe(false);
      expect(result.data.devices[0]?.name).toBe("WLC1");
    });

    it("retorna allPowered=false si algún device no tiene power", async () => {
      const port = createMockOmniscience(JSON.stringify([
        { name: "WLC1", power: true, model: "WLC", portsUp: ["management"], portsDown: [], ip: "192.168.10.2" },
        { name: "AP1", power: false, model: "LAP", portsUp: [], portsDown: [], ip: "" },
      ]));

      const result = await getWlcNetworkStatus(port);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.allPowered).toBe(false);
    });

    it("retorna empty devices gracefully", async () => {
      const port = createMockOmniscience(JSON.stringify([]));

      const result = await getWlcNetworkStatus(port);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.devices).toHaveLength(0);
    });

    it("retorna error cuando JSON es inválido", async () => {
      const port = createMockOmniscience("broken");

      const result = await getWlcNetworkStatus(port);

      expect(result.ok).toBe(false);
    });
  });

  describe("configureWlcIp", () => {
    it("configura IP exitosamente", async () => {
      const port = createMockOmniscience("WLC management set to 192.168.10.2/24, gateway 192.168.10.1");

      const result = await configureWlcIp(port, "192.168.10.2", "255.255.255.0", "192.168.10.1");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.ip).toBe("192.168.10.2");
      expect(result.data.mask).toBe("255.255.255.0");
      expect(result.data.gateway).toBe("192.168.10.1");
    });

    it("retorna error cuando evaluate lanza excepción", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("WLC not found"); },
        },
      };

      const result = await configureWlcIp(port as WlcPort, "192.168.10.2", "255.255.255.0", "192.168.10.1");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("WLC not found");
    });
  });

  describe("configureWlcGateway", () => {
    it("configura gateway exitosamente", async () => {
      const port = createMockOmniscience("WLC gateway set to 192.168.10.1");

      const result = await configureWlcGateway(port, "192.168.10.1");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.ip).toBe("192.168.10.1");
    });

    it("retorna error cuando falla", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("gateway config failed"); },
        },
      };

      const result = await configureWlcGateway(port as WlcPort, "192.168.10.1");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("gateway config failed");
    });
  });

  describe("enablePoE", () => {
    it("habilita PoE exitosamente", async () => {
      const port = createMockOmniscience("PoE enabled on SW1:FastEthernet0/3");

      const result = await enablePoE(port, "SW1", "FastEthernet0/3");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.switch).toBe("SW1");
      expect(result.data.port).toBe("FastEthernet0/3");
    });

    it("retorna error cuando evaluate lanza excepción", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("SW999 not found"); },
        },
      };

      const result = await enablePoE(port as WlcPort, "SW999", "Fake0/0");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("SW999 not found");
    });
  });

  describe("addApPowerAdapter", () => {
    it("agrega power adapter exitosamente", async () => {
      const port = createMockOmniscience("success");

      const result = await addApPowerAdapter(port, "AP1");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.ap).toBe("AP1");
    });

    it("retorna error cuando no retorna success", async () => {
      const port = createMockOmniscience("failed");

      const result = await addApPowerAdapter(port, "AP1");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toContain("Falló");
    });

    it("retorna error cuando evaluate lanza excepción", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("AP1 not found"); },
        },
      };

      const result = await addApPowerAdapter(port as WlcPort, "AP1");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("AP1 not found");
    });
  });

  describe("configureSwitchSvi", () => {
    it("configura SVI exitosamente", async () => {
      const port = createMockOmniscience("SW1 Vlan10 set to 192.168.10.1/24");

      const result = await configureSwitchSvi(port, "SW1", "10", "192.168.10.1", "255.255.255.0");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.switch).toBe("SW1");
      expect(result.data.vlan).toBe("10");
      expect(result.data.ip).toBe("192.168.10.1/255.255.255.0");
    });

    it("retorna error cuando evaluate lanza excepción", async () => {
      const port = {
        omniscience: {
          evaluate: async () => { throw new Error("SW999 Vlan99 not found"); },
        },
      };

      const result = await configureSwitchSvi(port as WlcPort, "SW999", "99", "10.0.0.1", "255.255.255.0");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error?.message).toBe("SW999 Vlan99 not found");
    });
  });
});