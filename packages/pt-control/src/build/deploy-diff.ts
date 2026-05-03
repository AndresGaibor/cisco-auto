import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ArtifactName = "main.js" | "runtime.js" | "catalog.js" | "manifest.json";

export type ArtifactDiff = {
  name: ArtifactName;
  srcPath: string;
  destPath: string;
  beforeHash: string | null;
  afterHash: string;
  changed: boolean;
};

export const ARTIFACTS: ArtifactName[] = ["main.js", "runtime.js", "catalog.js", "manifest.json"];

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return sha256Text(readFileSync(filePath, "utf8"));
}

export function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function computeDeployDiff(generatedDir: string, devDir: string): ArtifactDiff[] {
  return ARTIFACTS.map((name) => {
    const srcPath = resolve(generatedDir, name);
    const destPath = resolve(devDir, name);
    const beforeHash = sha256File(destPath);
    const afterHash = sha256File(srcPath);

    if (!afterHash) {
      throw new Error(`Generated artifact missing: ${srcPath}`);
    }

    return {
      name,
      srcPath,
      destPath,
      beforeHash,
      afterHash,
      changed: beforeHash !== afterHash,
    };
  });
}

export function copyChangedArtifacts(diff: ArtifactDiff[]): void {
  for (const item of diff) {
    if (!item.changed) {
      console.log(`   = ${item.destPath}`);
      continue;
    }

    ensureParentDir(item.destPath);
    copyFileSync(item.srcPath, item.destPath);
    console.log(`   ✓ ${item.destPath}`);
  }
}

export function artifactChanged(diff: ArtifactDiff[], name: ArtifactName): boolean {
  return diff.some((item) => item.name === name && item.changed);
}

export function shortHash(hash: string | null): string {
  return hash ? hash.slice(0, 12) : "missing";
}

export function classifyDeploy(diff: ArtifactDiff[]) {
  const mainChanged = artifactChanged(diff, "main.js");
  const runtimeChanged = artifactChanged(diff, "runtime.js");
  const catalogChanged = artifactChanged(diff, "catalog.js");
  const manifestChanged = artifactChanged(diff, "manifest.json");
  const anyChanged = diff.some((item) => item.changed);

  return {
    anyChanged,
    mainChanged,
    runtimeChanged,
    catalogChanged,
    manifestChanged,
    manualMainReloadRequired: mainChanged,
    runtimeWakeupRecommended: !mainChanged && (runtimeChanged || catalogChanged || manifestChanged),
    noReloadRequired: !anyChanged,
  };
}
