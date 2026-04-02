import { describe, test, expect } from "bun:test";
import { generateParserCode } from "../../utils/parser-generator";

describe("Parser Generator", () => {
  test("genera codigo con warnings array", () => {
    const code = generateParserCode();

    // Todos los parsers deben declarar var warnings
    expect(code).toContain("var warnings = []");
  });

  test("show ip interface brief tiene validacion de header", () => {
    const code = generateParserCode();

    // Debe verificar que el header contiene las columnas esperadas
    expect(code).toContain("expectedCols");
    expect(code).toContain("Header missing expected column");
  });

  test("parsers manejan output vacio retornando entries vacios y warnings", () => {
    const code = generateParserCode();

    // Todos los parsers deben tener: if (lines.length === 0) return { entries: [], warnings: ...
    const emptyOutputHandlers = code.match(/lines\.length === 0.*?return \{ entries: \[\], warnings:/g);
    expect(emptyOutputHandlers).not.toBeNull();
    // Debe aparecer al menos 8 veces (para cada parser)
    expect(emptyOutputHandlers!.length).toBeGreaterThanOrEqual(8);
  });

  test("parsers ignoran lineas separadoras con ---", () => {
    const code = generateParserCode();

    // Los parsers deben saltar lineas con ---
    expect(code).toContain("line.indexOf(\"---\") >= 0) continue");
  });

  test("show vlan brief tiene validacion de header", () => {
    const code = generateParserCode();

    // show vlan brief debe validar el header
    expect(code).toContain("show vlan brief");
    expect(code).toContain("Header may be unexpected");
  });

  test("show running-config detecta si no hay secciones", () => {
    const code = generateParserCode();

    // Debe verificar si no se parseo nada
    expect(code).toContain("No config sections parsed");
  });

  test("__getParser existe y funciona", () => {
    const code = generateParserCode();

    expect(code).toContain("function __getParser");
    expect(code).toContain("IOS_PARSERS[cmd]");
    expect(code).toContain("cmd.startsWith(key.toLowerCase())");
  });

  test("genera al menos 5000 caracteres de codigo", () => {
    const code = generateParserCode();
    expect(code.length).toBeGreaterThan(5000);
  });
});
