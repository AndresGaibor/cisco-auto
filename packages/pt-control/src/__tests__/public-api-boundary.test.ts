import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("pt-control root public API boundary", () => {
  test("root index does not export experimental or bulky modules", () => {
    const source = readFileSync(join(import.meta.dir, "../index.ts"), "utf8");

    const forbidden = [
      'export * from "./omni',
      'export * from "./agent',
      'export * from "./quality',
      'export * from "./pt/',
      'export * from "./application/services',
      'export * from "@cisco-auto/kernel',
      'export * from "@cisco-auto/pt-runtime',
      'export * from "@cisco-auto/ios-domain',
      'from "./commands/bridge-doctor-command',
      'from "./application/services/index',
      'from "./pt/terminal/index',
      'from "./pt/topology/index',
      'from "./pt/server/index',
      'from "./pt/planner/index',
      'from "./pt/ledger/index',
      'from "./pt/diagnosis/index',
    ];

    const offenders = forbidden.filter((pattern) => source.includes(pattern));
    expect(offenders).toEqual([]);
  });

  test("legacy entrypoint is the only compatibility barrel", () => {
    const legacy = readFileSync(join(import.meta.dir, "../legacy/index.ts"), "utf8");
    expect(legacy).toContain("LEGACY EXPORTS");
  });
});
