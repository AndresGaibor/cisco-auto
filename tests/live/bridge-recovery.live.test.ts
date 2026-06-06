import { test, expect } from "bun:test";

const it = (name: string, fn: () => void) => {
  if (process.env.PT_LIVE === "1") {
    test(name, fn);
  } else {
    test.skip(name, fn);
  }
};

it("pt bridge stats ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "bridge", "stats"]);
  expect(proc.exitCode).toBe(0);
});

it("pt bridge clean --dry-run ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "bridge", "clean", "--dry-run"]);
  expect(proc.exitCode).toBe(0);
});

it("pt bridge purge-dead-letter --dry-run ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "bridge", "purge-dead-letter", "--dry-run"]);
  expect(proc.exitCode).toBe(0);
});

it("pt bridge purge --dry-run ejecuta sin error", async () => {
  const proc = Bun.spawnSync(["bun", "run", "pt", "bridge", "purge", "--dry-run"]);
  expect(proc.exitCode).toBe(0);
});
