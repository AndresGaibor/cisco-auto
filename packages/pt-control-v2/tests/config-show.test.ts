import { describe, it, expect } from "bun:test";

describe("ConfigShow command utilities", () => {
  describe("sanitizeOutput", () => {
    const sanitizeOutput = (output: string): string => {
      if (!output) return "";

      return output
        .replace(/--+\s*More\s*-+[\s\S]*/gi, "")
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    };

    it("should remove --More-- pagination sequences", () => {
      const output = "line1\n--More--\nline2";
      const result = sanitizeOutput(output);
      expect(result).not.toContain("--More--");
    });

    it("should remove ANSI escape sequences", () => {
      const output = "\x1b[32mgreen text\x1b[0m";
      const result = sanitizeOutput(output);
      expect(result).not.toContain("\x1b");
    });

    it("should normalize line endings", () => {
      const output = "line1\r\nline2\rline3";
      const result = sanitizeOutput(output);
      expect(result).not.toContain("\r");
    });

    it("should handle empty input", () => {
      expect(sanitizeOutput("")).toBe("");
    });

    it("should preserve normal text", () => {
      const output = "hostname Router1\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0";
      const result = sanitizeOutput(output);
      expect(result).toContain("hostname Router1");
    });

    it("should remove excess blank lines", () => {
      const output = "line1\n\n\n\n\nline2";
      const result = sanitizeOutput(output);
      expect(result).not.toContain("\n\n\n");
    });
  });
});
