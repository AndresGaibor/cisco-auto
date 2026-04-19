import { describe, expect, test, vi } from "bun:test";

import { handleClearCanvas } from "../handlers/canvas";
import type { HandlerDeps } from "../utils/helpers";

class MockPort {
  constructor(private readonly name: string) {}

  getName(): string {
    return this.name;
  }

  deleteLink(): void {
    /* noop */
  }
}

class MockLink {
  constructor(
    private readonly port1: MockPort,
    private readonly port2: MockPort,
    private readonly onDelete: () => void,
  ) {}

  getPort1(): MockPort {
    return this.port1;
  }

  getPort2(): MockPort {
    return this.port2;
  }

  delete(): void {
    this.onDelete();
  }
}

class MockDevice {
  constructor(private readonly name: string) {}

  getName(): string {
    return this.name;
  }
}

class MockNetwork {
  devices = [new MockDevice("R1"), new MockDevice("SW1")];
  links: MockLink[] = [];

  constructor() {
    this.links = [
      new MockLink(new MockPort("R1:Fa0/0"), new MockPort("SW1:Gi0/1"), () => {
        this.links = [];
      }),
    ];
  }

  getDeviceCount(): number {
    return this.devices.length;
  }

  getDeviceAt(index: number): MockDevice | null {
    return this.devices[index] ?? null;
  }

  getLinkCount(): number {
    return this.links.length;
  }

  getLinkAt(index: number): MockLink | null {
    return this.links[index] ?? null;
  }
}

class MockWorkspace {
  devices = [new MockDevice("R1"), new MockDevice("SW1")];
  removedDevices: string[] = [];

  getDeviceCount(): number {
    return this.devices.length;
  }

  getDeviceAt(index: number): MockDevice | null {
    return this.devices[index] ?? null;
  }

  removeDevice(name: string): boolean {
    this.removedDevices.push(name);
    this.devices = this.devices.filter((device) => device.getName() !== name);
    return true;
  }
}

describe("handleClearCanvas", () => {
  test("borra primero enlaces y luego dispositivos", () => {
    const network = new MockNetwork();
    const workspace = new MockWorkspace();
    const deleteLinkSpy = vi.fn(() => {
      network.links = [];
    });
    network.links = [
      new MockLink(
        { getName: () => "R1:Fa0/0", deleteLink: deleteLinkSpy } as any,
        { getName: () => "SW1:Gi0/1", deleteLink: vi.fn() } as any,
        deleteLinkSpy,
      ),
    ];

    const deps = {
      getNet: () => network as any,
      getLW: () => workspace as any,
      dprint: vi.fn(),
    } as unknown as HandlerDeps;

    const result = handleClearCanvas({}, deps);

    expect(result.ok).toBe(true);
    expect((result as any).linksDeleted).toBe(1);
    expect((result as any).devicesDeleted).toBe(2);
    expect(deleteLinkSpy).toHaveBeenCalledTimes(1);
    expect(workspace.removedDevices).toEqual(["SW1", "R1"]);
    expect(workspace.getDeviceCount()).toBe(0);
    expect(network.getLinkCount()).toBe(0);
  });

  test("funciona con canvas vacío", () => {
    const network = {
      getLinkCount: () => 0,
      getLinkAt: () => null,
    };
    const workspace = {
      getDeviceCount: () => 0,
      getDeviceAt: () => null,
      removeDevice: vi.fn(),
    };

    const deps = {
      getNet: () => network as any,
      getLW: () => workspace as any,
      dprint: vi.fn(),
    } as unknown as HandlerDeps;

    const result = handleClearCanvas({}, deps);

    expect(result.ok).toBe(true);
    expect((result as any).linksDeleted).toBe(0);
    expect((result as any).devicesDeleted).toBe(0);
  });
});
