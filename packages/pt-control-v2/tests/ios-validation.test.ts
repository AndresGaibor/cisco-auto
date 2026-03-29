import { describe, it, expect } from "bun:test";
import { classifyOutput, isSuccessResult, isErrorResult, isParseErrorResult } from "../src/domain/ios/session/command-result";

describe("IOS Validation and Output Classification", () => {
  describe("Command Result Classification", () => {
    it("should classify successful command result", () => {
      const result = { ok: true, raw: "Some output", status: 0 };
      expect(isSuccessResult(result)).toBe(true);
      expect(isErrorResult(result)).toBe(false);
    });

    it("should classify failed command result", () => {
      const result = { ok: false, error: "Invalid input", status: 1 };
      expect(isSuccessResult(result)).toBe(false);
      expect(isErrorResult(result)).toBe(true);
    });

    it("should classify parse error result", () => {
      const result = { ok: true, raw: "output", parseError: "Failed to parse" };
      expect(isParseErrorResult(result)).toBe(true);
    });
  });

  describe("Output Classification", () => {
    it("should classify invalid command", () => {
      const output = "% Invalid input detected at '^' marker.";
      const classification = classifyOutput(output);
      expect(classification.type).toBe("invalid");
    });

    it("should classify incomplete command", () => {
      const output = "% Incomplete command.";
      const classification = classifyOutput(output);
      expect(classification.type).toBe("incomplete");
    });

    it("should classify ambiguous command", () => {
      const output = "% Ambiguous command:";
      const classification = classifyOutput(output);
      expect(classification.type).toBe("ambiguous");
    });

    it("should classify success output", () => {
      const output = "Building configuration...\n[OK]";
      const classification = classifyOutput(output);
      expect(classification.type).toBe("success");
    });

    it("should classify paging output", () => {
      const output = "Some long output\n--More--";
      const classification = classifyOutput(output);
      expect(classification.type).toBe("paging");
    });
  });
});
