import { errorResult, okResult } from "../domain/runtime-result.js";
import type { RuntimeResult } from "../runtime/contracts.js";

function getAppWindow(api: any): any {
  if (!api || !api.ipc || typeof api.ipc.appWindow !== "function") {
    return null;
  }
  return api.ipc.appWindow();
}

function getActiveFile(aw: any): any {
  if (!aw || typeof aw.getActiveFile !== "function") return null;
  return aw.getActiveFile();
}

function getSavedFilename(file: any): string {
  if (!file || typeof file.getSavedFilename !== "function") return "";
  return String(file.getSavedFilename() || "");
}

function getScope(api: any): any {
  if (api && api.global) return api.global;
  try {
    return (0, Function)("return this")();
  } catch {
    return {};
  }
}

function ensureSnapshotStore(scope: any): Record<string, any> {
  if (!scope.__ptProjectSnapshots) scope.__ptProjectSnapshots = {};
  return scope.__ptProjectSnapshots;
}

export function handleProjectStatus(_payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw) return errorResult("AppWindow no disponible", { code: "APP_WINDOW_UNAVAILABLE" });

    const f = getActiveFile(aw);
    const net = typeof api.getNet === "function" ? api.getNet() : null;
    const activeFile = getSavedFilename(f);

    return okResult("", {
      parsed: {
        ok: true,
        activeFileClass: f && typeof f.getClassName === "function" ? f.getClassName() : null,
        activeFile,
        savedFilename: activeFile,
        isSavedToDisk: activeFile.length > 0,
        isActivityFile: f && typeof f.isActivityFile === "function" ? f.isActivityFile() : null,
        networkDescription: f && typeof f.getNetworkDescription === "function" ? f.getNetworkDescription() : "",
        defaultSaveLocation: typeof aw.getDefaultFileSaveLocation === "function" ? aw.getDefaultFileSaveLocation() : "",
        tempFileLocation: typeof aw.getTempFileLocation === "function" ? aw.getTempFileLocation() : "",
        deviceCount: net && typeof net.getDeviceCount === "function" ? net.getDeviceCount() : null,
        linkCount: net && typeof net.getLinkCount === "function" ? net.getLinkCount() : null,
      },
    });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_STATUS_FAILED" });
  }
}

export function handleProjectSave(_payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw || typeof aw.fileSave !== "function") {
      return errorResult("fileSave no disponible", { code: "PROJECT_SAVE_UNAVAILABLE" });
    }
    const beforeFile = getActiveFile(aw);
    const before = getSavedFilename(beforeFile);
    const saved = aw.fileSave();
    const after = getSavedFilename(getActiveFile(aw));
    return okResult("", { parsed: { ok: !!saved, saved: !!saved, before, after } });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SAVE_FAILED" });
  }
}

export function handleProjectSnapshotBegin(payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const aw = getAppWindow(api);
    if (!aw || typeof aw.fileSaveToBytes !== "function") {
      return errorResult("fileSaveToBytes no disponible", { code: "PROJECT_SNAPSHOT_UNAVAILABLE" });
    }
    const bytes = aw.fileSaveToBytes();
    const chunkSize =
      typeof payload.chunkSize === "number" ? Math.max(1, Math.min(payload.chunkSize, 262144)) : 65536;
    const snapshotId = "snap_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 100000));
    const savedFilename = getSavedFilename(getActiveFile(aw));
    const store = ensureSnapshotStore(getScope(api));
    store[snapshotId] = { id: snapshotId, savedFilename, bytes, createdAt: Date.now() };
    return okResult("", { parsed: { ok: true, snapshotId, savedFilename, length: bytes.length, chunkSize } });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SNAPSHOT_BEGIN_FAILED" });
  }
}

export function handleProjectSnapshotRead(payload: Record<string, unknown>, api: any): RuntimeResult {
  try {
    const snapshotId = String(payload.snapshotId || "");
    const offset = typeof payload.offset === "number" ? Math.max(0, payload.offset) : 0;
    const limit = typeof payload.limit === "number" ? Math.max(1, Math.min(payload.limit, 262144)) : 65536;
    const store = ensureSnapshotStore(getScope(api));
    const snapshot = store[snapshotId];
    if (!snapshot) return errorResult("Snapshot no encontrado", { code: "PROJECT_SNAPSHOT_NOT_FOUND" });
    const slice = snapshot.bytes.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    return okResult("", {
      parsed: { ok: true, snapshotId, offset, nextOffset, eof: nextOffset >= snapshot.bytes.length, bytes: slice },
    });
  } catch (error) {
    return errorResult(String(error instanceof Error ? error.message : error), { code: "PROJECT_SNAPSHOT_READ_FAILED" });
  }
}

export function handleProjectSnapshotClear(payload: Record<string, unknown>, api: any): RuntimeResult {
  const snapshotId = String(payload.snapshotId || "");
  const store = ensureSnapshotStore(getScope(api));
  if (snapshotId) delete store[snapshotId];
  else {
    for (const key of Object.keys(store)) delete store[key];
  }
  return okResult("", { parsed: { ok: true, snapshotId } });
}