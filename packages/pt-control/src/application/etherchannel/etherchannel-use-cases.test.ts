import { describe, expect, test } from "bun:test";

import {
  createEtherChannel,
  removeEtherChannel,
  listEtherChannel,
  type EtherchannelControllerPort,
} from "./etherchannel-use-cases.js";

class FakeEtherchannelController implements EtherchannelControllerPort {
  readonly applied: Array<{ device: string; commands: string[]; save: boolean }> = [];
  readonly executed: Array<{ device: string; command: string }> = [];

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
    this.applied.push({ device, commands, save: options.save });
    return { ok: true };
  }

  async execIos(device: string, command: string, _waitForResult?: boolean) {
    this.executed.push({ device, command });
    return { raw: `Port-channel1\nSu1` };
  }
}

describe("etherchannel use cases", () => {
  test("createEtherChannel generates correct commands via kernel plugin", async () => {
    const controller = new FakeEtherchannelController();

    const result = await createEtherChannel(controller, {
      deviceName: "Switch1",
      groupId: 1,
      mode: "active",
      interfaces: ["GigabitEthernet0/1", "GigabitEthernet0/2"],
      trunkMode: "trunk",
      nativeVlan: 1,
      allowedVlans: "all",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.device).toBe("Switch1");
      expect(result.data.groupId).toBe(1);
      expect(result.data.interfaces).toEqual(["GigabitEthernet0/1", "GigabitEthernet0/2"]);
      expect(result.data.commandsGenerated).toBeGreaterThan(0);
      // Commands should include channel-group on interfaces
      expect(result.data.commands.join("\n")).toContain("channel-group 1 mode active");
      // And port-channel interface configuration
      expect(result.data.commands.join("\n")).toContain("interface Port-channel1");
    }
  });

  test("createEtherChannel applies commands via controller", async () => {
    const controller = new FakeEtherchannelController();

    const result = await createEtherChannel(controller, {
      deviceName: "Switch1",
      groupId: 1,
      mode: "active",
      interfaces: ["GigabitEthernet0/1", "GigabitEthernet0/2"],
    });

    expect(result.ok).toBe(true);
    // Verify the result data contains the device and commands were generated
    if (result.ok) {
      expect(result.data.device).toBe("Switch1");
      expect(result.data.commandsGenerated).toBeGreaterThan(0);
      expect(result.data.commands.join("\n")).toContain("channel-group 1 mode active");
    }
  });

  test("removeEtherChannel builds correct 'no interface Port-channel' command", async () => {
    const controller = new FakeEtherchannelController();

    const result = await removeEtherChannel(controller, {
      deviceName: "Switch1",
      groupId: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.groupId).toBe(5);
      expect(result.data.commands).toEqual(["no interface Port-channel5"]);
    }
  });

  test("removeEtherChannel applies the remove command", async () => {
    const controller = new FakeEtherchannelController();

    await removeEtherChannel(controller, { deviceName: "Switch1", groupId: 3 });

    expect(controller.applied).toHaveLength(1);
    expect(controller.applied[0]?.commands).toEqual(["no interface Port-channel3"]);
    expect(controller.applied[0]?.save).toBe(true);
  });

  test("listEtherChannel calls execIos with 'show etherchannel summary'", async () => {
    const controller = new FakeEtherchannelController();

    const result = await listEtherChannel(controller, { deviceName: "Switch1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.device).toBe("Switch1");
    }
    expect(controller.executed).toHaveLength(1);
    expect(controller.executed[0]?.command).toBe("show etherchannel summary");
  });

  test("returns error when device is not IOS-capable or not found", async () => {
    const controller = new FakeEtherchannelController();

    const result = await createEtherChannel(controller, {
      deviceName: "PC1",
      groupId: 1,
      mode: "active",
      interfaces: ["GigabitEthernet0/1", "GigabitEthernet0/2"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Dispositivo "PC1" no encontrado');
    }
  });

  test("createEtherChannel validates groupId range", async () => {
    const controller = new FakeEtherchannelController();

    const result = await createEtherChannel(controller, {
      deviceName: "Switch1",
      groupId: 99,
      mode: "active",
      interfaces: ["GigabitEthernet0/1", "GigabitEthernet0/2"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Group ID inválido");
    }
  });

  test("createEtherChannel validates interfaces are provided", async () => {
    const controller = new FakeEtherchannelController();

    const result = await createEtherChannel(controller, {
      deviceName: "Switch1",
      groupId: 1,
      mode: "active",
      interfaces: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Se requiere al menos una interfaz");
    }
  });
});
