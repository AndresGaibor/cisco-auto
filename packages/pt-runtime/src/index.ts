import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, hostname, platform } from "node:os";
import { resolve } from "node:path";
import { MAIN_JS_TEMPLATE } from "./templates/main.js";
import { RUNTIME_JS_TEMPLATE } from "./templates/runtime.js";
import { validateMainJs, validateRuntimeJs, validateGeneratedArtifacts, formatValidationErrors } from "./runtime-validator.js";

const DEV_DIR_PLACEHOLDER = "{{DEV_DIR_LITERAL}}";

// ============================================================================ 
// Normalize generated code
// ============================================================================

function normalizeCode(code: string): string {
  let normalized = code;
  
  // Only normalize line endings - do NOT collapse newlines
  // because \n may be part of regex patterns in the source
  normalized = normalized.replace(/\r\n/g, "\n");
  normalized = normalized.replace(/\r/g, "\n");
  
  // Remove trailing whitespace on lines
  normalized = normalized.replace(/[\t ]+$/gm, "");
  
  // Only add final newline if missing
  if (!normalized.endsWith("\n")) {
    normalized += "\n";
  }
  
  return normalized;
}

// ============================================================================ 
// Platform-aware dev directory
// ============================================================================

function getDefaultDevDir(): string {
  const home = homedir();
  
  // Check for custom environment variable
  if (process.env.PT_DEV_DIR) {
    return process.env.PT_DEV_DIR;
  }
  
  // Platform-aware default
  if (platform() === 'win32') {
    return resolve(process.env.USERPROFILE || home, 'pt-dev');
  }
  
  // macOS/Linux
  return resolve(home, 'pt-dev');
}

// ============================================================================ 
// Configuration
// ============================================================================

export interface RuntimeGeneratorConfig {
  /** Output directory for generated files */
  outputDir: string;
  /** PT dev directory (where PT reads files from) */
  devDir: string;
}

export interface RuntimeArtifactManifest {
  cliVersion: string;
  runtimeArtifactVersion: string;
  protocolVersion: number;
  generatedAt: string;
  target: string;
  generator: string;
  mainChecksum: string;
  runtimeChecksum: string;
}

const DEFAULT_CONFIG: RuntimeGeneratorConfig = {
  outputDir: resolve(import.meta.dirname, "../../generated"),
  devDir: getDefaultDevDir(),
};

const RUNTIME_ARTIFACT_VERSION = "0.1.0";
const PROTOCOL_VERSION = 2;

// ============================================================================ 
// Template helpers
// ============================================================================

export function renderMainSource(devDir: string): string {
  const mainCode = normalizeCode(MAIN_JS_TEMPLATE.replace(DEV_DIR_PLACEHOLDER, JSON.stringify(devDir)));
  const result = validateMainJs(mainCode);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
  return mainCode;
}

export function renderRuntimeSource(): string {
  const runtimeCode = normalizeCode(RUNTIME_JS_TEMPLATE);
  const result = validateRuntimeJs(runtimeCode);
  if (!result.ok) {
    throw new Error(formatValidationErrors(result));
  }
  return runtimeCode;
}

function checksumSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// ============================================================================ 
// Generator
// ============================================================================

export class RuntimeGenerator {
  protected config: RuntimeGeneratorConfig;

