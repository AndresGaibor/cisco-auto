// packages/pt-runtime/tests/integration/build.test.ts
import { describe, test, expect } from "bun:test";
import { validatePtSafe } from "../../src/build/validate-pt-safe";

describe("Build Integration", () => {
  describe("validatePtSafe", () => {
    test("accepts PT-safe code", () => {
      const code = `
var CONFIG = {
  devDir: "/Users/example/pt-dev"
};

function main() {
  dprint("[PT] Starting...");
}

function cleanUp() {
  dprint("[PT] Cleanup...");
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects import statements", () => {
      const code = `
import { something } from "./module";
function main() {}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("import"))).toBe(true);
    });

    test("rejects export statements", () => {
      const code = `
export function main() {}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("export"))).toBe(true);
    });

    test("rejects console.log", () => {
      const code = `
function main() {
  console.log("Hello");
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("console"))).toBe(true);
    });

    test("rejects async function", () => {
      const code = `
async function main() {
  await something();
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("async"))).toBe(true);
    });

    test("rejects require", () => {
      const code = `
const fs = require("fs");
function main() {}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("require"))).toBe(true);
    });

    test("rejects process global", () => {
      const code = `
function main() {
  process.exit();
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("process"))).toBe(true);
    });
  });
});