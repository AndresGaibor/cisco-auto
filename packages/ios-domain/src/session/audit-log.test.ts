import { describe, it, expect } from "bun:test";
import { AuditLogger, type AuditLogEntry } from "./audit-log";
import { Transaction } from "./transaction";
import type { CommandHandler } from "./command-handler.js";

describe("AuditLogger", () => {
  describe("log()", () => {
    it("agrega una entrada al log", () => {
      const logger = new AuditLogger();
      logger.log({
        timestamp: "2024-01-01T00:00:00.000Z",
        sessionId: "sess-1",
        deviceId: "R1",
        command: "show version",
        status: "success",
      });
      expect(logger.count).toBe(1);
      expect(logger.entries[0].command).toBe("show version");
    });

    it("genera timestamp si no se proporciona", () => {
      const logger = new AuditLogger();
      logger.log({
        sessionId: "sess-1",
        command: "cmd",
        status: "success",
      });
      expect(logger.entries[0].timestamp).toBeDefined();
    });
  });

  describe("logTransaction()", () => {
    it("registra todos los comandos de una transacción", async () => {
      const logger = new AuditLogger();
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      tx.add("cmd2", "rb2");

      const handler: CommandHandler = {
        enterCommand: () => [0, "OK"],
      };

      await tx.execute(handler);
      logger.logTransaction(tx, "sess-1", "tx-1");

      expect(logger.count).toBe(2);
      expect(logger.entries[0]).toMatchObject({
        sessionId: "sess-1",
        command: "cmd1",
        status: "success",
        transactionId: "tx-1",
      });
      expect(logger.entries[1]).toMatchObject({
        sessionId: "sess-1",
        command: "cmd2",
        status: "success",
        transactionId: "tx-1",
      });
    });

    it("registra comandos fallidos como failed", async () => {
      const logger = new AuditLogger();
      const tx = new Transaction();
      tx.add("cmd-ok", "rb1");
      tx.add("cmd-fail", "rb2");

      const handler: CommandHandler = {
        enterCommand(cmd) {
          if (cmd === "cmd-fail") throw new Error("Fail");
          return [0, "OK"];
        },
      };

      await tx.execute(handler);
      logger.logTransaction(tx, "sess-1");

      expect(logger.count).toBe(2);
      expect(logger.entries[0].status).toBe("success");
      expect(logger.entries[1].status).toBe("failed");
    });
  });

  describe("getSessionLogs()", () => {
    it("filtra por sessionId", () => {
      const logger = new AuditLogger();
      logger.log({ sessionId: "sess-1", command: "cmd1", status: "success" });
      logger.log({ sessionId: "sess-2", command: "cmd2", status: "success" });
      logger.log({ sessionId: "sess-1", command: "cmd3", status: "success" });

      const logs = logger.getSessionLogs("sess-1");
      expect(logs).toHaveLength(2);
      expect(logs[0].command).toBe("cmd1");
      expect(logs[1].command).toBe("cmd3");
    });
  });

  describe("getDeviceLogs()", () => {
    it("filtra por deviceId", () => {
      const logger = new AuditLogger();
      logger.log({ sessionId: "s1", deviceId: "R1", command: "cmd1", status: "success" });
      logger.log({ sessionId: "s1", deviceId: "R2", command: "cmd2", status: "success" });
      logger.log({ sessionId: "s1", deviceId: "R1", command: "cmd3", status: "success" });

      const logs = logger.getDeviceLogs("R1");
      expect(logs).toHaveLength(2);
      expect(logs[0].command).toBe("cmd1");
      expect(logs[1].command).toBe("cmd3");
    });
  });

  describe("getFailedLogs()", () => {
    it("retorna solo entradas fallidas", () => {
      const logger = new AuditLogger();
      logger.log({ sessionId: "s1", command: "cmd1", status: "success" });
      logger.log({ sessionId: "s1", command: "cmd2", status: "failed" });
      logger.log({ sessionId: "s1", command: "cmd3", status: "rolled_back" });
      logger.log({ sessionId: "s1", command: "cmd4", status: "failed" });

      const failed = logger.getFailedLogs();
      expect(failed).toHaveLength(2);
      expect(failed[0].command).toBe("cmd2");
      expect(failed[1].command).toBe("cmd4");
    });
  });

  describe("export()", () => {
    it("exporta en formato JSON Lines", () => {
      const logger = new AuditLogger();
      logger.log({
        sessionId: "s1",
        deviceId: "R1",
        command: "cmd1",
        status: "success",
      });
      logger.log({
        sessionId: "s1",
        deviceId: "R1",
        command: "cmd2",
        status: "failed",
        error: "error",
      });

      const output = logger.export("jsonl");
      const lines = output.split("\n");
      expect(lines).toHaveLength(2);

      const entry1 = JSON.parse(lines[0]);
      expect(entry1).toMatchObject({
        sessionId: "s1",
        deviceId: "R1",
        command: "cmd1",
        status: "success",
      });

      const entry2 = JSON.parse(lines[1]);
      expect(entry2).toMatchObject({
        sessionId: "s1",
        deviceId: "R1",
        command: "cmd2",
        status: "failed",
        error: "error",
      });
    });

    it("export vacío retorna string vacío", () => {
      const logger = new AuditLogger();
      expect(logger.export("jsonl")).toBe("");
    });
  });

  describe("propiedades", () => {
    it("count refleja número de entradas", () => {
      const logger = new AuditLogger();
      expect(logger.count).toBe(0);
      logger.log({ sessionId: "s1", command: "cmd1", status: "success" });
      expect(logger.count).toBe(1);
    });

    it("entries retorna copia", () => {
      const logger = new AuditLogger();
      logger.log({ sessionId: "s1", command: "cmd1", status: "success" });
      const entries = logger.entries;
      expect(entries).toHaveLength(1);
    });
  });
});
