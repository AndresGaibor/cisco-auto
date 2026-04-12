// packages/pt-runtime/src/core/runtime-builder.ts
// Runtime builder - assembles runtime from handlers or templates

import { renderRuntimeV2Sync } from "../build/render-runtime-v2";
import { renderMainV2 } from "../build/render-main-v2";
import type { HandlerRegistryPort } from "../ports";
import { globalRegistry } from "./registry";

export interface RuntimeBuildResult {
  main: string;
  runtime: string;
}

export class RuntimeBuilder {
  constructor(private readonly registry: HandlerRegistryPort = globalRegistry) {}

  buildRuntimeFromHandlers(inputDir: string): string {
    return renderRuntimeV2Sync({
      srcDir: inputDir,
      outputPath: "",
    });
  }

  buildMainKernel(devDir?: string): string {
    return renderMainV2({
      srcDir: process.cwd() + "/src",
      outputPath: "",
      injectDevDir: devDir,
    });
  }

  buildAll(inputDir: string, devDir?: string): RuntimeBuildResult {
    return {
      main: this.buildMainKernel(devDir),
      runtime: this.buildRuntimeFromHandlers(inputDir),
    };
  }

  getRegisteredTypes(): string[] {
    return this.registry.getAllSupportedTypes();
  }
}
