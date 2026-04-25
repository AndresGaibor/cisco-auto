import { describe, expect, test } from "bun:test";

import {
  buildCore3650LiftAccessSwitchCommands,
  buildCore3650LiftCoreCommands,
  buildCore3650LiftScenarioPlan,
  executeCore3650LiftLab,
  type LabLiftControllerPort,
} from "./core3650-lift.js";

class FakeLabLiftController implements LabLiftControllerPort {
  readonly configuredIos: Record<string, string[]> = {};
  readonly configuredHosts: Record<string, unknown> = {};
  readonly interactiveCommands: Array<{ device: string; command: string }> = [];
  readonly addedLinks: string[] = [];

  private devices: Record<string, { name: string }> = {};
  private links: Record<string, unknown> = {};

  async clearTopology() {
    this.devices = {};
    this.links = {};

    return {
      removedDevices: 0,
      removedLinks: 0,
      remainingDevices: 0,
      remainingLinks: 0,
    };
  }

  async addDevice(name: string) {
    this.devices[name] = { name };
  }

  async listDevices() {
    return {
      devices: Object.values(this.devices),
    };
  }

  async execInteractive(device: string, command: string) {
    this.interactiveCommands.push({ device, command });
  }

  getTopologyCache() {
    return {
      refreshFromState() {
        // fake no-op
      },
    };
  }

  async snapshot() {
    return {
      devices: this.devices,
      links: this.links,
    };
  }

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: "straight",
  ) {
    const id = `${device1}:${port1}->${device2}:${port2}:${linkType}`;
    this.addedLinks.push(id);
    this.links[id] = { id };
  }

  async configIos(device: string, commands: string[]) {
    this.configuredIos[device] = commands;
  }

  async configHost(device: string, options: unknown) {
    this.configuredHosts[device] = options;
  }

  async showRunningConfig(device: string) {
    return {
      raw: this.configuredIos[device]?.join("\n") ?? "",
    };
  }

  async showVlan() {
    return {
      vlans: [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 99 }],
    };
  }

  async showIpInterfaceBrief() {
    return {
      interfaces: [
        { interface: "Vlan10", status: "up", protocol: "up" },
        { interface: "Vlan20", status: "up", protocol: "up" },
        { interface: "Vlan30", status: "up", protocol: "up" },
        { interface: "Vlan99", status: "up", protocol: "up" },
      ],
    };
  }

  async inspectDevice(device: string) {
    if (device === "PC1") {
      return { name: device, dhcp: true };
    }

    if (device === "SRV1") {
      return {
        name: device,
        ip: "192.168.30.10",
        gateway: "192.168.30.1",
      };
    }

    const mgmtIpBySwitch: Record<string, string> = {
      SW1: "192.168.99.2",
      SW2: "192.168.99.3",
      SW3: "192.168.99.4",
      SW4: "192.168.99.5",
    };

    return {
      name: device,
      ip: mgmtIpBySwitch[device],
    };
  }
}

describe("CORE3650 lab lift use case", () => {
  test("builds the expected scenario shape", () => {
    const plan = buildCore3650LiftScenarioPlan();

    expect(plan.devices).toHaveLength(10);
    expect(plan.links).toHaveLength(9);
    expect(plan.devices.map((device) => device.name)).toEqual([
      "CORE3650",
      "SW1",
      "SW2",
      "SW3",
      "SW4",
      "PC1",
      "PC2",
      "PC3",
      "PC4",
      "SRV1",
    ]);
  });

  test("builds core IOS config with routing, VLANs, DHCP and trunks", () => {
    const commands = buildCore3650LiftCoreCommands();
    const source = commands.join("\n");

    expect(source).toContain("hostname CORE3650");
    expect(source).toContain("spanning-tree mode rapid-pvst");
    expect(source).toContain("ip routing");
    expect(source).toContain("vlan 10");
    expect(source).toContain("vlan 20");
    expect(source).toContain("vlan 30");
    expect(source).toContain("vlan 99");
    expect(source).toContain("ip dhcp pool VLAN10");
    expect(source).toContain("ip dhcp pool VLAN20");
    expect(source).toContain("interface FastEthernet0/1");
    expect(source).toContain("switchport mode trunk");
  });

  test("builds access switch IOS config with trunk, access port and management SVI", () => {
    const commands = buildCore3650LiftAccessSwitchCommands("SW1", 10, 2);
    const source = commands.join("\n");

    expect(source).toContain("hostname SW1");
    expect(source).toContain("interface GigabitEthernet0/1");
    expect(source).toContain("switchport mode trunk");
    expect(source).toContain("interface FastEthernet0/1");
    expect(source).toContain("switchport access vlan 10");
    expect(source).toContain("interface vlan 99");
    expect(source).toContain("ip address 192.168.99.2 255.255.255.0");
    expect(source).toContain("ip default-gateway 192.168.99.1");
  });

  test("executes the use case and verifies the fake topology", async () => {
    const controller = new FakeLabLiftController();

    const result = await executeCore3650LiftLab({
      controller,
      maxAttempts: 1,
      delayMs: 0,
      postConfigDelayMs: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    expect(controller.addedLinks).toHaveLength(9);
    expect(controller.configuredIos.CORE3650?.join("\n")).toContain("hostname CORE3650");
    expect(controller.configuredIos.SW1?.join("\n")).toContain("hostname SW1");
    expect(controller.configuredHosts.PC1).toEqual({ dhcp: true });
    expect(controller.configuredHosts.SRV1).toEqual({
      ip: "192.168.30.10",
      mask: "255.255.255.0",
      gateway: "192.168.30.1",
      dns: "192.168.30.10",
    });

    expect(result.verification.verified).toBe(true);
    expect(result.verification.checks.every((check) => check.ok)).toBe(true);
  });
});
