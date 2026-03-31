import { describe, it, expect } from "bun:test";
import { buildVlanCommands } from "../src/utils/ios-commands.js";

describe("vlan utilities", () => {
  describe("buildVlanCommands", () => {
    it("generates VLAN commands for single VLAN", () => {
      const commands = buildVlanCommands([10]);
      expect(commands).toEqual([
        "vlan 10",
        " name VLAN10",
        " exit",
      ]);
    });

    it("generates VLAN commands for multiple VLANs", () => {
      const commands = buildVlanCommands([10, 20, 30]);
      expect(commands).toEqual([
        "vlan 10",
        " name VLAN10",
        " exit",
        "vlan 20",
        " name VLAN20",
        " exit",
        "vlan 30",
        " name VLAN30",
        " exit",
      ]);
    });

    it("generates VLAN commands with custom name", () => {
      const commands = buildVlanCommands([10, 20], "DATA");
      expect(commands).toEqual([
        "vlan 10",
        " name DATA",
        " exit",
        "vlan 20",
        " name DATA",
        " exit",
      ]);
    });

    it("generates correct number of commands per VLAN", () => {
      const commands = buildVlanCommands([10, 20]);
      expect(commands.length).toBe(6);
    });
  });
});
