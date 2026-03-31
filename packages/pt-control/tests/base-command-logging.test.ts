import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BaseCommand } from "../src/cli/base-command.js";
import { LogManager } from "../src/logging/index.js";

class ProbeCommand extends BaseCommand {
  async run(): Promise<void> {
    return;
  }

  obtenerContextoLog() {
    return {
      logManager: this.logManager,
      logSessionId: this.logSessionId,
    };
  }

  async ejecutar<T>(options: {
    action: string;
    targetDevice?: string;
    execute: () => Promise<T>;
  }): Promise<T> {
    this.logManager = this.logManager ?? new LogManager({
      logDir: join(tmpdir(), `pt-control-logs-${Math.random().toString(36).slice(2)}`),
      retentionDays: 7,
      prefix: "pt-control-test",
    });

    this.logSessionId = this.logSessionId ?? LogManager.generateSessionId();
    this.logManager.startSession(this.logSessionId);

    return this.runLoggedCommand({
      action: options.action,
      targetDevice: options.targetDevice,
      execute: options.execute,
    });
  }
}

describe("BaseCommand logging", () => {
  it("registra éxito con metadata de ejecución", async () => {
    const command = new ProbeCommand([], {} as never);

    const result = await command.ejecutar({
      action: "device:add",
      targetDevice: "R1",
      execute: async () => "ok",
    });

    expect(result).toBe("ok");

    const contexto = command.obtenerContextoLog();
    const entries = await contexto.logManager.query({ session_id: contexto.logSessionId });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "device:add",
      target_device: "R1",
      outcome: "success",
      correlation_id: expect.any(String),
      duration_ms: expect.any(Number),
    });
  });

  it("registra error con outcome error", async () => {
    const command = new ProbeCommand([], {} as never);

    await expect(
      command.ejecutar({
        action: "link:remove",
        targetDevice: "S1",
        execute: async () => {
          throw new Error("boom");
        },
      })
    ).rejects.toThrow("boom");

    const contexto = command.obtenerContextoLog();
    const entries = await contexto.logManager.query({ session_id: contexto.logSessionId });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "link:remove",
      target_device: "S1",
      outcome: "error",
      error: "boom",
      correlation_id: expect.any(String),
      duration_ms: expect.any(Number),
    });
  });
});
