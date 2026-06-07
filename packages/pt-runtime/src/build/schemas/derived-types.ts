// packages/pt-runtime/src/build/schemas/derived-types.ts
import type { z } from "zod";

import {
  BuildChangeReportSchema,
  ChecksumSchema,
  ManifestModulesSchema,
  ManifestReloadSchema,
  RuntimeArtifactManifestSchema,
} from "./runtime-artifact.schema.js";

export type RuntimeArtifactManifest = z.infer<typeof RuntimeArtifactManifestSchema>;
export type ManifestModules = z.infer<typeof ManifestModulesSchema>;
export type ManifestReload = z.infer<typeof ManifestReloadSchema>;
export type BuildChangeReport = z.infer<typeof BuildChangeReportSchema>;
export type Checksum = z.infer<typeof ChecksumSchema>;

export const RUNTIME_MANIFEST_DEFAULTS: Pick<
  RuntimeArtifactManifest,
  "schemaVersion" | "cliVersion" | "protocolVersion"
> = {
  schemaVersion: "1.0",
  cliVersion: "0.3.0",
  protocolVersion: 3,
};

export const RUNTIME_RELOAD_DEFAULTS: ManifestReload = {
  mainManualReloadRequiredWhenChanged: true,
  runtimeHotReloadable: true,
  catalogHotReloadable: false,
};
