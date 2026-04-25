import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  Transaction,
  type CommandHandler,
} from "@cisco-auto/ios-domain/session";
import { executeTransactionWithMemory } from "./integration.ts";
import { getMemory } from "../memory/index.js";

describe("executeTransactionWithMemory", () => {
  it("persiste el historial y la auditoría", async () => {
    const dbPath = join(tmpdir(), `cisco-auto-wave10-${Date.now()}.sqlite`);
    const memory = getMemory(dbPath);

    const tx = new Transaction();
    tx.add("show version", "show version rollback", { deviceId: "R1" });
    tx.add("show ip interface brief", "clear counters", { deviceId: "R1" });

    const handler: CommandHandler = {
      enterCommand(cmd: string): [number, string] {
        return [0, `OK:${cmd}`];
      },
    };

    const result = await executeTransactionWithMemory(tx, handler, "sess-1", "tx-1");

    expect(result.transactionResult.success).toBe(true);
    expect(memory.history.getSessionCommands("sess-1")).toHaveLength(2);
    expect(memory.audit.getSessionLogs("sess-1")).toHaveLength(2);
    expect(memory.audit.getTransactionLogs("tx-1")).toHaveLength(2);

    memory.close();
    rmSync(dbPath, { force: true });
  });
});
