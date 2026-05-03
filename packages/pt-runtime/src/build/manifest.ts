import * as fs from "fs";
import * as path from "path";
import { computeChecksum, normalizeArtifactForChecksum } from "./checksum";

export interface RuntimeArtifactManifest {
  schemaVersion: string;
  cliVersion: string;
  protocolVersion: number;
  mainChecksum: string;
  runtimeChecksum: string;
  catalogChecksum: string;
  modules: {
    main: string;
    catalog: string;
    runtime: string;
  };
  reload: {
    mainManualReloadRequiredWhenChanged: boolean;
    runtimeHotReloadable: boolean;
    catalogHotReloadable: boolean;
  };
}

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
    const manifest = JSON.parse(raw) as RuntimeArtifactManifest;
    return manifest && typeof manifest === "object" ? manifest : null;
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
    schemaVersion: "1.0",
    cliVersion: RUNTIME_CLI_VERSION,
    protocolVersion: RUNTIME_PROTOCOL_VERSION,
    mainChecksum: computeChecksum(normalizeArtifactForChecksum(main)),
    catalogChecksum: computeChecksum(normalizeArtifactForChecksum(catalog)),
    runtimeChecksum: computeChecksum(normalizeArtifactForChecksum(runtime)),
    modules: {
      main: "main.js",
      catalog: "catalog.js",
      runtime: "runtime.js",
    },
    reload: {
      mainManualReloadRequiredWhenChanged: true,
      runtimeHotReloadable: true,
      catalogHotReloadable: false,
    },
  };

  await fs.promises.mkdir(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  return manifest;
}
