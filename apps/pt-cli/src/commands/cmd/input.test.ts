import { describe, expect, test } from "bun:test";
import {
  buildConfigCommand,
  looksLikeMultiCommandInput,
  needsConfigMode,
  normalizeCommandLines,
  readCommandsFromOptions,
} from "./input.js";

describe("cmd/input", () => {
  test("ignora líneas vacías", () => {
    expect(normalizeCommandLines("show version\n\n\nshow ip int br")).toEqual([
      "show version",
      "show ip int br",
    ]);
  });

  test("ignora comentarios #", () => {
    expect(normalizeCommandLines("# comentario\nshow version\n  # otro\nshow ip route")).toEqual([
      "show version",
      "show ip route",
    ]);
  });

  test("detecta input multiline", () => {
    expect(looksLikeMultiCommandInput(["show version\nshow ip int br"])).toBe(true);
  });

  test("detecta interface + child commands como multi-command", () => {
    expect(
      looksLikeMultiCommandInput(["interface g0/0", "no shutdown", "description uplink"]),
    ).toBe(true);
  });

  test("no detecta show version como multi-command", () => {
    expect(looksLikeMultiCommandInput(["show version"])).toBe(false);
  });

  test("buildConfigCommand agrega configure terminal", () => {
    expect(buildConfigCommand(["interface g0/0", "no shutdown"], false)).toMatch(/^configure terminal\n/);
  });

  test("buildConfigCommand agrega end si falta", () => {
    expect(buildConfigCommand(["interface g0/0", "no shutdown"], false)).toContain("\nend");
  });

  test("buildConfigCommand no duplica end", () => {
    const result = buildConfigCommand(["interface g0/0", "end"], false);
    expect(result.match(/\nend/g)?.length ?? 0).toBe(1);
  });

  test("buildConfigCommand agrega write memory si save=true", () => {
    expect(buildConfigCommand(["interface g0/0", "no shutdown"], true)).toMatch(/\nwrite memory$/);
  });

  test("readCommandsFromOptions prioriza archivo, stdin y config", () => {
    expect(readCommandsFromOptions({ config: true }, ["interface g0/0", "no shutdown"])).toEqual([
      "interface g0/0",
      "no shutdown",
    ]);
  });
});

describe("needsConfigMode", () => {
  test("detecta interface como config mode", () => {
    expect(needsConfigMode(["interface g0/0"])).toBe(true);
  });

  test("detecta vlan como config mode", () => {
    expect(needsConfigMode(["vlan 10"])).toBe(true);
  });

  test("detecta router como config mode", () => {
    expect(needsConfigMode(["router ospf 1"])).toBe(true);
  });

  test("detecta line como config mode", () => {
    expect(needsConfigMode(["line vty 0 4"])).toBe(true);
  });

  test("detecta configure terminal como config mode", () => {
    expect(needsConfigMode(["configure terminal"])).toBe(true);
  });

  test("detecta conf t como config mode", () => {
    expect(needsConfigMode(["conf t"])).toBe(true);
  });

  test("detecta ip dhcp pool como config mode", () => {
    expect(needsConfigMode(["ip dhcp pool MY_POOL"])).toBe(true);
  });

  test("detecta telephony-service como config mode", () => {
    expect(needsConfigMode(["telephony-service"])).toBe(true);
  });

  test("detecta description como config command", () => {
    expect(needsConfigMode(["description uplink"])).toBe(true);
  });

  test("detecta no shutdown como config command", () => {
    expect(needsConfigMode(["no shutdown"])).toBe(true);
  });

  test("detecta shutdown solo como config command", () => {
    expect(needsConfigMode(["shutdown"])).toBe(true);
  });

  test("detecta ip address como config command", () => {
    expect(needsConfigMode(["ip address 192.168.1.1 255.255.255.0"])).toBe(true);
  });

  test("detecta switchport como config command", () => {
    expect(needsConfigMode(["switchport mode access"])).toBe(true);
  });

  test("NO detecta show version como config mode", () => {
    expect(needsConfigMode(["show version"])).toBe(false);
  });

  test("NO detecta ping como config mode", () => {
    expect(needsConfigMode(["ping 192.168.1.1"])).toBe(false);
  });

  test("NO detecta show ip interface brief como config mode", () => {
    expect(needsConfigMode(["show ip interface brief"])).toBe(false);
  });

  test("detecta mezcla show + config como config mode", () => {
    expect(needsConfigMode(["show version", "interface g0/0"])).toBe(true);
  });

  test("devuelve false para array vacío", () => {
    expect(needsConfigMode([])).toBe(false);
  });
});
