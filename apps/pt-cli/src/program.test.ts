import { Command } from "commander";
import { describe, expect, test } from "bun:test";

import { attachCommandTiming } from "./program";

describe("attachCommandTiming", () => {
  test("imprime la ruta completa del comando", async () => {
    const output: string[] = [];
    const program = new Command().name("cisco-auto").exitOverride();
    const originalNow = Date.now;
    const times = [1_000, 2_234];

    Date.now = () => times.shift() ?? 2_234;

    try {
      attachCommandTiming(program, (message) => {
        output.push(message);
      });

      program
        .command("inspect")
        .command("topology")
        .action(() => {});

      await program.parseAsync(["bun", "cisco-auto", "inspect", "topology"]);
    } finally {
      Date.now = originalNow;
    }

    expect(output.join("")).toContain("⏱ cisco-auto inspect topology · 1.2s");
  });
});
