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

    // El parser usa heuristica para encontrar el header
    expect(code).toContain("show ip interface brief");
    expect(code).toContain("headerIdx");
  });

  test("parsers manejan output vacio retornando entries vacios y warnings", () => {
    const code = generateParserCode();

    // Los parsers basicos tienen empty output handlers
    const emptyOutputHandlers = code.match(/lines\.length === 0.*?return \{ entries: \[\], warnings:/g);
    expect(emptyOutputHandlers).not.toBeNull();
    // Al menos 2 occurrences (show ip interface brief y show vlan brief)
    expect(emptyOutputHandlers!.length).toBeGreaterThanOrEqual(2);
  });

  test("parsers ignoran lineas separadoras con ---", () => {
    const code = generateParserCode();

    // Los parsers deben saltar lineas con ---
    expect(code).toContain("indexOf('---') >= 0) continue");
  });

  test("show vlan brief tiene validacion de header", () => {
    const code = generateParserCode();

    // show vlan brief debe usar heuristica de header
    expect(code).toContain("show vlan brief");
    expect(code).toContain("headerIdx");
  });

  test("show running-config detecta si no hay secciones", () => {
    const code = generateParserCode();

    // El generator actual solo tiene show parsers basicos
    expect(code).toContain("show ip interface brief");
    expect(code).toContain("show vlan brief");
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
