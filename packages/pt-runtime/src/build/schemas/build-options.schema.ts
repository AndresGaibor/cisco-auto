// packages/pt-runtime/src/build/schemas/build-options.schema.ts
import { z } from "zod";

export const RenderMainV2OptionsSchema = z
  .object({
    srcDir: z.string().min(1, "srcDir is required"),
    outputPath: z.string(),
    injectDevDir: z.string().optional(),
    minify: z.boolean().optional(),
  })
  .describe("Opciones para renderMainV2 — genera el artefacto main.js");

export type RenderMainV2OptionsInput = z.infer<typeof RenderMainV2OptionsSchema>;

export const RenderRuntimeV2OptionsSchema = z
  .object({
    srcDir: z.string().min(1, "srcDir is required"),
    outputPath: z.string(),
    injectDevDir: z.string().optional(),
    minify: z.boolean().optional(),
  })
  .describe("Opciones para renderRuntimeV2 — genera el artefacto runtime.js");

export type RenderRuntimeV2OptionsInput = z.infer<typeof RenderRuntimeV2OptionsSchema>;

export const RenderCatalogOptionsSchema = z
  .object({
    srcDir: z.string().min(1, "srcDir is required"),
  })
  .describe("Opciones para renderCatalog — genera el artefacto catalog.js");

export type RenderCatalogOptionsInput = z.infer<typeof RenderCatalogOptionsSchema>;

export const RuntimeGeneratorConfigSchema = z
  .object({
    outputDir: z.string().optional(),
    devDir: z.string().min(1, "devDir is required"),
    minify: z.boolean().optional(),
  })
  .describe("Configuración de RuntimeGenerator");

export type RuntimeGeneratorConfigInput = z.infer<typeof RuntimeGeneratorConfigSchema>;
