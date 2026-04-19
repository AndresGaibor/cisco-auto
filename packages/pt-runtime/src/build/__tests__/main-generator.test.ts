// packages/pt-runtime/src/build/__tests__/main-generator.test.ts
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { generateMainAsset, type MainGeneratorConfig } from "../main-generator";

const MOCK_MANIFEST_FILES = [
  "pt/kernel/main.ts",
  "pt/kernel/kernel-state.ts",
  "pt/kernel/directories.ts",
  "pt/kernel/command-queue.ts",
  "pt/kernel/lease.ts",
  "pt/kernel/heartbeat.ts",
  "pt/kernel/runtime-loader.ts",
  "pt/kernel/execution-engine.ts",
  "pt/terminal/terminal-engine.ts",
  "pt/terminal/terminal-session.ts",
  "pt/terminal/prompt-parser.ts",
];

const MOCK_KERNEL_CODE = `
export function createKernel(config) {
  return {
    boot: function() {},
    shutdown: function() {},
    isRunning: function() { return true; },
    startDeferredJob: function(plan) { return plan.id || "job-1"; },
    getDeferredJob: function(id) { return null; },
  };
}
`;

const MOCK_TERMINAL_CODE = `
export function createTerminalEngine(config) {
  return {
    attach: function(device, term) {},
    detach: function(device) {},
    getSession: function(device) { return null; },
    getMode: function(device) { return "user-exec"; },
    isBusy: function(device) { return false; },
    executeCommand: function(device, cmd, opts) {
      return Promise.resolve({ ok: true, output: "", status: 0 });
    },
  };
}
`;

describe("main-generator", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join("/tmp", "pt-test-"));
    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    for (const relPath of MOCK_MANIFEST_FILES) {
      const filePath = path.join(srcDir, relPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (relPath.endsWith("main.ts")) {
        fs.writeFileSync(filePath, MOCK_KERNEL_CODE);
      } else if (relPath.includes("terminal")) {
        fs.writeFileSync(filePath, MOCK_TERMINAL_CODE);
      } else {
        fs.writeFileSync(filePath, `// mock ${relPath}\nexport const foo = 1;`);
      }
    }
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createConfig(overrides: Partial<MainGeneratorConfig> = {}): MainGeneratorConfig {
    return {
      outputPath: path.join(tempDir, "out", "main.js"),
      injectDevDir: path.join(tempDir, "pt-dev"),
      version: "1.0.0",
      buildFingerprint: "test-fingerprint-123",
      ...overrides,
    };
  }

  it("genera codigo con function main()", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    expect(result.hasMainFunction).toBe(true);
    expect(/function\s+main\s*\(/.test(result.code)).toBe(true);
  });

  it("genera codigo con function cleanUp()", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    expect(result.hasCleanUpFunction).toBe(true);
    expect(/function\s+cleanUp\s*\(/.test(result.code)).toBe(true);
  });

  it("genera codigo sin logica de negocio", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    expect(result.structuralErrors).toHaveLength(0);
    expect(result.code).toContain("createKernel");
    expect(result.code).toContain("DEV_DIR");
  });

  it("el codigo pasa validacion PT-safe", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    const ptSafeErrors = result.structuralErrors.filter(
      (e) => e.includes("PT-safe validation error"),
    );
    expect(ptSafeErrors).toHaveLength(0);
  });

  it("genera checksum no vacio", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    expect(result.checksum).toBeTruthy();
    expect(result.checksum.length).toBeGreaterThan(0);
  });

  it("retorna estructura GeneratedMainAsset completa", () => {
    const config = createConfig();
    const result = generateMainAsset(config);

    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("checksum");
    expect(result).toHaveProperty("hasMainFunction");
    expect(result).toHaveProperty("hasCleanUpFunction");
    expect(result).toHaveProperty("structuralErrors");
    expect(Array.isArray(result.structuralErrors)).toBe(true);
  });
});
