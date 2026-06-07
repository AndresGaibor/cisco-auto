// packages/pt-runtime/src/build/schemas/runtime-artifact.schema.ts
import { z } from "zod";

export const ChecksumSchema = z
  .string()
  .min(1, "checksum is required")
  .describe("Checksum hex/short del contenido del artefacto");

export const ManifestReloadSchema = z
  .object({
    mainManualReloadRequiredWhenChanged: z.boolean(),
    runtimeHotReloadable: z.boolean(),
    catalogHotReloadable: z.boolean(),
  })
  .describe("Política de recarga por artefacto (kernel/runtime/catalog)");

export const ManifestModulesSchema = z
  .object({
    main: z.string(),
    catalog: z.string(),
    runtime: z.string(),
  })
  .describe("Nombre de archivo por módulo");

export const RuntimeArtifactManifestSchema = z.object({
  schemaVersion: z.string().min(1),
  cliVersion: z.string().min(1),
  protocolVersion: z.number().int().nonnegative(),
  mainChecksum: ChecksumSchema,
  catalogChecksum: ChecksumSchema,
  runtimeChecksum: ChecksumSchema,
  modules: ManifestModulesSchema,
  reload: ManifestReloadSchema,
});

export const RuntimeArtifactManifestSchemaInput = RuntimeArtifactManifestSchema.describe(
  "Manifest del runtime desplegado en PT_DEV_DIR (schemaVersion, cliVersion, protocolVersion, checksums, módulos y política de recarga).",
);

export const BuildChangeReportSchema = z
  .object({
    mainChanged: z.boolean(),
    catalogChanged: z.boolean(),
    runtimeChanged: z.boolean(),
  })
  .describe("Reporte de cambios detectado entre manifests: qué artefactos cambiaron desde el build anterior.");
