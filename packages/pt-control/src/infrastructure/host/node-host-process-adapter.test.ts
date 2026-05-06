import { describe, expect, test } from "bun:test";
import { NodeHostProcessAdapter } from "./node-host-process-adapter.js";

describe("NodeHostProcessAdapter", () => {
  test("platform devuelve process.platform", () => {
    const adapter = new NodeHostProcessAdapter();
    expect(adapter.platform()).toBe(process.platform);
  });

  test("spawn ejecuta comando y captura stdout/stderr", async () => {
    const adapter = new NodeHostProcessAdapter();
    const result = await adapter.spawn("echo", ["hello"]);
    expect(result.ok).toBe(true);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  test("spawn devuelve ok=false para comando inexistente", async () => {
    const adapter = new NodeHostProcessAdapter();
    const result = await adapter.spawn("/nonexistent/command", []);
    expect(result.ok).toBe(false);
  });

  test("spawn timeout mata el proceso", async () => {
    const adapter = new NodeHostProcessAdapter();
    const result = await adapter.spawn("sleep", ["2"], { timeoutMs: 100 });
    expect(result.ok).toBe(false);
  });
});