import { expect, test, describe } from "bun:test";
import { validateBalancedSyntax } from "../../build/syntax-preflight.js";
import { RuntimeGenerator } from "../../index.js";

describe("preflight validation", () => {
  test("detecta llaves desbalanceadas antes de generar", () => {
    const code = `
function main() {
  var x = 1;
// falta cerrar la llave
`;

    const result = validateBalancedSyntax(code);

    expect(result.valid).toBe(false);
    expect(result.errors.some((err) => err.category === "syntax-error")).toBe(true);
  });

  test("validateGenerated falla si main no pasa preflight", async () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-runtime-test",
      devDir: "/tmp/pt-runtime-dev",
    });

    const original = generator.generateMain;
    generator.generateMain = () => "function main() {";

    await expect(generator.validateGenerated()).rejects.toThrow(/validation failed/i);

    generator.generateMain = original;
  });
});
