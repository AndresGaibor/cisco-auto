import { describe, test, expect } from "bun:test";
import { sanitizeOutput } from "../../../src/domain/ios/utils/sanitize-output";

describe("sanitizeOutput", () => {
  test("passes through clean output unchanged", () => {
    const output = "Router# show ip interface brief\nInterface IP-Address OK? Method Status";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toBe(output);
    expect(result.hadAnsi).toBe(false);
    expect(result.hadMore).toBe(false);
    expect(result.hadControlChars).toBe(false);
  });

  test("strips ANSI escape sequences", () => {
    const output = "\x1B[1mRouter\x1B[0m# show version";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toBe("Router# show version");
    expect(result.hadAnsi).toBe(true);
  });

  test("strips --More-- pagination markers", () => {
    const output = "Interface Status\n--More--\nRouter#";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toBe("Interface Status\n\nRouter#");
    expect(result.hadMore).toBe(true);
  });

  test("strips -- More -- variant", () => {
    const output = "show running-config\n-- More --\nRouter#";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toBe("show running-config\n\nRouter#");
    expect(result.hadMore).toBe(true);
  });

  test("normalizes CRLF line endings", () => {
    const output = "Router# show version\r\nCisco IOS\r\n\r\nRouter#";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toContain("Router# show version\nCisco IOS\n\nRouter#");
    expect(result.cleaned).not.toContain("\r");
  });

  test("strips VT100 backspace sequences", () => {
    // \x08 is backspace - IOS may send this when correcting input
    const output = "Router\x08# show";
    const result = sanitizeOutput(output);
    expect(result.hadControlChars).toBe(true);
    expect(result.cleaned).not.toContain("\x08");
  });

  test("collapses excess blank lines", () => {
    const output = "line1\n\n\n\nline2";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toBe("line1\n\nline2");
  });

  test("detects truncation when output ends without prompt", () => {
    const output = "Interface Status\n% Invalid input detected at '^'";
    const result = sanitizeOutput(output);
    expect(result.hadTruncation).toBe(true);
  });

  test("no truncation when output ends with prompt", () => {
    const output = "Router# show version\nCisco IOS\nRouter#";
    const result = sanitizeOutput(output);
    expect(result.hadTruncation).toBe(false);
  });

  test("no truncation for short output", () => {
    const output = "Router#";
    const result = sanitizeOutput(output);
    expect(result.hadTruncation).toBe(false);
  });

  test("handles empty string", () => {
    const result = sanitizeOutput("");
    expect(result.cleaned).toBe("");
    expect(result.hadAnsi).toBe(false);
    expect(result.hadMore).toBe(false);
    expect(result.hadControlChars).toBe(false);
    expect(result.hadTruncation).toBe(false);
  });

  test("strips combined ANSI and paging", () => {
    const output = "\x1B[1m--More--\x1B[0m\nRouter#";
    const result = sanitizeOutput(output);
    // Should strip ANSI and --More-- separately
    expect(result.hadMore).toBe(true);
    expect(result.hadAnsi).toBe(true);
    expect(result.cleaned).not.toContain("\x1B[1m");
    expect(result.cleaned).not.toContain("\x1B[0m");
  });

  test("preserves error messages correctly", () => {
    const output = "Router(config)# ip address\n% Invalid input detected at '^' marker.\nRouter(config)#";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toContain("% Invalid input detected at '^' marker.");
    expect(result.hadTruncation).toBe(false);
  });

  test("preserves tabular output structure", () => {
    const output = "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     192.168.1.1    YES   manual up                    up";
    const result = sanitizeOutput(output);
    expect(result.cleaned).toContain("GigabitEthernet0/0");
    expect(result.cleaned).toContain("192.168.1.1");
  });
});
