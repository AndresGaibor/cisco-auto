import { describe, expect, it } from "bun:test";
import {
  setupWlcNetwork,
  getWlcNetworkStatus,
  configureWlcIp,
  configureWlcGateway,
  enablePoE,
  addApPowerAdapter,
  configureSwitchSvi,
} from "./wlc-use-cases";

describe("wlc-use-cases", () => {
  it("exporta setupWlcNetwork como función", () => {
    expect(typeof setupWlcNetwork).toBe("function");
  });

  it("exporta getWlcNetworkStatus como función", () => {
    expect(typeof getWlcNetworkStatus).toBe("function");
  });

  it("exporta configureWlcIp como función", () => {
    expect(typeof configureWlcIp).toBe("function");
  });

  it("exporta configureWlcGateway como función", () => {
    expect(typeof configureWlcGateway).toBe("function");
  });

  it("exporta enablePoE como función", () => {
    expect(typeof enablePoE).toBe("function");
  });

  it("exporta addApPowerAdapter como función", () => {
    expect(typeof addApPowerAdapter).toBe("function");
  });

  it("exporta configureSwitchSvi como función", () => {
    expect(typeof configureSwitchSvi).toBe("function");
  });
});
