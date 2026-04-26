import { describe, expect, it } from "bun:test";
import { applyConfigIOS, verifyConfigIOS } from "./config-ios-use-cases";

describe("config-ios-use-cases", () => {
  it("exporta applyConfigIOS como función", () => {
    expect(typeof applyConfigIOS).toBe("function");
  });

  it("exporta verifyConfigIOS como función", () => {
    expect(typeof verifyConfigIOS).toBe("function");
  });


});
