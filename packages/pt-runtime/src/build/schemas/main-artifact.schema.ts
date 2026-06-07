// packages/pt-runtime/src/build/schemas/main-artifact.schema.ts
import { z } from "zod";

export const MainArtifactContractSchema = z
  .object({
    containsMainFunction: z.boolean(),
    containsCleanUpFunction: z.boolean(),
    containsCreateKernel: z.boolean(),
    containsLoadModule: z.boolean(),
    hasDuplicateTslibHelpers: z.boolean(),
    hasRuntimeDispatcher: z.boolean(),
    isValidJavaScript: z.boolean(),
  })
  .describe("Contrato observable del artefacto main.js");

export type MainArtifactContractInput = z.infer<typeof MainArtifactContractSchema>;

export const RuntimeArtifactContractSchema = z
  .object({
    containsPtDispatch: z.boolean(),
    containsRuntimeDispatcher: z.boolean(),
    containsTslibValues: z.boolean(),
    containsTslibRead: z.boolean(),
    hasKernelLifecycle: z.boolean(),
    hasDuplicateTslibHelpers: z.boolean(),
    isValidJavaScript: z.boolean(),
  })
  .describe("Contrato observable del artefacto runtime.js");

export type RuntimeArtifactContractInput = z.infer<typeof RuntimeArtifactContractSchema>;

export const CatalogArtifactContractSchema = z
  .object({
    containsCatalogConstants: z.boolean(),
    hasKernelLifecycle: z.boolean(),
    hasRuntimeDispatcher: z.boolean(),
    isValidJavaScript: z.boolean(),
  })
  .describe("Contrato observable del artefacto catalog.js");

export type CatalogArtifactContractInput = z.infer<typeof CatalogArtifactContractSchema>;
