import { describe, expect, test } from "bun:test";
import {
  buildConfigCommand,
  looksLikeMultiCommandInput,
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
