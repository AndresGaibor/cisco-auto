import { describe, it, expect } from "bun:test";
import { Transaction, type TransactionCommand, type TransactionLogEntry } from "./transaction";
import type { CommandHandler } from "./command-handler.js";

function createMockHandler(responses: Record<string, [number, string]> = {}): CommandHandler {
  return {
    enterCommand(cmd: string): [number, string] {
      if (cmd in responses) {
        return responses[cmd];
      }
      return [0, "OK"];
    },
  };
}

function createFailingHandler(failAt: string): CommandHandler {
  return {
    enterCommand(cmd: string): [number, string] {
      if (cmd === failAt) {
        throw new Error("Command failed");
      }
      return [0, "OK"];
    },
  };
}

describe("Transaction", () => {
  describe("add()", () => {
    it("agrega un comando con su rollback", () => {
      const tx = new Transaction();
      tx.add("show version", "no show version");
      expect(tx.commandCount).toBe(1);
      expect(tx.commands[0]).toEqual({
        command: "show version",
        rollbackCommand: "no show version",
      });
    });

    it("agrega comando con deviceId y description", () => {
      const tx = new Transaction();
      tx.add("interface Gig0/0", "no interface Gig0/0", {
        deviceId: "R1",
        description: "Configurar interfaz",
      });
      expect(tx.commands[0]).toEqual({
        command: "interface Gig0/0",
        rollbackCommand: "no interface Gig0/0",
        deviceId: "R1",
        description: "Configurar interfaz",
      });
    });

    it("retorna this para encadenamiento", () => {
      const tx = new Transaction();
      const result = tx.add("cmd1", "rollback1");
      expect(result).toBe(tx);
    });
  });

  describe("addBatch()", () => {
    it("agrega múltiples comandos", () => {
      const tx = new Transaction();
      const commands: TransactionCommand[] = [
        { command: "cmd1", rollbackCommand: "rb1" },
        { command: "cmd2", rollbackCommand: "rb2" },
        { command: "cmd3", rollbackCommand: "rb3" },
      ];
      tx.addBatch(commands);
      expect(tx.commandCount).toBe(3);
    });

    it("retorna this para encadenamiento", () => {
      const tx = new Transaction();
      const result = tx.addBatch([]);
      expect(result).toBe(tx);
    });
  });

  describe("execute()", () => {
    it("ejecuta comandos en orden y retorna éxito", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      tx.add("cmd2", "rb2");

      const handler = createMockHandler({
        cmd1: [0, "OK1"],
        cmd2: [0, "OK2"],
      });

      const result = await tx.execute(handler);
      expect(result.success).toBe(true);
      expect(result.failedAtIndex).toBeUndefined();
      expect(result.log).toHaveLength(2);
      expect(result.log[0]).toMatchObject({
        command: "cmd1",
        status: "success",
        output: "OK1",
      });
      expect(result.log[1]).toMatchObject({
        command: "cmd2",
        status: "success",
        output: "OK2",
      });
    });

    it("detiene la ejecución al primer error", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      tx.add("cmd2-fail", "rb2");
      tx.add("cmd3", "rb3");

      const handler = createFailingHandler("cmd2-fail");

      const result = await tx.execute(handler);
      expect(result.success).toBe(false);
      expect(result.failedAtIndex).toBe(1);
      expect(result.log).toHaveLength(3);
      expect(result.log[0].status).toBe("success");
      expect(result.log[1].status).toBe("failed");
      expect(result.log[1].error).toBe("Command failed");
      expect(result.log[2].status).toBe("pending");
    });

    it("transacción vacía retorna éxito sin log", async () => {
      const tx = new Transaction();
      const handler = createMockHandler();
      const result = await tx.execute(handler);
      expect(result.success).toBe(true);
      expect(result.log).toHaveLength(0);
    });

    it("no se puede ejecutar dos veces", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      await tx.execute(handler);
      await expect(tx.execute(handler)).rejects.toThrow("Transaction already executed");
    });

    it("registra duración de cada comando", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      const result = await tx.execute(handler);
      expect(result.log[0].durationMs).toBeDefined();
      expect(result.log[0].durationMs! >= 0).toBe(true);
    });
  });

  describe("rollback()", () => {
    it("revertir comandos en orden inverso", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rollback-cmd1");
      tx.add("cmd2", "rollback-cmd2");
      tx.add("cmd3", "rollback-cmd3");

      const executed: string[] = [];
      const handler: CommandHandler = {
        enterCommand(cmd: string): [number, string] {
          executed.push(cmd);
          return [0, "OK"];
        },
      };

      await tx.execute(handler);
      await tx.rollback(handler);

      expect(executed).toEqual([
        "cmd1",
        "cmd2",
        "cmd3",
        "rollback-cmd3",
        "rollback-cmd2",
        "rollback-cmd1",
      ]);
    });

    it("solo hace rollback de comandos exitosos", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rollback-cmd1");
      tx.add("cmd2-fail", "rollback-cmd2");
      tx.add("cmd3", "rollback-cmd3");

      const executed: string[] = [];
      const handler: CommandHandler = {
        enterCommand(cmd: string): [number, string] {
          if (cmd === "cmd2-fail") {
            throw new Error("Failed");
          }
          executed.push(cmd);
          return [0, "OK"];
        },
      };

      const execResult = await tx.execute(handler);
      expect(execResult.success).toBe(false);
      await tx.rollback(handler);

      expect(executed).toEqual(["cmd1", "rollback-cmd1"]);
    });

    it("no se puede hacer rollback sin ejecutar", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      await expect(tx.rollback(handler)).rejects.toThrow("Transaction not executed yet");
    });

    it("no se puede hacer rollback dos veces", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      await tx.execute(handler);
      await tx.rollback(handler);
      await expect(tx.rollback(handler)).rejects.toThrow("Transaction already rolled back");
    });

    it("transacción vacía rollback retorna éxito", async () => {
      const tx = new Transaction();
      const handler = createMockHandler();
      await tx.execute(handler);
      const result = await tx.rollback(handler);
      expect(result.success).toBe(true);
    });

    it("continua rollback si un rollback falla", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rollback-cmd1-fail");
      tx.add("cmd2", "rollback-cmd2");

      const handler: CommandHandler = {
        enterCommand(cmd: string): [number, string] {
          if (cmd === "rollback-cmd1-fail") {
            throw new Error("Rollback failed");
          }
          return [0, "OK"];
        },
      };

      await tx.execute(handler);
      const result = await tx.rollback(handler);

      expect(result.success).toBe(false);
      expect(result.log[0].status).toBe("failed");
      expect(result.log[1].status).toBe("rolled_back");
    });
  });

  describe("getLog()", () => {
    it("retorna copia del log", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      await tx.execute(handler);

      const log = tx.getLog();
      expect(log).toHaveLength(1);
      expect(log[0].command).toBe("cmd1");
    });

    it("log está vacío antes de ejecutar", () => {
      const tx = new Transaction();
      expect(tx.getLog()).toHaveLength(0);
    });
  });

  describe("propiedades", () => {
    it("isExecuted refleja estado", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      expect(tx.isExecuted).toBe(false);
      await tx.execute(createMockHandler());
      expect(tx.isExecuted).toBe(true);
    });

    it("isRolledBack refleja estado", async () => {
      const tx = new Transaction();
      tx.add("cmd1", "rb1");
      const handler = createMockHandler();
      await tx.execute(handler);
      expect(tx.isRolledBack).toBe(false);
      await tx.rollback(handler);
      expect(tx.isRolledBack).toBe(true);
    });

    it("commandCount es correcto", () => {
      const tx = new Transaction();
      expect(tx.commandCount).toBe(0);
      tx.add("cmd1", "rb1");
      expect(tx.commandCount).toBe(1);
      tx.addBatch([{ command: "cmd2", rollbackCommand: "rb2" }]);
      expect(tx.commandCount).toBe(2);
    });
  });
});
