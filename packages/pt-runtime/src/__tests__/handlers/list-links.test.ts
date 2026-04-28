import { describe, expect, test } from "bun:test";
import { handleListLinks } from "../../handlers/list-links";

describe("handleListLinks", () => {
  test("recolecta enlaces vivos y filtra por dispositivo y estado", () => {
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
      getConnectionType: () => 0,
      getPort1: () => p1,
      getPort2: () => p2,
    };

    const deps: any = {
      getNet: () => ({
        getDeviceCount: () => 2,
        getDeviceAt: (index: number) => index === 0
          ? { getName: () => "R1", getPortCount: () => 1, getPortAt: () => p1 }
          : { getName: () => "S1", getPortCount: () => 1, getPortAt: () => p2 },
      }),
    };

    const result = handleListLinks({ type: "listLinks", device: "R1", state: "green" }, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source).toBe("listLinks");
      expect(result.value.links).toHaveLength(1);
      expect(result.value.stats.linkCount).toBe(1);
    }
  });
});
