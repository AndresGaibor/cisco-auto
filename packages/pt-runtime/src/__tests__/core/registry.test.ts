import { describe, expect, test } from "bun:test";
import { HandlerRegistry } from "../../core/registry";
import type { HandlerPort } from "../../ports";

function crearHandler(nombre: string, tipos: string[]): HandlerPort {
  return {
    name: nombre,
    supportedTypes: tipos,
    execute: () => ({ ok: true }),
  };
}

describe("HandlerRegistry", () => {
  test("registra y resuelve handlers por nombre y tipo", () => {
    const registry = new HandlerRegistry();
    const handler = crearHandler("device", ["addDevice", "removeDevice"]);

    registry.register(handler);

    expect(registry.getHandler("device")).toBe(handler);
    expect(registry.getHandlerForType("addDevice")).toBe(handler);
    expect(registry.getAllHandlers()).toEqual([handler]);
    expect(registry.getAllSupportedTypes()).toEqual(["addDevice", "removeDevice"]);
  });

  test("rechaza handlers duplicados", () => {
    const registry = new HandlerRegistry();
    registry.register(crearHandler("device", ["addDevice"]));

    expect(() => registry.register(crearHandler("device", ["removeDevice"]))).toThrow();
  });

  test("rechaza tipos duplicados entre handlers", () => {
    const registry = new HandlerRegistry();
    registry.register(crearHandler("device", ["addDevice"]));

    expect(() => registry.register(crearHandler("link", ["addDevice"]))).toThrow();
  });
});
