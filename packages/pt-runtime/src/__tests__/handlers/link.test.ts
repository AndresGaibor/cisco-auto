import { describe, expect, test } from "bun:test";
import { handleAddLink } from "../../handlers/link";
import type { HandlerDeps } from "../../utils/helpers";

class MockDevice {
  constructor(
    private readonly name: string,
    private readonly model: string,
    private readonly type: number,
  ) {}

  getName() { return this.name; }
  getModel() { return this.model; }
  getType() { return this.type; }
  getPower() { return true; }
  setPower() {}
  setName() {}
  skipBoot() {}
  getCommandLine() { return null; }
  getPortCount() { return this.name === "PC1" ? 1 : 2; }
  getPortAt(index: number) {
    if (this.name === "PC1") {
      return index === 0 ? { getName: () => "FastEthernet0" } : null;
    }

    const ports = ["Vlan1", "FastEthernet0/1"];
    return ports[index] ? { getName: () => ports[index] } : null;
  }
  addModule() { return false; }
  removeModule() { return false; }
}

class MockWorkspace {
  calls: Array<{ dev1: string; port1: string; dev2: string; port2: string; cableType: number }> = [];

  addDevice() { return null; }
  removeDevice() {}
  deleteLink() {}

  createLink(dev1: string, port1: string, dev2: string, port2: string, cableType: number) {
    this.calls.push({ dev1, port1, dev2, port2, cableType });
    return cableType === 8107;
  }
}

class MockNetwork {
  constructor(private readonly workspace: MockWorkspace) {}

  getDevice(name: string) {
    if (name === "PC1") return new MockDevice("PC1", "PC-PT", 8);
    if (name === "S1") return new MockDevice("S1", "2960-24TT", 1);
    return null;
  }
}

describe("handleAddLink", () => {
  test("reintenta con cable auto cuando el cable explícito falla", () => {
    const workspace = new MockWorkspace();
    const deps: any = {
      getLW: () => workspace as never,
      getNet: () => new MockNetwork(workspace) as never,
      dprint: () => {},
    };

    const result = handleAddLink(
      {
        type: "addLink",
        device1: "PC1",
        port1: "FastEthernet0",
        device2: "S1",
        port2: "FastEthernet0/1",
        linkType: "auto",
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(workspace.calls.some((call) => call.cableType === 8107)).toBe(true);
  });
});
