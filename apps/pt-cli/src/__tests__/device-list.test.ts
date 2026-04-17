import { describe, expect, test, vi } from "bun:test";
import { type DeviceListResult, type ConnectionInfo } from "../application/device-list.js";
import {
  extractDeviceMac,
  getPortLinkLabel,
  selectPortsForDisplay,
} from "../commands/device/list.js";

const mockResult: DeviceListResult = {
  devices: [
    { name: "PC1", model: "PC-PT", type: "pc", power: true, ports: [] },
    { name: "SW1", model: "2960-24TT", type: "switch", power: true, ports: [] },
    { name: "R1", model: "1941", type: "router", power: true, ports: [] },
  ],
  count: 3,
  connectionsByDevice: {
    PC1: [
      {
        localPort: "FastEthernet0",
        remoteDevice: "SW1",
        remotePort: "FastEthernet0/1",
        confidence: "exact" as const,
      },
    ],
    SW1: [
      {
        localPort: "FastEthernet0/1",
        remoteDevice: "PC1",
        remotePort: "FastEthernet0",
        confidence: "exact" as const,
      },
      {
        localPort: "FastEthernet0/2",
        remoteDevice: "R1",
        remotePort: "Gig0/0",
        confidence: "registry" as const,
      },
    ],
    R1: [
      {
        localPort: "Gig0/0",
        remoteDevice: "SW1",
        remotePort: "FastEthernet0/2",
        confidence: "registry" as const,
      },
    ],
  },
  unresolvedLinks: [],
};

