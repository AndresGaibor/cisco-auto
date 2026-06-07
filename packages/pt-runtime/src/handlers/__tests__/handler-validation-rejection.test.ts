// packages/pt-runtime/src/handlers/__tests__/handler-validation-rejection.test.ts
// Pruebas que verifican que los 4 handlers críticos (addLink, configHost,
// execIos, configIos) rechazan payloads inválidos con error estructurado
// { ok: false, code: "INVALID_PAYLOAD" } antes de tocar el runtime de PT.

import { describe, expect, test } from "bun:test";
import { handleAddLink } from "../add-link.js";
import { handleConfigHost } from "../host-handler.js";
import { handleExecIos } from "../ios/exec-ios-handler.js";
import { handleConfigIos } from "../ios/config-ios-handler.js";
import { makeHandlerDeps, makePtRuntimeApi } from "./mock-helpers.js";

describe("handleAddLink - rechazo de payload inválido", () => {
  test("Test 1: payload vacío {} → INVALID_PAYLOAD", () => {
    const deps = makeHandlerDeps();
    const result = handleAddLink({} as any, deps) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });

  test("Test 2: payload con device1 vacío → INVALID_PAYLOAD mencionando 'device1'", () => {
    const deps = makeHandlerDeps();
    const result = handleAddLink(
      {
        type: "addLink",
        device1: "",
        port1: "Gi0/0",
        device2: "S1",
        port2: "Fa0/1",
      } as any,
      deps,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
    expect(String(result.error)).toContain("device1");
  });

  test("Test 3: payload sin type → INVALID_PAYLOAD", () => {
    const deps = makeHandlerDeps();
    const result = handleAddLink(
      {
        device1: "R1",
        port1: "Gi0/0",
        device2: "S1",
        port2: "Fa0/1",
      } as any,
      deps,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });

  test("Test 4: payload válido NO devuelve INVALID_PAYLOAD", () => {
    const deps = makeHandlerDeps();
    const result = handleAddLink(
      {
        type: "addLink",
        device1: "R1",
        port1: "Gi0/0",
        device2: "S1",
        port2: "Fa0/1",
      } as any,
      deps,
    ) as any;

    // El handler puede fallar por DEVICE_NOT_FOUND, INVALID_PORT,
    // LINK_CREATED_BUT_NOT_EXACT u otro motivo de runtime, pero NUNCA
    // debe fallar por validación de payload cuando el payload es válido.
    if (result && result.code === "INVALID_PAYLOAD") {
      throw new Error(
        "Payload válido fue rechazado como INVALID_PAYLOAD: " +
          String(result.error),
      );
    }
    expect(result.code).not.toBe("INVALID_PAYLOAD");
  });
});

describe("handleConfigHost - rechazo de payload inválido", () => {
  test("Test 5: payload sin device → INVALID_PAYLOAD", () => {
    const api = makePtRuntimeApi();
    const result = handleConfigHost({ type: "configHost" } as any, api) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });

  test("Test 6: payload válido y device inexistente → DEVICE_NOT_FOUND (no INVALID_PAYLOAD)", () => {
    const api = makePtRuntimeApi({
      getDeviceByName: () => null,
      ipc: { network: () => null } as any,
    });
    const result = handleConfigHost(
      {
        type: "configHost",
        device: "PC_NO_EXISTE",
        ip: "192.168.1.10",
        mask: "255.255.255.0",
      } as any,
      api,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).not.toBe("INVALID_PAYLOAD");
    expect(result.code).toBe("DEVICE_NOT_FOUND");
  });
});

describe("handleExecIos - rechazo de payload inválido", () => {
  test("Test 7: payload sin command → INVALID_PAYLOAD", () => {
    const api = makePtRuntimeApi();
    const result = handleExecIos(
      { type: "execIos", device: "SW1" } as any,
      api,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });

  test("Test 8: payload con command vacío → INVALID_PAYLOAD", () => {
    const api = makePtRuntimeApi();
    const result = handleExecIos(
      { type: "execIos", device: "SW1", command: "" } as any,
      api,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });
});

describe("handleConfigIos - rechazo de payload inválido", () => {
  test("Test 9: payload sin commands → INVALID_PAYLOAD", () => {
    const api = makePtRuntimeApi();
    const result = handleConfigIos(
      { type: "configIos", device: "SW1" } as any,
      api,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });

  test("Test 10: payload con commands array vacío → INVALID_PAYLOAD", () => {
    const api = makePtRuntimeApi();
    const result = handleConfigIos(
      { type: "configIos", device: "SW1", commands: [] } as any,
      api,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
  });
});
