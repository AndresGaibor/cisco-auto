import { describe, expect, test } from "bun:test";
import { createCmdCommand } from "./index.js";
import { __test__ } from "./index.js";

describe("cmd --config", () => {
  test("expone el subcomando read", () => {
    const cmd = createCmdCommand();

    expect(cmd.commands.some((subcommand) => subcommand.name() === "read")).toBe(true);
  });

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

  test("mantiene show version sin comillas como un solo comando", () => {
    expect(
      __test__.readCommandsFromOptions(
        { config: false },
        ["show", "version"],
      ),
    ).toEqual(["show version"]);
  });

  test("mantiene show version con comillas como un solo comando", () => {
    expect(
      __test__.readCommandsFromOptions(
        { config: false },
        ["show version"],
      ),
    ).toEqual(["show version"]);
  });

  test("trata argumentos config encadenados como comandos separados", () => {
    expect(
      __test__.readCommandsFromOptions(
        { config: false },
        ["interface f0/6", "description AUTO-CONFIG-TEST", "no shutdown"],
      ),
    ).toEqual([
      "interface f0/6",
      "description AUTO-CONFIG-TEST",
      "no shutdown",
    ]);
  });

  test("permite varios comandos show con argumentos entre comillas", () => {
    expect(
      __test__.readCommandsFromOptions(
        { config: false },
        ["show version", "show ip interface brief"],
      ),
    ).toEqual([
      "show version",
      "show ip interface brief",
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

  test("isMissingReadOnlyInput detecta read sin dispositivo ni file", () => {
    expect(__test__.isMissingReadOnlyInput(undefined, {})).toBe(true);
    expect(__test__.isMissingReadOnlyInput("R1", {})).toBe(false);
    expect(__test__.isMissingReadOnlyInput("R1", { file: "cmds.txt" })).toBe(false);
    expect(__test__.isMissingReadOnlyInput(undefined, { file: "cmds.txt" })).toBe(false);
  });

  test("isLikelyMisorderedReadCommand detecta pt cmd R1 read", () => {
    expect(__test__.isLikelyMisorderedReadCommand("R1", ["read"], {})).toBe(true);
    expect(__test__.isLikelyMisorderedReadCommand("R1", ["show running-config"], {})).toBe(false);
    expect(__test__.isLikelyMisorderedReadCommand(undefined, ["read"], {})).toBe(false);
    expect(__test__.isLikelyMisorderedReadCommand("R1", ["read"], { stdin: true })).toBe(false);
  });
});
