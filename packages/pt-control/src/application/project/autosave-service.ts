import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ProjectService } from "./project-service.js";
import type { AutosaveEntry, AutosaveResult } from "./project-types.js";

export interface AutosaveOptions {
  dir?: string;
  keep?: number;
  chunkSize?: number;
}

export interface AutosaveServiceConfig {
  homeDir?: string;
}

function sanitizeBaseName(path: string): string {
  return basename(path || "unsaved.pkt", ".pkt").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function toUnsignedBuffer(bytes: number[]): Buffer {
  return Buffer.from(bytes.map((b) => b & 0xff));
}

export class AutosaveService {
  constructor(private readonly project: ProjectService, private readonly config: AutosaveServiceConfig = {}) {}

  private rootDir(outputDir?: string): string {
    return outputDir ?? join(this.config.homeDir ?? homedir(), ".pt-cli", "autosaves");
  }

  async createAutosave(options: AutosaveOptions = {}): Promise<AutosaveResult> {
    const status = await this.project.status();
    const activeFile = status.activeFile || status.savedFilename || "unsaved.pkt";
    const base = sanitizeBaseName(activeFile);
    const createdAt = new Date();
    const safeCreatedAt = createdAt.toISOString().replace(/[:.]/g, "-");
    const targetDir = join(this.rootDir(options.dir), base);
    await mkdir(targetDir, { recursive: true });

    const begin = await this.project.snapshotBegin(options.chunkSize ?? 65_536);
    const chunks: Buffer[] = [];
    let offset = 0;
    try {
      while (offset < begin.length) {
        const chunk = await this.project.snapshotRead(begin.snapshotId, offset, begin.chunkSize);
        chunks.push(toUnsignedBuffer(chunk.bytes));
        offset = chunk.nextOffset;
        if (chunk.eof) break;
      }
    } finally {
      await this.project.snapshotClear(begin.snapshotId).catch(() => undefined);
    }

    const buffer = Buffer.concat(chunks);
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const autosavePath = join(
      targetDir,
      `${base}.${safeCreatedAt}.${buffer.length}.${sha256.slice(0, 8)}.pkt`,
    );
    await writeFile(autosavePath, buffer);

    const entry: AutosaveEntry = {
      id: `autosave_${randomUUID().replace(/-/g, "")}`,
      createdAt: createdAt.toISOString(),
      projectPath: activeFile,
      autosavePath,
      bytes: buffer.length,
      sha256,
      source: "fileSaveToBytes",
      deviceCount: status.deviceCount,
      linkCount: status.linkCount,
    };
    await this.appendIndex(entry, options.dir);
    const deletedOld = await this.pruneAutosaves(options.keep ?? 20, activeFile, options.dir);

    return {
      ok: true,
      action: "project.autosave",
      activeFile,
      autosavePath,
      bytes: buffer.length,
      sha256,
      kept: options.keep ?? 20,
      deletedOld,
    };
  }

  async listAutosaves(projectPath?: string, outputDir?: string): Promise<AutosaveEntry[]> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    try {
      const entries = JSON.parse(await readFile(indexPath, "utf8")) as AutosaveEntry[];
      return projectPath ? entries.filter((entry) => entry.projectPath === projectPath) : entries;
    } catch {
      return [];
    }
  }

  async resolveLatestAutosave(projectPath?: string, outputDir?: string): Promise<AutosaveEntry | null> {
    const entries = await this.listAutosaves(projectPath, outputDir);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  private async appendIndex(entry: AutosaveEntry, outputDir?: string): Promise<void> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    await mkdir(dirname(indexPath), { recursive: true });
    const entries = await this.listAutosaves(undefined, outputDir);
    entries.push(entry);
    await writeFile(indexPath, JSON.stringify(entries, null, 2));
  }

  async pruneAutosaves(keep: number, projectPath?: string, outputDir?: string): Promise<string[]> {
    const indexPath = join(this.rootDir(outputDir), "index.json");
    const entries = await this.listAutosaves(undefined, outputDir);
    const matching = projectPath ? entries.filter((entry) => entry.projectPath === projectPath) : entries;
    const sorted = matching.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const toDelete = sorted.slice(keep);
    for (const entry of toDelete) await rm(entry.autosavePath, { force: true });
    const deleteSet = new Set(toDelete.map((entry) => entry.id));
    await writeFile(indexPath, JSON.stringify(entries.filter((entry) => !deleteSet.has(entry.id)), null, 2));
    return toDelete.map((entry) => entry.autosavePath);
  }
}