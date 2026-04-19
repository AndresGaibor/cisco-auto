import { describe, expect, test } from "bun:test";

import { createDeviceCommand } from "../../src/commands/device/index";

describe("device command", () => {
  test("expone list como subcomando", () => {
    const deviceCommand = createDeviceCommand();

    expect(deviceCommand.commands.map((command) => command.name())).toContain("list");
  });
});
