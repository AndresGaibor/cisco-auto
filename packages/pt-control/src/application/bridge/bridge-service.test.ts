import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getRuntimeTrace } from "./bridge-service.js";

describe("getRuntimeTrace", () => {
  const originalPtDevDir = process.env.PT_DEV_DIR;
  let tempRoot = "";

  afterEach(() => {
    if (originalPtDevDir === undefined) {
      delete process.env.PT_DEV_DIR;
    } else {
      process.env.PT_DEV_DIR = originalPtDevDir;
    }

    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  test("lee session.log desde pt-dev/logs", () => {
    tempRoot = mkdtempSync(join(process.cwd(), "tmp-bridge-trace-"));
    mkdirSync(join(tempRoot, "logs"), { recursive: true });
    process.env.PT_DEV_DIR = tempRoot;

    writeFileSync(
      join(tempRoot, "logs", "session.log"),
      `${JSON.stringify({
        phase: "end",
        correlation_id: "cmd_1",
        action: "terminal.plan.run",
        timestamp: "2026-05-05T00:00:00.000Z",
        ok: true,
        completionReason: "completed",
      })}\n`,
    );

    expect(getRuntimeTrace(1)).toEqual([
      {
        id: "cmd_1",
        type: "terminal.plan.run",
        completedAt: new Date("2026-05-05T00:00:00.000Z").getTime(),
        ok: true,
        ts: new Date("2026-05-05T00:00:00.000Z").getTime(),
        status: "completed",
        commandType: undefined,
      },
    ]);
  });
});
