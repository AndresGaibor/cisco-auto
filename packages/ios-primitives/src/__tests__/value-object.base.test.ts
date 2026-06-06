import { describe, expect, test } from "bun:test";
import { ValueObject } from "../domain/shared/base/value-object.base.js";

class TestVo extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}

class NumberVo extends ValueObject<number> {
  constructor(value: number) {
    super(value);
  }
}

class ObjectVo extends ValueObject<{ a: number; b: string }> {
  constructor(value: { a: number; b: string }) {
    super(value);
  }
}

class ArrayVo extends ValueObject<number[]> {
  constructor(value: number[]) {
    super(value);
  }
}

describe("ValueObject", () => {
  test("almacena el valor correctamente", () => {
    const vo = new TestVo("hello");
    expect(vo.value).toBe("hello");
  });

  test("toString retorna representación string del valor", () => {
    const vo = new TestVo("hello");
    expect(vo.toString()).toBe("hello");

    const nv = new NumberVo(42);
    expect(nv.toString()).toBe("42");
  });

  test("equals retorna true para mismo tipo y mismo valor", () => {
    const a = new TestVo("hello");
    const b = new TestVo("hello");
    expect(a.equals(b)).toBe(true);
  });

  test("equals retorna false para diferente tipo", () => {
    const a = new TestVo("hello");
    const b = new NumberVo(42);
    expect(a.equals(b as unknown as ValueObject<string>)).toBe(false);
  });

  test("equals retorna false para null/undefined", () => {
    const a = new TestVo("hello");
    expect(a.equals(null as unknown as ValueObject<string>)).toBe(false);
    expect(a.equals(undefined as unknown as ValueObject<string>)).toBe(false);
  });

  test("equals retorna false para diferente valor", () => {
    const a = new TestVo("hello");
    const b = new TestVo("world");
    expect(a.equals(b)).toBe(false);
  });

  test("equals con deepEqual para objetos", () => {
    const a = new ObjectVo({ a: 1, b: "x" });
    const b = new ObjectVo({ a: 1, b: "x" });
    expect(a.equals(b)).toBe(true);

    const c = new ObjectVo({ a: 2, b: "x" });
    expect(a.equals(c)).toBe(false);
  });

  test("equals con deepEqual para arrays", () => {
    const a = new ArrayVo([1, 2, 3]);
    const b = new ArrayVo([1, 2, 3]);
    expect(a.equals(b)).toBe(true);

    const c = new ArrayVo([1, 2, 4]);
    expect(a.equals(c)).toBe(false);
  });

  test("toJSON retorna el valor primitivo", () => {
    const vo = new TestVo("hello");
    expect(vo.toJSON()).toBe("hello");

    const nv = new NumberVo(42);
    expect(nv.toJSON()).toBe(42);
  });

  test("toJSON retorna el objeto sin transformación si no hay toJSON interno", () => {
    const obj = { a: 1, b: "x" };
    const vo = new ObjectVo(obj);
    expect(vo.toJSON()).toEqual(obj);
  });

  test("el valor está congelado (Object.freeze)", () => {
    const vo = new TestVo("hello");
    expect(Object.isFrozen((vo as unknown as { _value: string })._value)).toBe(true);
  });
});
