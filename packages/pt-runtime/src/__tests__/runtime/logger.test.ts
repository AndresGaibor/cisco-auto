// packages/pt-runtime/src/__tests__/runtime/logger.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { initializeLogger, getLogger } from "../../runtime/logger";

describe("Logger robusto con fallback", () => {
  test("initializeLogger acepta un transport function", () => {
    let callCount = 0;
    const transportMock = () => {
      callCount++;
    };
    const logger = initializeLogger({
      transport: transportMock,
    });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    logger.info("test");
    expect(callCount).toBe(1);
  });

  test("el transport recibe el log entry", () => {
    let capturedEntry: any = null;
    const transportMock = (entry: any) => {
      capturedEntry = entry;
    };

    const logger = initializeLogger({ transport: transportMock });
    logger.info("test message");

    expect(capturedEntry).not.toBeNull();
    expect(capturedEntry.msg).toBe("test message");
    expect(capturedEntry.level).toBe("info");
  });

  test("el transport recibe campos completos del entry", () => {
    let capturedEntry: any = null;
    const transportMock = (entry: any) => {
      capturedEntry = entry;
    };

    const logger = initializeLogger({ transport: transportMock });
    logger
      .withTrace("trace-123")
      .withDevice("Router1")
      .withCommand("config")
      .withTicket("TICKET-001")
      .info("operacion completa");

    expect(capturedEntry.traceId).toBe("trace-123");
    expect(capturedEntry.device).toBe("Router1");
    expect(capturedEntry.commandType).toBe("config");
    expect(capturedEntry.ticket).toBe("TICKET-001");
    expect(capturedEntry.logger).toBe("pt-runtime");
  });

  test("el logger nunca lanza excepcion aunque el transport falle", () => {
    const badTransport = () => {
      throw new Error("transport exploded");
    };

    expect(() => {
      const logger = initializeLogger({
        transport: badTransport as any,
      });
      logger.info("this should not throw");
    }).not.toThrow();
  });

  test("nivel debug filtra correctamente", () => {
    const entries: any[] = [];
    const transportMock = (entry: any) => entries.push(entry);

    const logger = initializeLogger({
      level: "warn",
      transport: transportMock,
    });

    logger.info("info message - should not appear");
    logger.warn("warn message - should appear");
    logger.error("error message - should appear");

    expect(entries.length).toBe(2);
    expect(entries[0].level).toBe("warn");
    expect(entries[1].level).toBe("error");
  });

  test("getLogger retorna logger hijo con nombre personalizado", () => {
    let capturedEntry: any = null;
    const transportMock = (entry: any) => {
      capturedEntry = entry;
    };

    initializeLogger({ transport: transportMock });
    const childLogger = getLogger("child-context");
    childLogger.info("child message");

    expect(capturedEntry.logger).toBe("child-context");
    expect(capturedEntry.msg).toBe("child message");
  });

  test("child logger hereda contexto del padre", () => {
    let capturedEntry: any = null;
    const transportMock = (entry: any) => {
      capturedEntry = entry;
    };

    const parentLogger = initializeLogger({ transport: transportMock });
    const childLogger = parentLogger.withDevice("R1").withTrace("t1");
    childLogger.info("nested child");

    expect(capturedEntry.device).toBe("R1");
    expect(capturedEntry.traceId).toBe("t1");
    expect(capturedEntry.msg).toBe("nested child");
  });
});
