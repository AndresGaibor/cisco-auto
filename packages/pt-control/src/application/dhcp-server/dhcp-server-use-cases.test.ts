import { describe, expect, it } from "bun:test";
import {
  parsePool,
  parsePools,
  applyDhcpServerConfig,
  inspectDhcpServer,
} from "./dhcp-server-use-cases";
import type { DhcpServerPort } from "./dhcp-server-use-cases";

describe("dhcp-server-use-cases", () => {
  it("exporta parsePool como función", () => {
    expect(typeof parsePool).toBe("function");
  });

  it("exporta parsePools como función", () => {
    expect(typeof parsePools).toBe("function");
  });

  it("exporta applyDhcpServerConfig como función", () => {
    expect(typeof applyDhcpServerConfig).toBe("function");
  });

  it("exporta inspectDhcpServer como función", () => {
    expect(typeof inspectDhcpServer).toBe("function");
  });

  it("exporta DhcpServerPort como interfaz", () => {
    expect(typeof DhcpServerPort).toBe("undefined");
  });

  it("parsePool parsea string de pool correctamente", () => {
    const result = parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1");
    expect(result.name).toBe("LAN");
    expect(result.network).toBe("192.168.1.0");
    expect(result.mask).toBe("255.255.255.0");
    expect(result.router).toBe("192.168.1.1");
  });

  it("parsePool lanza error para formato inválido", () => {
    expect(() => parsePool("invalid")).toThrow();
  });

  it("parsePools retorna array de pools", () => {
    const pools = parsePools([
      "LAN,192.168.1.0,255.255.255.0,192.168.1.1",
      "WLAN,192.168.2.0,255.255.255.0,192.168.2.1",
    ]);
    expect(pools).toHaveLength(2);
    expect(pools[0]!.name).toBe("LAN");
    expect(pools[1]!.name).toBe("WLAN");
  });
});
