import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { ProjectSaveResult, ProjectStatus, ProjectSnapshotChunk } from "./project-types.js";

function unwrapParsed<T>(result: unknown): T {
  const value = (result as any)?.value ?? result;
  return ((value as any)?.parsed ?? value) as T;
}

export class ProjectService {
  constructor(private readonly bridge: FileBridgePort, private readonly timeoutMs = 30_000) {}

  async status(): Promise<ProjectStatus> {
    const result = await this.bridge.sendCommandAndWait("__projectStatus", {}, this.timeoutMs);
    return unwrapParsed<ProjectStatus>(result);
  }

  async save(): Promise<ProjectSaveResult> {
    const result = await this.bridge.sendCommandAndWait("__projectSave", {}, this.timeoutMs);
    const parsed = unwrapParsed<any>(result);
    return {
      ok: Boolean(parsed.ok),
      action: "project.save",
      activeFile: parsed.after || parsed.before || "",
      saved: Boolean(parsed.saved),
      before: parsed.before || "",
      after: parsed.after || "",
    };
  }

  async snapshotBegin(
    chunkSize = 65_536,
  ): Promise<{ snapshotId: string; savedFilename: string; length: number; chunkSize: number }> {
    const result = await this.bridge.sendCommandAndWait("__projectSnapshotBegin", { chunkSize }, this.timeoutMs);
    return unwrapParsed(result);
  }

  async snapshotRead(snapshotId: string, offset: number, limit: number): Promise<ProjectSnapshotChunk> {
    const result = await this.bridge.sendCommandAndWait("__projectSnapshotRead", { snapshotId, offset, limit }, this.timeoutMs);
    return unwrapParsed(result);
  }

  async snapshotClear(snapshotId: string): Promise<void> {
    await this.bridge.sendCommandAndWait("__projectSnapshotClear", { snapshotId }, this.timeoutMs);
  }

  async open(path: string): Promise<{ ok: boolean; before: string; after: string; requestedPath: string }> {
    const result = await this.bridge.sendCommandAndWait("__projectOpen", { path }, this.timeoutMs);
    return unwrapParsed(result);
  }
}