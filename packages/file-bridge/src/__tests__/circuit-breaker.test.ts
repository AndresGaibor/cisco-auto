import { describe, expect, test, jest } from "bun:test";
import { CircuitBreaker, CircuitBreakerOpenError } from "../circuit-breaker.js";

describe("CircuitBreaker", () => {
  describe("estado inicial", () => {
    test("comienza en estado closed", () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe("closed");
    });

    test("isAllowed retorna true en estado closed", () => {
      const cb = new CircuitBreaker();
      expect(cb.isAllowed()).toBe(true);
    });
  });

  describe("transición a open por umbral de fallos", () => {
    test("abre el circuito tras alcanzar failureThreshold", () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      cb.onFailure();
      expect(cb.getState()).toBe("closed");
      cb.onFailure();
      expect(cb.getState()).toBe("closed");
      cb.onFailure();
      expect(cb.getState()).toBe("open");
    });

    test("el umbral por defecto es 5 fallos", () => {
      const cb = new CircuitBreaker();
      for (let i = 0; i < 5; i++) cb.onFailure();
      expect(cb.getState()).toBe("open");
    });

    test("isAllowed retorna false en estado open", () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.onFailure();
      expect(cb.isAllowed()).toBe(false);
    });
  });

  describe("half-open por timeout", () => {
    test("transiciona a half-open tras el timeout", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, timeoutMs: 50 });
      cb.onFailure();
      expect(cb.getState()).toBe("open");

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.getState()).toBe("half-open");
      expect(cb.isAllowed()).toBe(true);
    });
  });

  describe("recuperación en half-open", () => {
    test("cierra el circuito tras successThreshold éxitos en half-open", async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeoutMs: 50,
      });

      cb.onFailure();
      expect(cb.getState()).toBe("open");

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.getState()).toBe("half-open");

      cb.onSuccess();
      expect(cb.getState()).toBe("half-open");
      cb.onSuccess();
      expect(cb.getState()).toBe("closed");
    });

    test("un fallo en half-open vuelve a abrir el circuito", async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeoutMs: 50,
      });

      for (let i = 0; i < 3; i++) cb.onFailure();
      expect(cb.getState()).toBe("open");

      await new Promise((r) => setTimeout(r, 60));
      expect(cb.getState()).toBe("half-open");

      cb.onFailure();
      expect(cb.getState()).toBe("open");
    });
  });

  describe("call()", () => {
    test("ejecuta la función exitosamente", async () => {
      const cb = new CircuitBreaker();
      const result = await cb.call(async () => "ok");
      expect(result).toBe("ok");
    });

    test("lanza CircuitBreakerOpenError si el circuito está abierto", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.onFailure();

      expect(cb.getState()).toBe("open");
      expect(cb.isAllowed()).toBe(false);

      try {
        await cb.call(async () => "nunca");
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitBreakerOpenError);
        expect((err as CircuitBreakerOpenError).state).toBe("open");
      }
    });

    test("registra éxito y resetea contador de fallos", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      cb.onFailure();
      cb.onFailure();

      await cb.call(async () => "ok");
      expect(cb.getStats().failureCount).toBe(0);
    });

    test("registra fallo y transiciona a open si alcanza umbral", async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2 });

      try {
        await cb.call(async () => { throw new Error("fail"); });
      } catch {}
      expect(cb.getState()).toBe("closed");

      try {
        await cb.call(async () => { throw new Error("fail"); });
      } catch {}
      expect(cb.getState()).toBe("open");
    });
  });

  describe("callbacks", () => {
    test("onOpen se llama al abrir el circuito", () => {
      const onOpen = jest.fn();
      const cb = new CircuitBreaker({ failureThreshold: 2, onOpen });

      cb.onFailure();
      expect(onOpen).not.toHaveBeenCalled();

      cb.onFailure();
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    test("onClose se llama al cerrar el circuito", async () => {
      const onClose = jest.fn();
      const cb = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeoutMs: 50,
        onClose,
      });

      cb.onFailure();
      await new Promise((r) => setTimeout(r, 60));

      cb.onSuccess();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("forceState", () => {
    test("fuerza estado open con timestamp actualizado", () => {
      const cb = new CircuitBreaker();
      cb.forceState("open");
      expect(cb.getState()).toBe("open");
      expect(cb.getStats().lastFailureTime).toBeGreaterThan(0);
    });

    test("fuerza estado closed con contadores reseteados", () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.onFailure();
      expect(cb.getState()).toBe("open");
      cb.forceState("closed");
      expect(cb.getState()).toBe("closed");
      expect(cb.getStats().failureCount).toBe(0);
    });
  });

  describe("reset", () => {
    test("resetea todos los contadores y estado", () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      cb.onFailure();
      expect(cb.getState()).toBe("open");
      cb.reset();
      expect(cb.getState()).toBe("closed");
      expect(cb.getStats().failureCount).toBe(0);
      expect(cb.getStats().successCount).toBe(0);
    });
  });

  describe("getStats", () => {
    test("retorna snapshot del estado actual", () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      cb.onFailure();
      const stats = cb.getStats();
      expect(stats.state).toBe("closed");
      expect(stats.failureCount).toBe(1);
      expect(stats.successCount).toBe(0);
      expect(typeof stats.lastFailureTime).toBe("number");
    });
  });
});
