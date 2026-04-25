import { describe, expect, test } from "bun:test";

import {
  buildSviCommands,
  buildVlanCreateCommands,
  buildVlanEnsureCommands,
  buildVlanTrunkCommands,
  executeVlanApply,
  executeVlanConfigInterfaces,
  executeVlanEnsure,
  executeVlanTrunk,
  parseSviSpecs,
  parseVlanEnsureSpecs,
  parseVlanIds,
  type VlanControllerPort,
} from "./vlan-use-cases.js";

import { resolveCapabilitySet } from "@cisco-auto/ios-domain/capabilities";
import { VlanId } from "@cisco-auto/ios-primitives/value-objects";

class FakeVlanController implements VlanControllerPort {
  readonly applied: Array<{ device: string; commands: string[]; save: boolean }> = [];

  constructor(
    private readonly devices = [
      { name: "Switch1", model: "2960-24TT", type: "switch" },
      { name: "MLS1", model: "3560-24PS", type: "switch_layer3" },
      { name: "PC1", model: "PC-PT", type: "pc" },
    ],
  ) {}

  async listDevices() {
    return {
      devices: this.devices,
    };
  }

  async configIosWithResult(device: string, commands: string[], options: { save: boolean }) {
    this.applied.push({
      device,
      commands,
      save: options.save,
    });

    return {
      ok: true,
    };
  }
}

describe("vlan use cases", () => {
  test("parseVlanIds validates comma-separated VLAN IDs", () => {
    expect(parseVlanIds("10,20,30").map((vlan) => vlan.value)).toEqual([10, 20, 30]);
    expect(() => parseVlanIds("10,abc")).toThrow();
    expect(() => parseVlanIds("")).toThrow();
    expect(() => parseVlanIds("4095")).toThrow();
  });

  test("parseVlanEnsureSpecs preserves names", () => {
    expect(parseVlanEnsureSpecs(["10,ADMIN", "20,USERS"])).toEqual([
      { id: 10, name: "ADMIN" },
      { id: 20, name: "USERS" },
    ]);

    expect(() => parseVlanEnsureSpecs(["10"])).toThrow();
    expect(() => parseVlanEnsureSpecs(["10,"])).toThrow();
  });

  test("parseSviSpecs validates IP and subnet mask using value objects", () => {
    expect(parseSviSpecs(["10,192.168.10.1,255.255.255.0"])).toEqual([
      {
        vlanId: 10,
        ip: "192.168.10.1",
        mask: "255.255.255.0",
      },
    ]);

    expect(() => parseSviSpecs(["10,999.1.1.1,255.255.255.0"])).toThrow();
    expect(() => parseSviSpecs(["10,192.168.1.1,255.0.255.0"])).toThrow();
  });

  test("buildVlanCreateCommands generates stable commands", () => {
    expect(buildVlanCreateCommands("ADMIN", 10)).toEqual([
      "! Configuración de VLANs",
      "vlan 10",
      " name ADMIN",
      " exit",
    ]);
  });

  test("buildVlanEnsureCommands preserves provided VLAN names", () => {
    const commands = buildVlanEnsureCommands(
      [
        { id: 10, name: "ADMIN" },
        { id: 20, name: "USERS" },
      ],
      resolveCapabilitySet("2960-24TT"),
    ).join("\n");

    expect(commands).toContain("vlan 10");
    expect(commands).toContain("name ADMIN");
    expect(commands).toContain("vlan 20");
    expect(commands).toContain("name USERS");
    expect(commands).not.toContain("name VLAN10");
  });

  test("buildVlanTrunkCommands generates trunk configuration", () => {
    const commands = buildVlanTrunkCommands(
      "GigabitEthernet0/1",
      [VlanId.from(10), VlanId.from(20)],
      resolveCapabilitySet("2960-24TT"),
    ).join("\n");

    expect(commands).toContain("interface GigabitEthernet0/1");
    expect(commands).toContain("switchport mode trunk");
  });

  test("buildSviCommands generates interface vlan commands", () => {
    expect(
      buildSviCommands([
        {
          vlanId: 10,
          ip: "192.168.10.1",
          mask: "255.255.255.0",
        },
      ]),
    ).toEqual([
      "interface vlan10",
      " ip address 192.168.10.1 255.255.255.0",
      " no shutdown",
      " exit",
    ]);
  });

  test("executeVlanApply applies VLAN commands without starting/stopping controller", async () => {
    const controller = new FakeVlanController();

    const result = await executeVlanApply(controller, {
      deviceName: "Switch1",
      vlansRaw: "10,20",
    });

    expect(result.ok).toBe(true);
    expect(controller.applied).toHaveLength(1);
    expect(controller.applied[0]?.device).toBe("Switch1");
    expect(controller.applied[0]?.commands.join("\n")).toContain("vlan 10");
  });

  test("executeVlanTrunk applies trunk commands", async () => {
    const controller = new FakeVlanController();

    const result = await executeVlanTrunk(controller, {
      deviceName: "Switch1",
      iface: "GigabitEthernet0/1",
      allowedRaw: "10,20",
    });

    expect(result.ok).toBe(true);
    expect(controller.applied[0]?.commands.join("\n")).toContain("switchport mode trunk");
  });

  test("executeVlanEnsure applies VLANs with requested names", async () => {
    const controller = new FakeVlanController();

    const result = await executeVlanEnsure(controller, {
      deviceName: "Switch1",
      vlanSpecsRaw: ["10,ADMIN", "20,USERS"],
    });

    expect(result.ok).toBe(true);
    expect(controller.applied[0]?.commands.join("\n")).toContain("name ADMIN");
    expect(controller.applied[0]?.commands.join("\n")).toContain("name USERS");
  });

  test("executeVlanConfigInterfaces applies SVI commands", async () => {
    const controller = new FakeVlanController();

    const result = await executeVlanConfigInterfaces(controller, {
      deviceName: "MLS1",
      interfaceSpecsRaw: ["10,192.168.10.1,255.255.255.0"],
    });

    expect(result.ok).toBe(true);
    expect(controller.applied[0]?.commands).toEqual([
      "interface vlan10",
      " ip address 192.168.10.1 255.255.255.0",
      " no shutdown",
      " exit",
    ]);
  });

  test("returns structured error when target is not IOS-capable or not found", async () => {
    const controller = new FakeVlanController();

    const result = await executeVlanApply(controller, {
      deviceName: "PC1",
      vlansRaw: "10",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Dispositivo "PC1" no encontrado');
    }
  });
});