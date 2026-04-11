import { describe, expect, test } from "bun:test";
import { RuntimeBuilder } from "../../core/runtime-builder";
import { HandlerRegistry } from "../../core/registry";
import type { HandlerPort } from "../../ports";

function crearHandler(nombre: string, tipos: string[]): HandlerPort {
  return {
    name: nombre,
    supportedTypes: tipos,
    execute: () => ({ ok: true }),
  };
}

describe("RuntimeBuilder", () => {
  test("expone los tipos registrados", () => {
    const registry = new HandlerRegistry();
    registry.register(crearHandler("device", ["addDevice"]));

    const builder = new RuntimeBuilder(registry);

    expect(builder.getRegisteredTypes()).toEqual(["addDevice"]);
  });

  test("construye main y runtime", () => {
    const builder = new RuntimeBuilder(new HandlerRegistry());
    const result = builder.buildAll();

    expect(result.main.length).toBeGreaterThan(0);
    expect(result.runtime.length).toBeGreaterThan(0);
  });
});
