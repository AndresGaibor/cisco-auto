import { describe, expect, test } from "bun:test";

import { formatEcuadorTime } from "../../src/telemetry/time-format.js";

describe("formatEcuadorTime", () => {
  test("convierte UTC a hora de Ecuador", () => {
    expect(formatEcuadorTime("2026-01-01T05:00:00.000Z")).toBe("00:00:00");
    expect(formatEcuadorTime("2026-01-01T17:17:53.000Z")).toBe("12:17:53");
  });

  test("devuelve el valor original si la fecha es inválida", () => {
    expect(formatEcuadorTime("no-es-fecha")).toBe("no-es-fecha");
  });
});
