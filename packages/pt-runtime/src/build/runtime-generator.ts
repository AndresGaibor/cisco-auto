import * as fs from "fs";
import * as path from "path";
import { renderRuntimeV2Sync } from "./render-runtime-v2";
import { renderMainV2 } from "./render-main-v2";
import { renderCatalog } from "./render-catalog";
import { readExistingManifest, writeRuntimeManifest, type RuntimeBuildReport } from "./manifest";
import { validateGeneratedArtifacts } from "./validation";
import { assertJavaScriptSyntaxOrThrow } from "./syntax-assert";

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
    return renderMainV2({
      srcDir: this.resolveSourceDir(),
      outputPath: "",
      injectDevDir: this.config.devDir,
    });
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

  async generateAll(): Promise<{ main: string; catalog: string; runtime: string }> {
    const [main, catalog, runtime] = await Promise.all([
      Promise.resolve().then(() => this.generateMain()),
      Promise.resolve().then(() => this.generateCatalog()),
      Promise.resolve().then(() => this.generateRuntime()),
    ]);

    assertJavaScriptSyntaxOrThrow("main.js", main);
    assertJavaScriptSyntaxOrThrow("runtime.js", runtime);
    assertJavaScriptSyntaxOrThrow("catalog.js", catalog);

    validateGeneratedArtifacts(main, catalog, runtime);

    return { main, catalog, runtime };
  }

  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
    const result = await this.generateAll();
    const outDir = this.resolveOutputDir();
    await fs.promises.mkdir(outDir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(outDir, "main.js"), result.main, "utf-8"),
      fs.promises.writeFile(path.join(outDir, "catalog.js"), result.catalog, "utf-8"),
      fs.promises.writeFile(path.join(outDir, "runtime.js"), result.runtime, "utf-8"),
    ]);
    return result;
  }

  async validateGenerated(): Promise<void> {
    const result = await this.generateAll();
    validateGeneratedArtifacts(result.main, result.catalog, result.runtime);
  }

  async deploy(): Promise<void> {
    const result = await this.generateAll();

    await fs.promises.mkdir(this.config.devDir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(this.config.devDir, "main.js"), result.main, "utf-8"),
      fs.promises.writeFile(path.join(this.config.devDir, "catalog.js"), result.catalog, "utf-8"),
      fs.promises.writeFile(path.join(this.config.devDir, "runtime.js"), result.runtime, "utf-8"),
    ]);
    await writeRuntimeManifest(result.main, result.catalog, result.runtime, this.config.devDir);
  }

  async build(): Promise<RuntimeBuildReport> {
    const outDir = this.resolveOutputDir();
    const previousManifest = readExistingManifest(outDir);
    const result = await this.generateAll();

    await fs.promises.mkdir(outDir, { recursive: true });
    await Promise.all([
      fs.promises.writeFile(path.join(outDir, "main.js"), result.main, "utf-8"),
      fs.promises.writeFile(path.join(outDir, "catalog.js"), result.catalog, "utf-8"),
      fs.promises.writeFile(path.join(outDir, "runtime.js"), result.runtime, "utf-8"),
    ]);

    const manifest = await writeRuntimeManifest(result.main, result.catalog, result.runtime, outDir);
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
