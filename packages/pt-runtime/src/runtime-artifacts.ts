import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

export interface RuntimeArtifactSnapshot {
  createdAt: string;
  sourceDir: string;
  files: string[];
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function snapshotRuntimeArtifacts(devDir: string): RuntimeArtifactSnapshot {
  const releasesDir = join(devDir, '.releases');
  ensureDir(releasesDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotDir = join(releasesDir, stamp);
  ensureDir(snapshotDir);

  const files = ['main.js', 'runtime.js', 'manifest.json', 'bridge-lease.json'];
  const copied: string[] = [];

  for (const file of files) {
    const source = join(devDir, file);
    if (!existsSync(source)) continue;
    copyFileSync(source, join(snapshotDir, file));
    copied.push(file);
  }

  const metadata = { createdAt: new Date().toISOString(), sourceDir: devDir, files: copied };
  writeFileSync(join(snapshotDir, 'snapshot.json'), JSON.stringify(metadata, null, 2), 'utf-8');

  return metadata;
}

export function listRuntimeSnapshots(devDir: string): string[] {
  const releasesDir = join(devDir, '.releases');
  if (!existsSync(releasesDir)) return [];
  return readdirSync(releasesDir).sort().reverse();
}

export function restoreRuntimeSnapshot(devDir: string, snapshotName?: string): string | null {
  const releasesDir = join(devDir, '.releases');
  const snapshots = listRuntimeSnapshots(devDir);
  const target = snapshotName ?? snapshots[0];
  if (!target) return null;

  const snapshotDir = join(releasesDir, target);
  const files = ['main.js', 'runtime.js', 'manifest.json', 'bridge-lease.json'];

  for (const file of files) {
    const source = join(snapshotDir, file);
    if (!existsSync(source)) continue;
    copyFileSync(source, join(devDir, file));
  }

  return snapshotDir;
}
