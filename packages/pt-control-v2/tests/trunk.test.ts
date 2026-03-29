import { describe, it, expect } from "bun:test";
import { buildTrunkCommands } from "../src/utils/ios-commands.js";

describe("trunk utilities", () => {
  describe("buildTrunkCommands", () => {
    it("generates trunk commands for single port with vlans", () => {
      const commands = buildTrunkCommands(["GigabitEthernet0/1"], [10, 20, 30]);
      expect(commands).toEqual([
        "interface GigabitEthernet0/1",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " switchport trunk allowed vlan 10,20,30",
        " no shutdown",
        " exit",
      ]);
    });

    it("generates trunk commands for multiple ports", () => {
      const commands = buildTrunkCommands(
        ["GigabitEthernet0/1", "GigabitEthernet0/2"],
        [10, 20]
      );
      expect(commands).toEqual([
        "interface GigabitEthernet0/1",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " switchport trunk allowed vlan 10,20",
        " no shutdown",
        " exit",
        "interface GigabitEthernet0/2",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " switchport trunk allowed vlan 10,20",
        " no shutdown",
        " exit",
      ]);
    });

    it("generates trunk commands with empty vlans array", () => {
      const commands = buildTrunkCommands(["GigabitEthernet0/1"], []);
      expect(commands).toEqual([
        "interface GigabitEthernet0/1",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " switchport trunk allowed vlan ",
        " no shutdown",
        " exit",
      ]);
    });
  });
});
