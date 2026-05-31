import { describe, expect, test } from "bun:test";
import { buildAdaptiveCommandChunks, classifyIosShowCommand } from "./cmd-batch-strategy.js";

describe("cmd-batch-strategy", () => {
  test("clasifica show clock como short", () => {
    expect(classifyIosShowCommand("show clock")).toBe("short");
  });

  test("clasifica show interfaces trunk como long", () => {
    expect(classifyIosShowCommand("show interfaces trunk")).toBe("long");
  });

  test("20 show clock se agrupan en chunks de cinco", () => {
    const chunks = buildAdaptiveCommandChunks(Array.from({ length: 20 }, () => "show clock"));

    expect(chunks).toHaveLength(4);
    expect(chunks.every((chunk: string[]) => chunk.length === 5)).toBe(true);
  });

  test("mezcla real separa long y agrupa short", () => {
    const chunks = buildAdaptiveCommandChunks([
      "show clock",
      "show cdp neighbors",
      "show interfaces trunk",
      "show vlan brief",
      "show ip interface brief",
      "show running-config",
    ]);

    expect(chunks).toEqual([
      ["show clock", "show cdp neighbors"],
      ["show interfaces trunk"],
      ["show vlan brief", "show ip interface brief"],
      ["show running-config"],
    ]);
  });
});
