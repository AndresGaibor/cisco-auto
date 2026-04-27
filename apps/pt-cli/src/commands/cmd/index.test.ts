import { describe, expect, test } from "bun:test";
import { __test__ } from "./index.js";

describe("cmd --config", () => {
  test("preserva cada argumento como línea IOS independiente", () => {
    const commands = __test__.readCommandsFromOptions(
      { config: true },
      [
        "interface FastEthernet0/1",
        "description === TEST PT CMD CONFIG ===",
        "end",
      ],
    );

    expect(commands).toEqual([
      "interface FastEthernet0/1",
      "description === TEST PT CMD CONFIG ===",
      "end",
    ]);
  });

  test("buildConfigCommand no concatena subcomandos IOS", () => {
    const command = __test__.buildConfigCommand(
      [
        "interface FastEthernet0/1",
        "description === TEST PT CMD CONFIG ===",
        "end",
      ],
      false,
    );

    expect(command).toBe(
      [
        "configure terminal",
        "interface FastEthernet0/1",
        "description === TEST PT CMD CONFIG ===",
        "end",
      ].join("\n"),
    );
  });

  test("buildConfigCommand agrega end si falta", () => {
    const command = __test__.buildConfigCommand(
      [
        "interface FastEthernet0/1",
        "description === TEST PT CMD CONFIG ===",
      ],
      false,
    );

    expect(command).toBe(
      [
        "configure terminal",
        "interface FastEthernet0/1",
        "description === TEST PT CMD CONFIG ===",
        "end",
      ].join("\n"),
    );
  });
});
