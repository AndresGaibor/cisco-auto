// packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts
import { describe, it, expect } from "bun:test";
import {
  RUNTIME_MODULE_GROUPS,
  type ModuleGroupName,
  getModuleGroupNames,
  getModuleGroupFiles,
  getAllModuleGroups,
  type ModuleGroupDefinition,
} from "../runtime-module-manifest";

describe("runtime-module-manifest", () => {
  describe("RUNTIME_MODULE_GROUPS", () => {
    it("has core group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("core");
      expect(Array.isArray(RUNTIME_MODULE_GROUPS.core.files)).toBe(true);
    });

    it("has device group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("device");
    });

    it("has dhcp group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("dhcp");
    });

    it("has vlan group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("vlan");
    });

    it("has link group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("link");
    });

    it("has host group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("host");
    });

    it("has ios group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("ios");
    });

    it("has canvas group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("canvas");
    });

    it("has inspect group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("inspect");
    });

    it("has module group", () => {
      expect(RUNTIME_MODULE_GROUPS).toHaveProperty("module");
    });

    it("each group has files array", () => {
      for (const [name, group] of Object.entries(RUNTIME_MODULE_GROUPS)) {
        expect(Array.isArray(group.files)).toBe(true);
        expect(group.files.length).toBeGreaterThan(0);
      }
    });

    it("each group has description", () => {
      for (const [name, group] of Object.entries(RUNTIME_MODULE_GROUPS)) {
        expect(typeof group.description).toBe("string");
        expect(group.description.length).toBeGreaterThan(0);
      }
    });

    it("core group includes utils and runtime files", () => {
      const coreFiles = RUNTIME_MODULE_GROUPS.core.files;
      expect(coreFiles.some(f => f.includes("helpers"))).toBe(true);
    });

    it("ios group includes ios-output-classifier", () => {
      const iosFiles = RUNTIME_MODULE_GROUPS.ios.files;
      expect(iosFiles.some(f => f.includes("ios-output-classifier"))).toBe(true);
    });
  });

  describe("ModuleGroupName type", () => {
    it("is a union of all group names", () => {
      const names: ModuleGroupName[] = [
        "core", "device", "dhcp", "vlan", "link",
        "host", "ios", "canvas", "inspect", "module"
      ];

      for (const name of names) {
        expect(RUNTIME_MODULE_GROUPS).toHaveProperty(name);
      }
    });
  });

  describe("getModuleGroupNames", () => {
    it("returns all module group names", () => {
      const names = getModuleGroupNames();
      expect(names).toContain("core");
      expect(names).toContain("device");
      expect(names).toContain("ios");
    });

    it("returns array with all 10 groups", () => {
      const names = getModuleGroupNames();
      expect(names.length).toBe(10);
    });

    it("returns array of correct type", () => {
      const names = getModuleGroupNames();
      names.forEach(name => {
        expect(RUNTIME_MODULE_GROUPS).toHaveProperty(name);
      });
    });
  });

  describe("getModuleGroupFiles", () => {
    it("returns files for core group", () => {
      const files = getModuleGroupFiles("core");
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it("returns files for device group", () => {
      const files = getModuleGroupFiles("device");
      expect(files).toContain("handlers/device.ts");
    });

    it("returns files for ios group", () => {
      const files = getModuleGroupFiles("ios");
      expect(files.some(f => f.includes("ios-output-classifier"))).toBe(true);
    });

    it("returns readonly array that can be spread", () => {
      const files = getModuleGroupFiles("core");
      const spread = [...files];
      expect(Array.isArray(spread)).toBe(true);
    });
  });

  describe("getAllModuleGroups", () => {
    it("returns array of tuples", () => {
      const groups = getAllModuleGroups();
      expect(Array.isArray(groups)).toBe(true);
    });

    it("each tuple has name and definition", () => {
      const groups = getAllModuleGroups();
      for (const [name, def] of groups) {
        expect(typeof name).toBe("string");
        expect(def).toHaveProperty("files");
        expect(def).toHaveProperty("description");
      }
    });

    it("returns all 10 groups", () => {
      const groups = getAllModuleGroups();
      expect(groups.length).toBe(10);
    });

    it("group names are unique", () => {
      const groups = getAllModuleGroups();
      const names = groups.map(([name]) => name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