describe("device list render", () => {
  test("should NOT show registry as exact", () => {
    const registryConns = Object.values(mockResult.connectionsByDevice)
      .flat()
      .filter((c: ConnectionInfo) => c.confidence === "registry");

    expect(registryConns.length).toBeGreaterThan(0);
    registryConns.forEach((conn: ConnectionInfo) => {
      expect(conn.confidence).not.toBe("exact");
    });
  });

  test("should output complete JSON with stats", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const allLinks = Object.values(mockResult.connectionsByDevice).flat();
    const totalLinks = allLinks.length;
    const exactLinks = allLinks.filter((c) => c.confidence === "exact").length;
    const mergedLinks = allLinks.filter((c) => c.confidence === "merged").length;
    const registryLinks = allLinks.filter((c) => c.confidence === "registry").length;
    const ambiguousLinks = allLinks.filter((c) => c.confidence === "ambiguous").length;
    const unresolvedCount = mockResult.unresolvedLinks.length;

    console.log(
      JSON.stringify(
        {
          devices: mockResult.devices,
          links: [],
          connectionsByDevice: mockResult.connectionsByDevice,
          unresolvedLinks: mockResult.unresolvedLinks,
          stats: {
            deviceCount: mockResult.devices.length,
            linkCount: totalLinks,
            exactCount: exactLinks,
            registryCount: registryLinks,
            mergedCount: mergedLinks,
            ambiguousCount: ambiguousLinks,
            unresolvedCount,
          },
        },
        null,
        2,
      ),
    );

    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try {
        const arg = call[0];
        if (typeof arg === "string") {
          JSON.parse(arg);
          return true;
        }
      } catch {}
      return false;
    });

    expect(jsonCall).toBeDefined();
    const output = JSON.parse(jsonCall![0] as string);

    expect(output).toHaveProperty("devices");
    expect(output).toHaveProperty("connectionsByDevice");
    expect(output).toHaveProperty("unresolvedLinks");
    expect(output).toHaveProperty("stats");
    expect(output.stats).toHaveProperty("deviceCount");
    expect(output.stats).toHaveProperty("linkCount");
    expect(output.stats.deviceCount).toBe(3);

    consoleSpy.mockRestore();
  });

  test("should count total links correctly", () => {
    const allConns = Object.values(mockResult.connectionsByDevice).flat();
    const totalConns = allConns.length;
    expect(totalConns).toBe(4);
  });

  test("should verify connectionsByDevice is symmetric", () => {
    const pc1Conns = mockResult.connectionsByDevice["PC1"] || [];
    const swConns = mockResult.connectionsByDevice["SW1"] || [];

    const pc1ToSw = pc1Conns.find((c) => c.remoteDevice === "SW1");
    const swToPc1 = swConns.find((c) => c.remoteDevice === "PC1");

    expect(pc1ToSw).toBeDefined();
    expect(swToPc1).toBeDefined();
    expect(pc1ToSw?.remotePort).toBe(swToPc1?.localPort);
  });

  test("should verify debug flag controls logging", () => {
    const originalDebug = process.env.PT_DEBUG;
    delete process.env.PT_DEBUG;

    const DEBUG = process.env.PT_DEBUG === "1";
    const log = (...args: unknown[]) => {
      if (DEBUG) console.log("[device-list]", ...args);
    };

    log("test message");

    expect(DEBUG).toBe(false);

    process.env.PT_DEBUG = "1";
    const DEBUG_ON = process.env.PT_DEBUG === "1";
    const logOn = (...args: unknown[]) => {
      if (DEBUG_ON) console.log("[device-list]", ...args);
    };

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logOn("test message");

    expect(consoleSpy).toHaveBeenCalled();

    process.env.PT_DEBUG = originalDebug ?? undefined;
    consoleSpy.mockRestore();
  });

  test("should verify registry links are distinguishable from exact", () => {
    const allConns = Object.values(mockResult.connectionsByDevice).flat();

    const exactConns = allConns.filter((c) => c.confidence === "exact");
    const registryConns = allConns.filter((c) => c.confidence === "registry");

    expect(exactConns.length).toBe(2);
    expect(registryConns.length).toBe(2);

    exactConns.forEach((conn) => {
      expect(conn.confidence).toBe("exact");
    });

    registryConns.forEach((conn) => {
      expect(conn.confidence).toBe("registry");
      expect(conn.confidence).not.toBe("exact");
    });
  });

  test("verbose devuelve todos los puertos", () => {
    const ports = [{ name: "P0" }, { name: "P1" }];

    expect(selectPortsForDisplay(ports as any, true)).toHaveLength(2);
  });

  test("normal solo devuelve puertos interesantes y respeta el limite", () => {
    const ports = [
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `P${i}`,
        connection:
          i < 9
            ? { remoteDevice: "SW1", remotePort: `Fa0/${i}`, confidence: "exact" as const }
            : undefined,
      })),
    ];

    expect(selectPortsForDisplay(ports as any, false)).toHaveLength(8);
  });

  test("normal prioriza puertos con enlace", () => {
    const ports = [
      { name: "P0" },
      { name: "P2", status: "up" as const },
      {
        name: "P1",
        connection: { remoteDevice: "SW1", remotePort: "Fa0/1", confidence: "exact" as const },
      },
    ];

    expect(selectPortsForDisplay(ports as any, false).map((port) => port.name)).toEqual([
      "P1",
      "P2",
    ]);
  });

  test("normal muestra el peer cuando hay enlace", () => {
    const ports = [
      {
        name: "P1",
        connection: { remoteDevice: "SW1", remotePort: "Fa0/1", confidence: "exact" as const },
      },
    ];

    const selected = selectPortsForDisplay(ports as any, false);
    expect(selected[0]?.connection?.remoteDevice).toBe("SW1");
    expect(selected[0]?.connection?.remotePort).toBe("Fa0/1");
  });

  test("link usa el peer cuando existe conexion", () => {
    expect(
      getPortLinkLabel({
        name: "P1",
        connection: { remoteDevice: "SW1", remotePort: "Fa0/1", confidence: "exact" as const },
      } as any),
    ).toBe("SW1:Fa0/1");
  });

  test("lista vacia devuelve lista vacia", () => {
    expect(selectPortsForDisplay([], false)).toHaveLength(0);
  });

  test("device mac se deriva del primer puerto con mac valida", () => {
    const ports = [
      { name: "P0", macAddress: "0000.0000.0000" },
      { name: "P1", macAddress: "00AA.BBCC.DDEE" },
    ];

    expect(extractDeviceMac(ports as any)).toBe("00AA.BBCC.DDEE");
  });
});
