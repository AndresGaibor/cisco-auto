import { describe, expect, test } from "bun:test";

import {
  createVectorClock,
  incrementVectorClock,
  mergeVectorClocks,
  vectorClockCompare,
  isDeltaCausallyReady,
} from "../protocol/vector-clock.js";

describe("createVectorClock", () => {
  test("crea clock vacio si no hay peerIds", () => {
    const clock = createVectorClock();
    expect(clock).toEqual({});
  });

  test("crea clock con peers en 0", () => {
    const clock = createVectorClock(["a", "b"]);
    expect(clock).toEqual({ a: 0, b: 0 });
  });
});

describe("incrementVectorClock", () => {
  test("incrementa peer especifico", () => {
    const clock = createVectorClock(["a", "b"]);
    const next = incrementVectorClock(clock, "a");
    expect(next.a).toBe(1);
    expect(next.b).toBe(0);
  });

  test("no muta original", () => {
    const clock = createVectorClock(["a"]);
    incrementVectorClock(clock, "a");
    expect(clock.a).toBe(0);
  });
});

describe("mergeVectorClocks", () => {
  test("toma el maximo de cada peer", () => {
    const a = { x: 3, y: 1 };
    const b = { x: 2, y: 5 };
    const merged = mergeVectorClocks(a, b);
    expect(merged).toEqual({ x: 3, y: 5 });
  });

  test("incluye peers que solo existen en uno", () => {
    const a = { x: 1 };
    const b = { y: 2 };
    const merged = mergeVectorClocks(a, b);
    expect(merged).toEqual({ x: 1, y: 2 });
  });
});

describe("vectorClockCompare", () => {
  test("equal cuando todos los valores coinciden", () => {
    expect(vectorClockCompare({ a: 1 }, { a: 1 })).toBe("equal");
  });

  test("happened-before cuando todos son <= y alguno <", () => {
    expect(vectorClockCompare({ a: 1, b: 2 }, { a: 2, b: 3 })).toBe("happened-before");
  });

  test("happened-after cuando todos son >= y alguno >", () => {
    expect(vectorClockCompare({ a: 3, b: 4 }, { a: 2, b: 3 })).toBe("happened-after");
  });

  test("concurrent cuando hay mezcla de mayor/menor", () => {
    expect(vectorClockCompare({ a: 2, b: 1 }, { a: 1, b: 2 })).toBe("concurrent");
  });
});

describe("isDeltaCausallyReady", () => {
  test("delta con seq siguiente esta listo", () => {
    expect(isDeltaCausallyReady({ a: 2 }, { a: 1 }, "a")).toBe(true);
  });

  test("delta con seq muy alta no esta listo", () => {
    expect(isDeltaCausallyReady({ a: 5 }, { a: 1 }, "a")).toBe(false);
  });

  test("delta ya aplicado no esta listo", () => {
    expect(isDeltaCausallyReady({ a: 1 }, { a: 1 }, "a")).toBe(false);
  });
});
