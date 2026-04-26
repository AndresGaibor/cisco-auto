import { describe, expect, it } from "bun:test";
import {
  executeStaticRoute,
  executeOspfEnable,
  executeOspfAddNetwork,
  executeEigrpEnable,
  executeBgpEnable,
  validarIPv4,
  validarCIDR,
  cidrToSubnetMask,
  buildStaticRouteCommands,
  buildOspfEnableCommands,
  buildOspfAddNetworkCommands,
  buildEigrpEnableCommands,
  buildBgpEnableCommands,
} from "./routing-use-cases";

describe("routing-use-cases", () => {
  it("exporta executeStaticRoute como función", () => {
    expect(typeof executeStaticRoute).toBe("function");
  });

  it("exporta executeOspfEnable como función", () => {
    expect(typeof executeOspfEnable).toBe("function");
  });

  it("exporta executeOspfAddNetwork como función", () => {
    expect(typeof executeOspfAddNetwork).toBe("function");
  });

  it("exporta executeEigrpEnable como función", () => {
    expect(typeof executeEigrpEnable).toBe("function");
  });

  it("exporta executeBgpEnable como función", () => {
    expect(typeof executeBgpEnable).toBe("function");
  });

  it("re-exporta funciones de ios-builders", () => {
    expect(typeof validarIPv4).toBe("function");
    expect(typeof validarCIDR).toBe("function");
    expect(typeof cidrToSubnetMask).toBe("function");
    expect(typeof buildStaticRouteCommands).toBe("function");
    expect(typeof buildOspfEnableCommands).toBe("function");
    expect(typeof buildOspfAddNetworkCommands).toBe("function");
    expect(typeof buildEigrpEnableCommands).toBe("function");
    expect(typeof buildBgpEnableCommands).toBe("function");
  });

  it("executeStaticRoute retorna estructura con ok true para entrada válida", () => {
    const result = executeStaticRoute({
      deviceName: "R1",
      network: "192.168.1.0/24",
      nextHop: "192.168.0.1",
    });
    expect(result).toHaveProperty("ok");
    expect(typeof result.ok).toBe("boolean");
  });

  it("executeOspfEnable retorna estructura con ok true", () => {
    const result = executeOspfEnable({ deviceName: "R1", processId: 1 });
    expect(result).toHaveProperty("ok");
    expect(result.ok).toBe(true);
  });

  it("executeEigrpEnable retorna estructura con ok true", () => {
    const result = executeEigrpEnable({ deviceName: "R1", asn: 100 });
    expect(result.ok).toBe(true);
  });

  it("executeBgpEnable retorna estructura con ok true", () => {
    const result = executeBgpEnable({ deviceName: "R1", asn: 65000 });
    expect(result.ok).toBe(true);
  });
});