  constructor(config: Partial<RuntimeGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateMain(): string {
    return renderMainSource(this.config.devDir);
  }

  generateRuntime(): string {
    return renderRuntimeSource();
  }

  validate(main: string, runtime: string): void {
    const validation = validateGeneratedArtifacts(main, runtime);
    if (!validation.ok) {
      throw new Error(formatValidationErrors(validation));
    }
  }

  private writeArtifacts(outputDir: string, main: string, runtime: string): void {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(resolve(outputDir, "main.js"), main, "utf-8");
    writeFileSync(resolve(outputDir, "runtime.js"), runtime, "utf-8");
  }

  async generate(): Promise<{ main: string; runtime: string }> {
    const outputDir = this.config.outputDir;
    const main = this.generateMain();
    const runtime = this.generateRuntime();

    this.writeArtifacts(outputDir, main, runtime);

    console.log(`[Generator] Generated to ${outputDir}`);

    return { main, runtime };
  }

  async validateGenerated(): Promise<{ main: string; runtime: string }> {
    const main = this.generateMain();
    const runtime = this.generateRuntime();
    this.validate(main, runtime);
    return { main, runtime };
  }

  async writeManifest(main: string, runtime: string, outputDir: string): Promise<RuntimeArtifactManifest> {
    const manifest: RuntimeArtifactManifest = {
      cliVersion: "0.2.0",
      runtimeArtifactVersion: RUNTIME_ARTIFACT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      generatedAt: new Date().toISOString(),
      target: "packet-tracer",
      generator: "cisco-auto",
      mainChecksum: checksumSource(main),
      runtimeChecksum: checksumSource(runtime),
    };

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
    return manifest;
  }

  async deploy(): Promise<void> {
    const devDir = this.config.devDir;

    if (!existsSync(devDir)) {
      mkdirSync(devDir, { recursive: true });
    }

    const { main, runtime } = await this.validateGenerated();
    this.writeArtifacts(devDir, main, runtime);
    await this.writeManifest(main, runtime, devDir);

    // Ensure bridge lease exists
    this.ensureBridgeLease(devDir);

    console.log(`[Generator] Deployed to ${devDir}`);
  }

  /**
   * Ensure a valid bridge lease exists
   * Generates one if missing or expired
   */
  private ensureBridgeLease(devDir: string): void {
    const leaseFile = resolve(devDir, "bridge-lease.json");
    const now = Date.now();

    // Check if existing lease is valid
    if (existsSync(leaseFile)) {
      try {
        const content = readFileSync(leaseFile, "utf-8");
        const lease = JSON.parse(content);
        
        // Validate lease
        if (lease.ownerId && lease.expiresAt && lease.updatedAt) {
          const isExpired = now > lease.expiresAt;
          const isStale = (now - lease.updatedAt) > ((lease.ttlMs || 5000) * 2);
          
          if (!isExpired && !isStale) {
            return; // Lease is valid
          }
        }
      } catch {
        // Invalid lease, will generate new one
      }
    }

    // Generate new lease - long-lived bootstrap lease
    // Phase 3 fix: TTL and expiresAt must be consistent for PT validation
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const lease = {
      ownerId: `build-${now}`,
      pid: process.pid,
      hostname: hostname(),
      startedAt: now,
      updatedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
      ttlMs: THIRTY_DAYS_MS,
      processTitle: "build",
      version: "2.0.0"
    };

    writeFileSync(leaseFile, JSON.stringify(lease, null, 2));
  }

  async build(): Promise<void> {
    const { main, runtime } = await this.validateGenerated();
    this.writeArtifacts(this.config.outputDir, main, runtime);
    await this.writeManifest(main, runtime, this.config.outputDir);
    console.log("[Generator] Build complete");
  }
}

// ============================================================================ 
// CLI Entry Point
// ============================================================================

export async function runGenerator(args: string[]): Promise<void> {
  const generator = new RuntimeGenerator();
  const command = args[0];

  try {
    switch (command) {
      case "generate":
        await generator.generate();
        break;
      case "validate":
        await generator.validateGenerated();
        console.log("[Generator] Validation OK");
        break;
      case "deploy":
        await generator.deploy();
        break;
      case "build":
      case "all":
      default:
        await generator.build();
        break;
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGenerator(process.argv.slice(2));
}

// ============================================================================ 
// Re-exports
// ============================================================================

export { MAIN_JS_TEMPLATE, RUNTIME_JS_TEMPLATE };
export * from "./utils/index.js";
export { listRuntimeSnapshots, restoreRuntimeSnapshot, snapshotRuntimeArtifacts } from "./runtime-artifacts.js";
