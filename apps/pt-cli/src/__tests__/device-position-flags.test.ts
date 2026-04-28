import { describe, expect, test } from "bun:test";
import { createDeviceMoveCommand } from "../commands/device/move.js";
import { createRouterAddCommand } from "../commands/router/add.js";

describe("device position flags", () => {
  test("device move expone --x y --y", () => {
    const flags = createDeviceMoveCommand().options.map((option) => option.flags);

    expect(flags).toContain("--x <x>");
    expect(flags).toContain("--y <y>");
    expect(flags).not.toContain("-x, --xpos <x>");
    expect(flags).not.toContain("-y, --ypos <y>");
  });

  test("router add expone --x y --y", () => {
    const flags = createRouterAddCommand().options.map((option) => option.flags);

    expect(flags).toContain("--x <x>");
    expect(flags).toContain("--y <y>");
    expect(flags).not.toContain("-x, --xpos <x>");
    expect(flags).not.toContain("-y, --ypos <y>");
  });
});
