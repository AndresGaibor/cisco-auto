import { describe, expect, test } from "bun:test";
import {
  detectAutoConfigFinalModeFailure,
  detectIosSemanticFailureFromRuntimeResult,
  getRuntimeFailureText,
} from "./ios-runtime-result-classifier.js";

describe("ios-runtime-result-classifier", () => {
  test("getRuntimeFailureText prioriza parsed.result.output", () => {
    expect(
      getRuntimeFailureText({
        parsed: {
          result: {
            output: "parsed output",
          },
        },
        rawOutput: "raw output",
        output: "fallback output",
      }),
    ).toBe("parsed output");
  });

  test("getRuntimeFailureText cae a rawOutput output y error.message", () => {
    expect(
      getRuntimeFailureText({
        rawOutput: "raw output",
        output: "fallback output",
        error: {
          message: "error message",
        },
      }),
    ).toBe("raw output");
  });

  test("detectAutoConfigFinalModeFailure retorna null si autoConfig no es true", () => {
    expect(
      detectAutoConfigFinalModeFailure(
        { metadata: { autoConfig: false } },
        {
          modeAfter: "global-config",
          promptAfter: "SW1(config)#",
          rawOutput: "SW1(config)#end",
        },
      ),
    ).toBeNull();
  });

  test("detectAutoConfigFinalModeFailure retorna null si el prompt final es hostname#", () => {
    expect(
      detectAutoConfigFinalModeFailure(
        { metadata: { autoConfig: true } },
        {
          modeAfter: "privileged-exec",
          promptAfter: "SW1#",
          rawOutput: "SW1#end",
        },
      ),
    ).toBeNull();
  });

  test("detectAutoConfigFinalModeFailure falla si modeAfter es global-config", () => {
    const result = detectAutoConfigFinalModeFailure(
      { metadata: { autoConfig: true } },
      {
        modeAfter: "global-config",
        promptAfter: "SW1(config)#",
        rawOutput: "SW1(config)#end",
      },
    );

    expect(result?.code).toBe("IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE");
  });

  test("detectAutoConfigFinalModeFailure falla si promptAfter termina en (config)#", () => {
    const result = detectAutoConfigFinalModeFailure(
      { metadata: { autoConfig: true } },
      {
        modeAfter: "privileged-exec",
        promptAfter: "SW1(config)#",
        rawOutput: "SW1(config)#end",
      },
    );

    expect(result?.code).toBe("IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE");
  });

  test("detectIosSemanticFailureFromRuntimeResult detecta Invalid input", () => {
    const result = detectIosSemanticFailureFromRuntimeResult({
      rawOutput: "          ^\n% Invalid input detected at '^' marker.",
    });

    expect(result?.code).toBe("IOS_INVALID_INPUT");
  });
});
