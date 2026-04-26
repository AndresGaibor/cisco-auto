import { describe, it, expect } from "bun:test";
import {
  parsePool,
  parsePools,
  applyDhcpServerConfig,
  inspectDhcpServer,
  type DhcpServerPort,
  type DhcpServerInspectRaw,
} from "../../src/application/dhcp-server/index.js";

function createMockDhcpPort(overrides?: {
  configureDhcpServer?: () => Promise<void>;
  inspectDhcpServer?: () => Promise<DhcpServerInspectRaw>;
}): DhcpServerPort {
  return {
    configureDhcpServer: overrides?.configureDhcpServer ?? (async () => {}),
    inspectDhcpServer: overrides?.inspectDhcpServer ?? (async () => ({
      ok: true,
      device: "R1",
      enabled: true,
      pools: [],
      excludedAddresses: [],
    })),
  };
}

describe("DHCP Server Use Cases", () => {
  describe("parsePool", () => {
    it("parsea pool válido con 4 campos", () => {
      const result = parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1");

      expect(result.name).toBe("LAN");
      expect(result.network).toBe("192.168.1.0");
      expect(result.mask).toBe("255.255.255.0");
      expect(result.router).toBe("192.168.1.1");
    });

    it("parsea pool con espacios y los trimea", () => {
      const result = parsePool("  WIFI , 192.168.2.0 , 255.255.255.0 , 192.168.2.1  ");

      expect(result.name).toBe("WIFI");
      expect(result.network).toBe("192.168.2.0");
      expect(result.mask).toBe("255.255.255.0");
      expect(result.router).toBe("192.168.2.1");
    });

    it("lanza error cuando hay menos de 4 campos", () => {
      expect(() => parsePool("LAN,192.168.1.0,255.255.255.0")).toThrow(/Pool inválido/);
    });

    it("lanza error cuando hay más de 4 campos", () => {
      expect(() => parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1,extra")).toThrow(/Pool inválido/);
    });

    it("lanza error cuando pool está vacío", () => {
      expect(() => parsePool("")).toThrow(/Pool inválido/);
    });
  });

  describe("parsePools", () => {
    it("parsea múltiples pools", () => {
      const pools = parsePools([
        "LAN,192.168.1.0,255.255.255.0,192.168.1.1",
        "WIFI,192.168.2.0,255.255.255.0,192.168.2.1",
      ]);

      expect(pools).toHaveLength(2);
      expect(pools[0]!.name).toBe("LAN");
      expect(pools[1]!.name).toBe("WIFI");
    });

    it("lanza error si algún pool es inválido", () => {
      expect(() => parsePools(["LAN,192.168.1.0,255.255.255.0,192.168.1.1", "BROKEN"]))
        .toThrow(/Pool inválido/);
    });
  });

  describe("applyDhcpServerConfig", () => {
    it("aplica configuración exitosamente", async () => {
      let configured = false;
      const port = createMockDhcpPort({
        configureDhcpServer: async () => { configured = true; },
      });

      const result = await applyDhcpServerConfig(
        port,
        "R1",
        true,
        "FastEthernet0",
        [{ name: "LAN", network: "192.168.1.0", mask: "255.255.255.0", router: "192.168.1.1" }],
        ["192.168.1.1-192.168.1.10"],
      );

      if (!result.ok) throw new Error(`Expected ok, got: ${result.error.message}`);
      expect(result.data.device).toBe("R1");
      expect(result.data.enabled).toBe(true);
      expect(result.data.port).toBe("FastEthernet0");
      expect(configured).toBe(true);
    });

    it("retorna error cuando configureDhcpServer falla", async () => {
      const port = createMockDhcpPort({
        configureDhcpServer: async () => { throw new Error("config failed"); },
      });

      const result = await applyDhcpServerConfig(port, "R1", true, "FastEthernet0", [], []);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toBe("config failed");
    });

    it("incluye advice de verificación", async () => {
      const port = createMockDhcpPort();

      const result = await applyDhcpServerConfig(port, "R1", true, "FastEthernet0", [], []);

      if (!result.ok) throw new Error(`Expected ok, got: ${result.error.message}`);
      expect(result.advice).toContain("Usa pt dhcp-server inspect R1 para verificar");
    });
  });

  describe("inspectDhcpServer", () => {
    it("inspecciona estado exitosamente", async () => {
      const port = createMockDhcpPort({
        inspectDhcpServer: async () => ({
          ok: true,
          device: "R1",
          enabled: true,
          pools: [
            {
              name: "LAN",
              network: "192.168.1.0",
              mask: "255.255.255.0",
              defaultRouter: "192.168.1.1",
              leaseCount: 5,
              leases: [],
            },
          ],
          excludedAddresses: [{ start: "192.168.1.1", end: "192.168.1.10" }],
        }),
      });

      const result = await inspectDhcpServer(port, "R1", "FastEthernet0");

      if (!result.ok) throw new Error(`Expected ok, got: ${result.error.message}`);
      expect(result.data.device).toBe("R1");
      expect(result.data.pools).toHaveLength(1);
      expect(result.data.pools[0]!.name).toBe("LAN");
      expect(result.data.excludedRanges).toEqual(["192.168.1.1-192.168.1.10"]);
    });

    it("retorna error cuando inspectDhcpServer falla", async () => {
      const port = createMockDhcpPort({
        inspectDhcpServer: async () => {
          throw new Error("device not found");
        },
      });

      const result = await inspectDhcpServer(port, "R999", "FastEthernet0");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toBe("device not found");
    });

    it("retorna error cuando inspectDhcpServer retorna ok=false", async () => {
      const port = createMockDhcpPort({
        inspectDhcpServer: async () => ({
          ok: false,
          device: "R1",
          enabled: false,
          pools: [],
          excludedAddresses: [],
        }),
      });

      const result = await inspectDhcpServer(port, "R1", "FastEthernet0");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain("No se pudo inspeccionar");
    });

    it("maneja pools sin defaultRouter gracefully", async () => {
      const port = createMockDhcpPort({
        inspectDhcpServer: async () => ({
          ok: true,
          device: "R1",
          enabled: true,
          pools: [{
            name: "TEST",
            network: "10.0.0.0",
            mask: "255.255.255.0",
            defaultRouter: "",
            leaseCount: 0,
            leases: [],
          }],
          excludedAddresses: [],
        }),
      });

      const result = await inspectDhcpServer(port, "R1", "FastEthernet0");

      if (!result.ok) throw new Error(`Expected ok, got: ${result.error.message}`);
      expect(result.data.pools[0]!.router).toBe("");
    });
  });
});