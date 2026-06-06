import { describe, test, expect } from "bun:test";
import { detectIosSemanticFailure, extractPrimaryIosErrorMessage } from "../command-result-mapper.js";

describe("detectIosSemanticFailure", () => {
  test("detecta errores semánticos básicos", () => {
    expect(detectIosSemanticFailure("% Invalid input detected")).not.toBeNull();
    expect(detectIosSemanticFailure("% Incomplete command")).not.toBeNull();
    expect(detectIosSemanticFailure("% Ambiguous command")).not.toBeNull();
  });

  test("detecta DNS lookup bloqueante", () => {
    const output = 'Translating "shwo"....domain server (255.255.255.255)';
    const result = detectIosSemanticFailure(output);
    expect(result?.code).toBe("IOS_DNS_LOOKUP_TRIGGERED");
  });

  test("detecta falta de privilegios", () => {
    expect(detectIosSemanticFailure("% Bad secrets")).not.toBeNull();
  });

  test("detecta estar fuera del modo configuración", () => {
    expect(detectIosSemanticFailure("% Not in config mode")).not.toBeNull();
  });

  test("NUEVO: detecta error de permisos denegados", () => {
    expect(detectIosSemanticFailure("% Permission denied")).not.toBeNull();
  });

  test("NUEVO: detecta error al principio de una salida larga", () => {
    const longOutput = "% Invalid input detected at '^' marker.\n" + "A".repeat(2000);
    expect(detectIosSemanticFailure(longOutput)).not.toBeNull();
  });
});

describe("extractPrimaryIosErrorMessage", () => {
  test("extrae mensaje de error con marcador ^", () => {
    const output = "Router(config)# interface Gi0/0/0\n" +
                   "                      ^\n" +
                   "% Invalid input detected at '^' marker.";
    const message = extractPrimaryIosErrorMessage(output);
    expect(message).toContain("interface Gi0/0/0");
    expect(message).toContain("^");
    expect(message).toContain("Invalid input detected");
  });

  test("limpia syslogs del mensaje de error", () => {
    const output = "Router# show run\n" +
                   "%SYS-5-CONFIG_I: Configured from console by console\n" +
                   "% Invalid input detected at '^' marker.";
    const message = extractPrimaryIosErrorMessage(output);
    expect(message).not.toContain("%SYS-5-CONFIG_I");
    expect(message).toContain("Invalid input detected");
  });
});
