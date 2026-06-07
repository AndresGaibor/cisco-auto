import * as fs from "fs";
import * as path from "path";
import { computeChecksum, normalizeArtifactForChecksum } from "./checksum";
import {
  BuildChangeReportSchema,
  RuntimeArtifactManifestSchema,
} from "./schemas/runtime-artifact.schema.js";
import {
  RUNTIME_MANIFEST_DEFAULTS,
  RUNTIME_RELOAD_DEFAULTS,
  type BuildChangeReport,
  type RuntimeArtifactManifest,
} from "./schemas/derived-types.js";

export type { RuntimeArtifactManifest, BuildChangeReport } from "./schemas/derived-types.js";

export interface RuntimeBuildChangeReport {
  mainChanged: boolean;
  runtimeChanged: boolean;
  catalogChanged: boolean;
}

export interface RuntimeBuildReport {
  manifest: RuntimeArtifactManifest;
  changes: RuntimeBuildChangeReport;
}

export const RUNTIME_CLI_VERSION = "0.3.0";
export const RUNTIME_PROTOCOL_VERSION = 3;

export function readExistingManifest(outputDir: string): RuntimeArtifactManifest | null {
  try {
    const manifestPath = path.join(outputDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    const manifest = RuntimeArtifactManifestSchema.parse(parsed);
    return manifest;
  } catch {
    return null;
  }
}

export async function writeRuntimeManifest(
  main: string,
  catalog: string,
  runtime: string,
  outputDir: string,
): Promise<RuntimeArtifactManifest> {
  const manifest: RuntimeArtifactManifest = {
    ...RUNTIME_MANIFEST_DEFAULTS,
    mainChecksum: computeChecksum(normalizeArtifactForChecksum(main)),
    catalogChecksum: computeChecksum(normalizeArtifactForChecksum(catalog)),
    runtimeChecksum: computeChecksum(normalizeArtifactForChecksum(runtime)),
    modules: {
      main: "main.js",
      catalog: "catalog.js",
      runtime: "runtime.js",
    },
    reload: RUNTIME_RELOAD_DEFAULTS,
  };

  // Validar el manifest con el schema antes de escribirlo a disco
  try {
    RuntimeArtifactManifestSchema.parse(manifest);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new Error(`Manifest inválido: ${detalle}`);
  }

  await fs.promises.mkdir(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  return manifest;
}

export function validateChangeReport(report: unknown): BuildChangeReport {
  return BuildChangeReportSchema.parse(report);
}

export function compareManifests(
  prev: RuntimeArtifactManifest | null,
  next: RuntimeArtifactManifest,
): RuntimeBuildChangeReport {
  if (prev === null) {
    return {
      mainChanged: true,
      runtimeChanged: true,
      catalogChanged: true,
    };
  }

  return {
    mainChanged: prev.mainChecksum !== next.mainChecksum,
    runtimeChanged: prev.runtimeChecksum !== next.runtimeChecksum,
    catalogChanged: prev.catalogChecksum !== next.catalogChecksum,
  };
}
