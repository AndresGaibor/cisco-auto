import { describe, test, expect } from "bun:test";
import { handleConfigHost, handleExecIos, handleConfigIos } from "../../handlers/config";
import type { HandlerDeps } from "../../utils/helpers";

describe("handleConfigHost", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigHost({ type: "configHost", device: "NOEXISTE" }, deps as HandlerDeps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna ok cuando device existe sin ip", () => {
    const deps = {
      getNet: () => ({ getDevice: () => ({ getPortAt: () => null }) }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigHost({ type: "configHost", device: "PC1" }, deps as HandlerDeps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("No ports");
  });
});

describe("handleExecIos", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleExecIos(
      { type: "execIos", device: "NOEXISTE", command: "show version" },
      deps as HandlerDeps
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna resultado cuando device existe", () => {
    const deps = {
      getNet: () => ({
        getDevice: () => ({
          getCommandLine: () => ({
            enterCommand: () => [0, "some output"],
          }),
        }),
      }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleExecIos(
      { type: "execIos", device: "R1", command: "show version", parse: false },
      deps as HandlerDeps
    );

    expect(result.ok).toBe(true);
  });
});

describe("handleConfigIos", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigIos(
      { type: "configIos", device: "NOEXISTE", commands: ["interface Gi0/0"] },
      deps as HandlerDeps
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna error cuando device no soporta CLI", () => {
    const deps = {
      getNet: () => ({
        getDevice: () => ({
          getCommandLine: () => null,
          skipBoot: () => {},
        }),
      }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigIos(
      { type: "configIos", device: "PC1", commands: ["ip address 192.168.1.1 255.255.255.0"] },
      deps as HandlerDeps
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("CLI");
  });
});
