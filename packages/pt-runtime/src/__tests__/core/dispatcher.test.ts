import { describe, expect, test } from "bun:test";
import { RuntimeDispatcher } from "../../core/dispatcher";
import { HandlerRegistry } from "../../core/registry";
import type { HandlerDeps, HandlerPort } from "../../ports";

function crearHandler(nombre: string, tipos: string[], resultado: unknown): HandlerPort {
  return {
    name: nombre,
    supportedTypes: tipos,
    execute: () => resultado as any,
  };
}

const deps = {
  getLW: () => ({}) as any,
  getNet: () => ({}) as any,
  dprint: () => {},
} as HandlerDeps;

describe("RuntimeDispatcher", () => {
  test("despacha al handler correcto", () => {
    const registry = new HandlerRegistry();
    const handler = crearHandler("device", ["addDevice"], { ok: true, value: "listo" });
    registry.register(handler);

    const dispatcher = new RuntimeDispatcher(registry);
    const result = dispatcher.dispatch({ type: "addDevice" }, deps);

    expect(result).toEqual({ ok: true, value: "listo" });
  });

  test("retorna error para tipo desconocido", () => {
    const dispatcher = new RuntimeDispatcher(new HandlerRegistry());
    const result = dispatcher.dispatch({ type: "desconocido" }, deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("desconocido");
  });

  test("retorna error para payload inválido", () => {
    const dispatcher = new RuntimeDispatcher(new HandlerRegistry());
    const result = dispatcher.dispatch(null as any, deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Payload inválido");
  });
});
