import { test, expect } from "bun:test";

const it = (name: string, fn: () => void) => {
  if (process.env.PT_LIVE === "1") {
    test(name, fn);
  } else {
    test.skip(name, fn);
  }
};

it("pt show ip-int-brief ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "ip-int-brief", "R1"]);
  expect(proc.exitCode).toBe(0);
});

it("pt show vlan ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "vlan", "SW1"]);
  expect(proc.exitCode).toBe(0);
});

it("pt show ip-route ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "ip-route", "R1"]);
  expect(proc.exitCode).toBe(0);
});

it("pt show cdp ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "cdp", "R1"]);
  expect(proc.exitCode).toBe(0);
});

it("pt show run ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "run", "R1"]);
  expect(proc.exitCode).toBe(0);
});

it("pt show mac ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "show", "mac", "SW1"]);
  expect(proc.exitCode).toBe(0);
});
