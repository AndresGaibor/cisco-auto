import { test, expect } from "bun:test";

const it = (name: string, fn: () => void) => {
  if (process.env.PT_LIVE === "1") {
    test(name, fn);
  } else {
    test.skip(name, fn);
  }
};

it("config-ios con comando inválido falla con exit code != 0", async () => {
  const proc = Bun.spawnSync([
    "bun", "run", "pt", "config-ios", "R1", "comando raro",
  ]);
  expect(proc.exitCode).not.toBe(0);
});

it("config-ios con comando incompleto falla", async () => {
  const proc = Bun.spawnSync([
    "bun", "run", "pt", "config-ios", "R1", "ip address",
  ]);
  expect(proc.exitCode).not.toBe(0);
});

it("config-ios con comando válido funciona", async () => {
  const proc = Bun.spawnSync([
    "bun", "run", "pt", "config-ios", "R1", "hostname R1",
  ]);
  expect(proc.exitCode).toBe(0);
});

it("config-ios con interface y no shutdown funciona", async () => {
  const proc = Bun.spawnSync([
    "bun", "run", "pt", "config-ios", "R1",
    "interface GigabitEthernet0/0", "no shutdown",
  ]);
  expect(proc.exitCode).toBe(0);
});
