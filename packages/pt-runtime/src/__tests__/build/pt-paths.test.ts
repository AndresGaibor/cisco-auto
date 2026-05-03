import { describe, expect, test } from "bun:test";

import { toPtRuntimePath, toPtRuntimePathLiteral } from "../../build/pt-paths.js";

describe("pt runtime path normalization", () => {
  test("normaliza ruta Windows para Packet Tracer", () => {
    expect(toPtRuntimePath("C:\\Users\\Andres\\pt-dev")).toBe("C:/Users/Andres/pt-dev");
  });

  test("elimina slash final", () => {
    expect(toPtRuntimePath("C:\\Users\\Andres\\pt-dev\\")).toBe("C:/Users/Andres/pt-dev");
    expect(toPtRuntimePath("/Users/andres/pt-dev/")).toBe("/Users/andres/pt-dev");
  });

  test("serializa literal seguro", () => {
    expect(toPtRuntimePathLiteral("C:\\Users\\Andres\\pt-dev")).toBe('"C:/Users/Andres/pt-dev"');
  });
});
