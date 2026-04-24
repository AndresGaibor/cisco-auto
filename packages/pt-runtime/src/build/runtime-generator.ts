import * as fs from "fs";
import * as path from "path";
import { renderRuntimeV2Sync } from "./render-runtime-v2";
import { renderMainV2 } from "./render-main-v2";
import { renderCatalog } from "./render-catalog";
import { readExistingManifest, writeRuntimeManifest, type RuntimeBuildReport } from "./manifest";
import { validateGeneratedArtifacts } from "./validation";

export interface RuntimeGeneratorConfig {
  outputDir?: string;
  devDir: string;
}

export class RuntimeGenerator {
  config: RuntimeGeneratorConfig;

  constructor(config: RuntimeGeneratorConfig) {
    this.config = config;
  }

  private resolveOutputDir(): string {
    return this.config.outputDir ?? this.config.devDir;
  }

  private resolveSourceDir(): string {
    return path.resolve(__dirname, "..");
  }

  generateMain(): string {
    const buildId = Date.now().toString();
    return renderMainV2({
      srcDir: this.resolveSourceDir(),
      outputPath: "",
      injectDevDir: this.config.devDir,
    }).replace('runtime.js', 'runtime.js?v=' + buildId);
  }

  generateCatalog(): string {
    return renderCatalog({
      srcDir: this.resolveSourceDir(),
    });
  }

  generateRuntime(): string {
    return renderRuntimeV2Sync({
      srcDir: this.resolveSourceDir(),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
  }

  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    const outDir = this.resolveOutputDir();
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");

    validateGeneratedArtifacts(main, catalog, runtime);

    return { main, catalog, runtime };
  }

  async validateGenerated(): Promise<void> {
    const { main, catalog, runtime } = await this.generate();
    validateGeneratedArtifacts(main, catalog, runtime);
  }

  async deploy(): Promise<void> {
    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    validateGeneratedArtifacts(main, catalog, runtime);

    await fs.promises.mkdir(this.config.devDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.config.devDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(this.config.devDir, "runtime.js"), runtime, "utf-8");
    await writeRuntimeManifest(main, catalog, runtime, this.config.devDir);
  }

  async build(): Promise<RuntimeBuildReport> {
    const outDir = this.resolveOutputDir();
    const previousManifest = readExistingManifest(outDir);

    const catalog = this.generateCatalog();
    const runtime = this.generateRuntime();
    const main = this.generateMain();

    validateGeneratedArtifacts(main, catalog, runtime);

    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(path.join(outDir, "main.js"), main, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "catalog.js"), catalog, "utf-8");
    await fs.promises.writeFile(path.join(outDir, "runtime.js"), runtime, "utf-8");

    const manifest = await writeRuntimeManifest(main, catalog, runtime, outDir);
    return {
      manifest,
      changes: {
        mainChanged: !previousManifest || previousManifest.mainChecksum !== manifest.mainChecksum,
        runtimeChanged:
          !previousManifest || previousManifest.runtimeChecksum !== manifest.runtimeChecksum,
        catalogChanged:
          !previousManifest || previousManifest.catalogChecksum !== manifest.catalogChecksum,
      },
    };
  }
}
