import { describe, expect, test } from "bun:test";
import { createDeviceAddCommand } from "../commands/device/add.js";
import { createDeviceRemoveCommand } from "../commands/device/remove.js";

describe("device add/remove options", () => {
  test("device add expone aliases cortos de posicion", () => {
    const flags = createDeviceAddCommand().options.map((option) => option.flags);

    expect(flags).toContain("--x <x>");
    expect(flags).toContain("--y <y>");
    expect(flags).not.toContain("-x, --xpos <x>");
    expect(flags).not.toContain("-y, --ypos <y>");
  });

  test("device remove expone if-exists", () => {
    const flags = createDeviceRemoveCommand().options.map((option) => option.flags);

    expect(flags).toContain("--if-exists");
  });
});
