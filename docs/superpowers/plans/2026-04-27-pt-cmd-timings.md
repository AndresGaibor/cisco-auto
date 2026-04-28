# pt cmd timings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose bridge/runtime timing data in `pt cmd` output for both human-readable and JSON modes.

**Architecture:** `pt-control` already attaches timing telemetry to `TerminalCommandResult.evidence`. The CLI layer will project that evidence into a lightweight `timings` field on `CmdCliResult` and render a compact summary line in the standard text output while leaving JSON output structurally enriched.

**Tech Stack:** TypeScript, Bun tests, existing CLI renderers

---

### Task 1: Extend `pt cmd` result shaping

**Files:**
- Modify: `apps/pt-cli/src/commands/cmd/render.ts`
- Test: `apps/pt-cli/src/commands/cmd/render.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { toCmdCliResult } from "./render.js";

describe("toCmdCliResult", () => {
  test("copies timings from evidence into the CLI result", () => {
    const result = toCmdCliResult({
      ok: true,
      action: "ios.exec",
      device: "R1",
      deviceKind: "ios",
      command: "show version",
      output: "output",
      status: 0,
      warnings: [],
      evidence: { timings: { sentAt: 1, resultSeenAt: 2, receivedAt: 3, waitMs: 2 } },
    } as never);

    expect(result.timings).toEqual({ sentAt: 1, resultSeenAt: 2, receivedAt: 3, waitMs: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/pt-cli/src/commands/cmd/render.test.ts`
Expected: FAIL because `timings` is not yet mapped.

- [ ] **Step 3: Write minimal implementation**

```ts
const timings = typeof result.evidence === "object" && result.evidence !== null
  ? (result.evidence as { timings?: unknown }).timings
  : undefined;

return {
  ...
  evidence: result.evidence,
  timings,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/pt-cli/src/commands/cmd/render.test.ts`
Expected: PASS.

### Task 2: Render timings in human output

**Files:**
- Modify: `apps/pt-cli/src/commands/cmd/render.ts`
- Test: `apps/pt-cli/src/commands/cmd/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test, vi } from "bun:test";
import { printCmdResult } from "./render.js";

describe("printCmdResult", () => {
  test("prints a compact timings summary in text mode", () => {
    const logSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as never);

    printCmdResult({
      schemaVersion: "1.0",
      ok: true,
      action: "cmd.exec",
      device: "R1",
      deviceKind: "ios",
      command: "show version",
      output: "output",
      status: 0,
      warnings: [],
      nextSteps: [],
      timings: { sentAt: 1, resultSeenAt: 2, receivedAt: 3, waitMs: 2 },
    } as never, { json: false, raw: false, quiet: false });

    expect(logSpy.mock.calls.flat().join(" ")).toContain("Timings:");
    logSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/pt-cli/src/commands/cmd/render.test.ts`
Expected: FAIL because the summary line is missing.

- [ ] **Step 3: Write minimal implementation**

```ts
if (result.timings && !options.quiet) {
  process.stdout.write(`Timings: ...\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/pt-cli/src/commands/cmd/render.test.ts`
Expected: PASS.

### Task 3: Verify command wiring

**Files:**
- Modify: `apps/pt-cli/src/commands/cmd/index.ts` only if needed to pass the enriched result through
- Test: `apps/pt-cli/src/commands/cmd/index.test.ts` or existing command tests

- [ ] **Step 1: Confirm the command path still calls `printCmdResult()` with the enriched result**
- [ ] **Step 2: Run the focused `cmd` tests and confirm JSON output still includes the new `timings` field**
- [ ] **Step 3: Keep the implementation minimal; do not alter non-`cmd` commands**
