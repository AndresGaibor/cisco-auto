import { describe, expect, it } from "bun:test";
import { PostVerificationRunner } from "../post-verification-runner.js";

describe("PostVerificationRunner", () => {
  it("ejecuta post-verification simple", async () => {
    const runner = new PostVerificationRunner(
      {
        async run() {
          return {
            executed: true,
            verified: true,
            warnings: [],
            results: [],
          };
        },
      } as any,
      {
        async run() {
          return {
            scenario: "x",
            executed: true,
            verified: true,
            warnings: [],
            sections: [],
          };
        },
      } as any,
    );

    const result = await runner.run({
      device: "R1",
      postChecks: [{ type: "dhcp-pool", poolName: "POOL1" }],
    });

    expect(result.ok).toBe(true);
    expect(result.postVerification?.verified).toBe(true);
  });

  it("ejecuta scenario verification", async () => {
    const runner = new PostVerificationRunner(
      {
        async run() {
          return {
            executed: true,
            verified: true,
            warnings: [],
            results: [],
          };
        },
      } as any,
      {
        async run() {
          return {
            scenario: "scenario-a",
            executed: true,
            verified: true,
            warnings: [],
            sections: [],
          };
        },
      } as any,
    );

    const result = await runner.run({
      scenario: { name: "scenario-a" },
    });

    expect(result.ok).toBe(true);
    expect(result.scenarioVerification?.verified).toBe(true);
  });
});