import { describe, expect, test } from "bun:test";

import { buildCommandResultEnvelope } from "../../../pt/kernel/command-result-envelope";

describe("buildCommandResultEnvelope", () => {
  test("preserva startedAt y completedAt distintos", () => {
    const envelope = buildCommandResultEnvelope(
      {
        id: "cmd-1",
        seq: 7,
        startedAt: 1500,
      },
      { ok: true, raw: "done", status: 0 },
      2000,
    );

    expect(envelope).toMatchObject({
      id: "cmd-1",
      seq: 7,
      startedAt: 1500,
      completedAt: 2000,
      status: "completed",
      ok: true,
    });
  });
});
