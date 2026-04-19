// packages/pt-runtime/src/build/__tests__/runtime-manifest.test.ts
import { describe, it, expect } from "bun:test";
import {
  createRuntimeManifest,
  fingerprintFromCode,
  validateManifest,
  type AssetMetadata,
  type RuntimeManifest,
} from "../runtime-manifest";

function createMockAssetMeta(overrides: Partial<AssetMetadata> = {}): AssetMetadata {
  return {
    filename: "test.js",
    checksum: "abc123",
    size: 1024,
    mtime: Date.now(),
    ...overrides,
  };
}

function createValidManifest(): RuntimeManifest {
  return {
    version: "1.0.0",
    generatedAt: Date.now(),
    buildFingerprint: "fingerprint-123",
    assetMain: createMockAssetMeta({ filename: "main.js" }),
    assetRuntime: createMockAssetMeta({ filename: "runtime.js" }),
    assetCatalog: createMockAssetMeta({ filename: "catalog.js" }),
    primitives: ["ipc", "fm", "dprint"],
    omniAdapters: ["omni-physical", "omni-logical"],
    commandIds: ["addDevice", "removeDevice", "listDevices"],
    deviceIds: ["router", "switch", "pc"],
  };
}

describe("runtime-manifest", () => {
  describe("builder pattern", () => {
    it("builder pattern funciona", () => {
      const manifest = createRuntimeManifest()
        .withVersion("1.0.0")
        .withFingerprint("fp-123")
        .withAsset("main", createMockAssetMeta())
        .withAsset("runtime", createMockAssetMeta())
        .withAsset("catalog", createMockAssetMeta())
        .withPrimitive("ipc")
        .withOmniAdapter("omni")
        .withCommandId("cmd1")
        .withDeviceId("dev1")
        .build();

      expect(manifest.version).toBe("1.0.0");
      expect(manifest.buildFingerprint).toBe("fp-123");
      expect(manifest.assetMain.filename).toBe("test.js");
      expect(manifest.primitives).toContain("ipc");
      expect(manifest.omniAdapters).toContain("omni");
      expect(manifest.commandIds).toContain("cmd1");
      expect(manifest.deviceIds).toContain("dev1");
    });

    it("builder encadena metodos correctamente", () => {
      const builder = createRuntimeManifest();
      const result1 = builder.withVersion("1.0.0");
      const result2 = result1.withFingerprint("fp");

      expect(result1).toBe(builder);
      expect(result2).toBe(builder);
    });

    it("builder lanza error si faltan assets al build", () => {
      const builder = createRuntimeManifest()
        .withVersion("1.0.0")
        .withFingerprint("fp");

      expect(() => builder.build()).toThrow("RuntimeManifest requires all asset metadata");
    });
  });

  describe("toJSON", () => {
    it("toJSON() produce JSON valido", () => {
      const builder = createRuntimeManifest()
        .withVersion("1.0.0")
        .withFingerprint("fp-123")
        .withAsset("main", createMockAssetMeta())
        .withAsset("runtime", createMockAssetMeta())
        .withAsset("catalog", createMockAssetMeta());

      const json = builder.toJSON();

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe("1.0.0");
      expect(parsed.buildFingerprint).toBe("fp-123");
    });

    it("toJSON incluye todos los campos requeridos", () => {
      const builder = createRuntimeManifest()
        .withVersion("1.0.0")
        .withFingerprint("fp")
        .withAsset("main", createMockAssetMeta())
        .withAsset("runtime", createMockAssetMeta())
        .withAsset("catalog", createMockAssetMeta());

      const json = builder.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty("version");
      expect(parsed).toHaveProperty("generatedAt");
      expect(parsed).toHaveProperty("buildFingerprint");
      expect(parsed).toHaveProperty("assetMain");
      expect(parsed).toHaveProperty("assetRuntime");
      expect(parsed).toHaveProperty("assetCatalog");
      expect(parsed).toHaveProperty("primitives");
      expect(parsed).toHaveProperty("omniAdapters");
      expect(parsed).toHaveProperty("commandIds");
      expect(parsed).toHaveProperty("deviceIds");
    });
  });

  describe("fingerprintFromCode", () => {
    it("fingerprintFromCode es determinista", () => {
      const mainCode = "function main() { return 1; }";
      const runtimeCode = "function runtime() { return 2; }";
      const catalogCode = "const CATALOG = {};";

      const fp1 = fingerprintFromCode(mainCode, runtimeCode, catalogCode);
      const fp2 = fingerprintFromCode(mainCode, runtimeCode, catalogCode);

      expect(fp1).toBe(fp2);
    });

    it("fingerprints diferentes para codigo diferente", () => {
      const mainCode1 = "function main() { return 1; }";
      const mainCode2 = "function main() { return 2; }";
      const runtimeCode = "function runtime() { return 2; }";
      const catalogCode = "const CATALOG = {};";

      const fp1 = fingerprintFromCode(mainCode1, runtimeCode, catalogCode);
      const fp2 = fingerprintFromCode(mainCode2, runtimeCode, catalogCode);

      expect(fp1).not.toBe(fp2);
    });

    it("fingerprints diferentes para orden diferente de catalog", () => {
      const mainCode = "function main() {}";
      const runtimeCode = "function runtime() {}";
      const catalogCode1 = "const A = 1;";
      const catalogCode2 = "const B = 2;";

      const fp1 = fingerprintFromCode(mainCode, runtimeCode, catalogCode1);
      const fp2 = fingerprintFromCode(mainCode, runtimeCode, catalogCode2);

      expect(fp1).not.toBe(fp2);
    });

    it("fingerprint es string no vacio", () => {
      const fp = fingerprintFromCode("main", "runtime", "catalog");

      expect(typeof fp).toBe("string");
      expect(fp.length).toBeGreaterThan(0);
    });

    it("fingerprint no cambia con timestamps en comentarios", () => {
      const mainCode1 = "// Generated at: 2024-01-01T00:00:00.000Z\nfunction main() {}";
      const mainCode2 = "// Generated at: 2024-12-31T23:59:59.999Z\nfunction main() {}";

      const fp1 = fingerprintFromCode(mainCode1, "runtime", "catalog");
      const fp2 = fingerprintFromCode(mainCode2, "runtime", "catalog");

      expect(fp1).toBe(fp2);
    });
  });

  describe("validateManifest", () => {
    it("validateManifest detecta manifest valido", () => {
      const manifest = createValidManifest();
      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("valida campos requeridos en version", () => {
      const manifest = createValidManifest();
      (manifest as any).version = null;

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("valida generatedAt es numerico", () => {
      const manifest = createValidManifest();
      (manifest as any).generatedAt = "not-a-number";

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("generatedAt"))).toBe(true);
    });

    it("valida assetMain requerido", () => {
      const manifest = createValidManifest();
      (manifest as any).assetMain = null;

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("assetMain"))).toBe(true);
    });

    it("valida assetMain.filename requerido", () => {
      const manifest = createValidManifest();
      manifest.assetMain.filename = "";

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("assetMain.filename"))).toBe(true);
    });

    it("valida arrays son arrays", () => {
      const manifest = createValidManifest();
      (manifest as any).primitives = "not-an-array";

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("primitives"))).toBe(true);
    });

    it("genera warnings para arrays vacios", () => {
      const manifest = createValidManifest();
      manifest.primitives = [];
      manifest.omniAdapters = [];

      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("primitives"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("omniAdapters"))).toBe(true);
    });
  });
});
