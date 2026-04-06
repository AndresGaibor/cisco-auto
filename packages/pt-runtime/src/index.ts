import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
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

const DEFAULT_CONFIG: RuntimeGeneratorConfig = {
  outputDir: resolve(import.meta.dirname, "../../generated"),
  devDir: getDefaultDevDir(),
};

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

  async generate(): Promise<{ main: string; runtime: string }> {
    const outputDir = this.config.outputDir;

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const main = this.generateMain();
    const runtime = this.generateRuntime();

    const validation = validateGeneratedArtifacts(main, runtime);
    if (!validation.ok) {
      throw new Error(formatValidationErrors(validation));
    }

    writeFileSync(resolve(outputDir, "main.js"), main, "utf-8");
    writeFileSync(resolve(outputDir, "runtime.js"), runtime, "utf-8");

    console.log(`[Generator] Generated to ${outputDir}`);

    return { main, runtime };
  }

  async deploy(): Promise<void> {
    const devDir = this.config.devDir;

    if (!existsSync(devDir)) {
      mkdirSync(devDir, { recursive: true });
    }

    const { main, runtime } = await this.generate();
    writeFileSync(resolve(devDir, "main.js"), main, "utf-8");
    writeFileSync(resolve(devDir, "runtime.js"), runtime, "utf-8");

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
      hostname: require("node:os").hostname(),
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
    await this.deploy();
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
      case "build":
        await generator.generate();
        break;
      case "deploy":
        await generator.deploy();
        break;
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
