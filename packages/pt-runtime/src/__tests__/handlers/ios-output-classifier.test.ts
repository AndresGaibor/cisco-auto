import { expect, test, describe } from "bun:test";
import {
  classifyCommandOutput,
  isFailureClassification,
  isSuccessClassification,
  requiresUserInput,
} from "../../handlers/ios-output-classifier";

describe("ios-output-classifier", () => {
  test("classifyCommandOutput detects invalid command", () => {
    expect(classifyCommandOutput("% Invalid command")).toBe("invalid-command");
    expect(classifyCommandOutput("% Invalid input at '^' marker")).toBe("invalid-command");
  });

  test("classifyCommandOutput detects incomplete command", () => {
    expect(classifyCommandOutput("% Incomplete command")).toBe("incomplete-command");
  });

  test("classifyCommandOutput detects ambiguous command", () => {
    expect(classifyCommandOutput("% Ambiguous command")).toBe("ambiguous-command");
  });

  test("classifyCommandOutput detects paging", () => {
    expect(classifyCommandOutput("output\n--More--")).toBe("paging");
    expect(classifyCommandOutput("--More--")).toBe("paging");
  });

  test("classifyCommandOutput detects confirm prompt", () => {
    expect(classifyCommandOutput("[confirm]")).toBe("confirmation-prompt");
    expect(classifyCommandOutput("\n[confirm]\n")).toBe("confirmation-prompt");
  });

  test("classifyCommandOutput detects password prompt", () => {
    expect(classifyCommandOutput("Password:")).toBe("password-prompt");
  });

  test("classifyCommandOutput returns success for normal output", () => {
    expect(classifyCommandOutput("Interface IP-Address OK? Method Status Protocol")).toBe("success");
    expect(classifyCommandOutput("GigabitEthernet0/0 unassigned YES manual up up")).toBe("success");
  });

  test("isFailureClassification returns true for failure categories", () => {
    expect(isFailureClassification("invalid-command")).toBe(true);
    expect(isFailureClassification("incomplete-command")).toBe(true);
    expect(isFailureClassification("ambiguous-command")).toBe(true);
    expect(isFailureClassification("ios-error")).toBe(true);
    expect(isFailureClassification("success")).toBe(false);
    expect(isFailureClassification("paging")).toBe(false);
  });

  test("isSuccessClassification returns true for success output", () => {
    expect(isSuccessClassification("success")).toBe(true);
    expect(isSuccessClassification("ios-error")).toBe(false);
    expect(isSuccessClassification("paging")).toBe(false);
    expect(isSuccessClassification("confirmation-prompt")).toBe(false);
    expect(isSuccessClassification("password-prompt")).toBe(false);
  });

  test("requiresUserInput returns true for interactive states", () => {
    expect(requiresUserInput("paging")).toBe(true);
    expect(requiresUserInput("confirmation-prompt")).toBe(true);
    expect(requiresUserInput("password-prompt")).toBe(true);
    expect(requiresUserInput("success")).toBe(false);
  });
});
