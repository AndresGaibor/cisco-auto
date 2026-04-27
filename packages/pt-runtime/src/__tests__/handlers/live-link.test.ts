import { describe, expect, test } from "bun:test";
import { classifyLiveLinkState, collectLiveLinks, findLiveLink, findLiveLinkByEndpoint, lightName, normalizeIfaceName } from "../../domain/live-link";

describe("live-link domain", () => {
  test("normaliza nombres de interfaz comunes", () => {
    expect(normalizeIfaceName("Gi0/0")).toBe("gigabitethernet00");
    expect(normalizeIfaceName("Fa0/1")).toBe("fastethernet01");
  });

  test("mapea correctamente las luces oficiales de PT", () => {
    expect(lightName(0)).toBe("off");
    expect(lightName(1)).toBe("amber");
    expect(lightName(2)).toBe("green");
    expect(lightName(3)).toBe("blink");
    expect(lightName(99)).toBe("unknown");
  });

  test("clasifica el estado del link usando la luz primero", () => {
    expect(classifyLiveLinkState(
      { lightName: "green", portUp: false, protocolUp: false } as any,
      { lightName: "green", portUp: false, protocolUp: false } as any,
    )).toBe("green");
    expect(classifyLiveLinkState(
      { lightName: "amber", portUp: true, protocolUp: false } as any,
      { lightName: "green", portUp: true, protocolUp: true } as any,
    )).toBe("amber");
    expect(classifyLiveLinkState(
      { lightName: "off", portUp: false, protocolUp: false } as any,
      { lightName: "green", portUp: true, protocolUp: true } as any,
    )).toBe("down");
  });
});

describe("collectLiveLinks", () => {
  test("recolecta enlaces live desde Port.getLink()", () => {
    const p1: any = {
      getName: () => "GigabitEthernet0/0",
      getLightStatus: () => 2,
      isPortUp: () => true,
      isProtocolUp: () => true,
      getRemotePortName: () => "FastEthernet0/1",
      getOwnerDevice: () => ({ getName: () => "R1" }),
      getLink: () => link,
    };
    const p2: any = {
      getName: () => "FastEthernet0/1",
      getLightStatus: () => 2,
      isPortUp: () => true,
      isProtocolUp: () => true,
      getRemotePortName: () => "GigabitEthernet0/0",
      getOwnerDevice: () => ({ getName: () => "S1" }),
      getLink: () => link,
    };
    const link: any = {
      getObjectUuid: () => "uuid-1",
      getConnectionType: () => 8100,
      getPort1: () => p1,
      getPort2: () => p2,
    };
    const net: any = {
      getDeviceCount: () => 2,
      getDeviceAt: (index: number) => index === 0
        ? { getName: () => "R1", getPortCount: () => 1, getPortAt: () => p1 }
        : { getName: () => "S1", getPortCount: () => 1, getPortAt: () => p2 },
    };

    const links = collectLiveLinks(net);
    expect(links).toHaveLength(1);
    expect(links[0].device1).toBe("R1");
    expect(links[0].port1).toBe("GigabitEthernet0/0");
    expect(links[0].device2).toBe("S1");
    expect(links[0].port2).toBe("FastEthernet0/1");
    expect(links[0].state).toBe("green");
    expect(links[0].cableType).toBe("straight");
  });

  test("usa getLinkAt como respaldo cuando Port.getLink() no existe", () => {
    const p1: any = {
      getName: () => "GigabitEthernet0/0",
      getLightStatus: () => 2,
      isPortUp: () => true,
      isProtocolUp: () => true,
      getRemotePortName: () => "FastEthernet0/1",
      getOwnerDevice: () => ({ getName: () => "R1" }),
    };
    const p2: any = {
      getName: () => "FastEthernet0/1",
      getLightStatus: () => 2,
      isPortUp: () => true,
      isProtocolUp: () => true,
      getRemotePortName: () => "GigabitEthernet0/0",
      getOwnerDevice: () => ({ getName: () => "S1" }),
    };
    const link: any = {
      getObjectUuid: () => "uuid-2",
      getConnectionType: () => 0,
      getPort1: () => p1,
      getPort2: () => p2,
    };
    const net: any = {
      getDeviceCount: () => 0,
      getLinkCount: () => 1,
      getLinkAt: (index: number) => (index === 0 ? link : null),
    };

    const links = collectLiveLinks(net);
    expect(links).toHaveLength(1);
    expect(links[0].device1).toBe("R1");
    expect(links[0].device2).toBe("S1");
    expect(links[0].cableType).toBe("straight");
    expect(links[0].evidence).toContain("Net.getLinkAt()");
  });

  test("encuentra link exacto y por endpoint", () => {
    const links = [
      {
        id: "a",
        device1: "R1",
        port1: "GigabitEthernet0/0",
        device2: "S1",
        port2: "FastEthernet0/1",
        cableTypeId: 0,
        cableType: "straight",
        state: "green",
        endpoint1: {} as any,
        endpoint2: {} as any,
        evidence: [],
      },
    ] as any;

    expect(findLiveLink(links, "R1", "Gi0/0", "S1", "Fa0/1")?.id).toBe("a");
    expect(findLiveLink(links, "S1", "Fa0/1", "R1", "Gi0/0")?.id).toBe("a");
    expect(findLiveLinkByEndpoint(links, "R1", "Gi0/0")?.id).toBe("a");
  });
});
