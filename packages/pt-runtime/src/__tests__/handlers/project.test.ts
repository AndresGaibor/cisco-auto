import { describe, expect, test } from "bun:test";
import { handleProjectOpen, handleProjectStatus, handleProjectSave, handleProjectSnapshotBegin, handleProjectSnapshotRead, handleProjectSnapshotClear } from "../../handlers/project.js";

function createDeps(overrides: Record<string, unknown> = {}) {
  const archivoActivo = {
    getClassName: () => "NetworkFile",
    getSavedFilename: () => "/Users/me/labs/taller.pkt",
    isActivityFile: () => false,
    getNetworkDescription: () => "Taller CCNA",
  };
  const appWindow = {
    getActiveFile: () => archivoActivo,
    fileOpen: (p: string) => {},
    fileNew: () => {},
    getDefaultFileSaveLocation: () => "/Users/me/Cisco Packet Tracer 9.0.0/saves",
    getTempFileLocation: () => "/tmp/pt",
  };
  return {
    ipc: { appWindow: () => appWindow },
    getNet: () => ({ getDeviceCount: () => 17, getLinkCount: () => 37 }),
    ...overrides,
  } as any;
}

describe("project handlers", () => {
  test("__projectStatus devuelve archivo activo y conteos", () => {
    const result = handleProjectStatus({}, createDeps());
    expect(result).toMatchObject({
      ok: true,
      parsed: {
        ok: true,
        activeFileClass: "NetworkFile",
        activeFile: "/Users/me/labs/taller.pkt",
        savedFilename: "/Users/me/labs/taller.pkt",
        isSavedToDisk: true,
        isActivityFile: false,
        networkDescription: "Taller CCNA",
        defaultSaveLocation: "/Users/me/Cisco Packet Tracer 9.0.0/saves",
        tempFileLocation: "/tmp/pt",
        deviceCount: 17,
        linkCount: 37,
      },
    });
  });

  test("__projectStatus sin archivo activo devuelve isSavedToDisk=false", () => {
    const deps = createDeps({
      ipc: {
        appWindow: () => ({
          getActiveFile: () => ({ getSavedFilename: () => "", isActivityFile: () => false, getClassName: () => "NetworkFile" }),
          getDefaultFileSaveLocation: () => "/default",
          getTempFileLocation: () => "/tmp",
        }),
      },
    });
    const result = handleProjectStatus({}, deps) as any;
    expect(result.parsed.isSavedToDisk).toBe(false);
    expect(result.parsed.activeFile).toBe("");
  });

  test("__projectSave llama fileSave sin argumentos", () => {
    const llamadas: unknown[][] = [];
    const archivoActivo = { getSavedFilename: () => "/tmp/taller.pkt" };
    const deps = createDeps({
      ipc: {
        appWindow: () => ({
          getActiveFile: () => archivoActivo,
          fileSave: (...args: unknown[]) => {
            llamadas.push(args);
            return true;
          },
        }),
      },
    });
    const result = handleProjectSave({}, deps) as any;
    expect(llamadas).toEqual([[]]);
    expect(result.parsed).toMatchObject({ ok: true, saved: true, before: "/tmp/taller.pkt", after: "/tmp/taller.pkt" });
  });

  test("__projectSave sin appWindow devuelve error", () => {
    const deps = createDeps({ ipc: { appWindow: () => null } });
    const result = handleProjectSave({}, deps) as any;
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PROJECT_SAVE_UNAVAILABLE");
  });

  test("snapshot chunked lee bytes firmados por partes", () => {
    const scope: any = {};
    const deps = createDeps({
      global: scope,
      ipc: {
        appWindow: () => ({
          getActiveFile: () => ({ getSavedFilename: () => "/tmp/taller.pkt" }),
          fileSaveToBytes: () => [-1, 0, 127, 128, 255],
        }),
      },
    });
    const begin = handleProjectSnapshotBegin({ chunkSize: 2 }, deps) as any;
    expect(begin.parsed).toMatchObject({ ok: true, length: 5, chunkSize: 2, savedFilename: "/tmp/taller.pkt" });
    const snapshotId = begin.parsed.snapshotId;
    const first = handleProjectSnapshotRead({ snapshotId, offset: 0, limit: 2 }, deps) as any;
    expect(first.parsed.bytes).toEqual([-1, 0]);
    expect(first.parsed.eof).toBe(false);
    const last = handleProjectSnapshotRead({ snapshotId, offset: 4, limit: 2 }, deps) as any;
    expect(last.parsed.bytes).toEqual([255]);
    expect(last.parsed.eof).toBe(true);
    const cleared = handleProjectSnapshotClear({ snapshotId }, deps) as any;
    expect(cleared.parsed.ok).toBe(true);
  });

  test("snapshot con chunkSize por defecto usa 65536", () => {
    const scope: any = {};
    const deps = createDeps({
      global: scope,
      ipc: {
        appWindow: () => ({
          getActiveFile: () => ({ getSavedFilename: () => "/tmp/test.pkt" }),
          fileSaveToBytes: () => [1, 2, 3],
        }),
      },
    });
    const begin = handleProjectSnapshotBegin({}, deps) as any;
    expect(begin.parsed.chunkSize).toBe(65536);
  });

  test("snapshot read con snapshotId invalido devuelve error", () => {
    const scope: any = {};
    const deps = createDeps({ global: scope });
    const result = handleProjectSnapshotRead({ snapshotId: "no-existe" }, deps) as any;
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PROJECT_SNAPSHOT_NOT_FOUND");
  });

  test("__projectOpen llama fileOpen con la ruta y registra cambio de archivo", () => {
    var activeFile = "/Users/me/labs/taller.pkt";
    const deps = createDeps({
      ipc: {
        appWindow: () => ({
          getActiveFile: () => ({ getSavedFilename: () => activeFile }),
          fileOpen: (p: string) => { activeFile = p; },
        }),
      },
    });
    const result = handleProjectOpen({ path: "/tmp/checkpoint.pkt" }, deps) as any;
    expect(result.parsed.ok).toBe(true);
    expect(result.parsed.before).toBe("/Users/me/labs/taller.pkt");
    expect(result.parsed.after).toBe("/tmp/checkpoint.pkt");
    expect(result.parsed.requestedPath).toBe("/tmp/checkpoint.pkt");
  });

  test("__projectOpen sin ruta devuelve error", () => {
    const result = handleProjectOpen({ path: "" }, createDeps()) as any;
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PROJECT_OPEN_INVALID_PATH");
  });

  test("__projectOpen sin appWindow devuelve error", () => {
    const deps = createDeps({ ipc: { appWindow: () => null } });
    const result = handleProjectOpen({ path: "/tmp/checkpoint.pkt" }, deps) as any;
    expect(result.ok).toBe(false);
    expect(result.code).toBe("PROJECT_OPEN_UNAVAILABLE");
  });

  test("__projectOpen usa fileNew como fallback si fileOpen no cambia activeFile", () => {
    var activeFile = "/Users/me/labs/taller.pkt";
    var newCalled = false;
    const deps = createDeps({
      ipc: {
        appWindow: () => ({
          getActiveFile: () => ({ getSavedFilename: () => activeFile }),
          fileOpen: (p: string) => {
            if (!newCalled) {
              // primera vez — fileOpen no cambia el archivo
            } else {
              activeFile = p;
            }
          },
          fileNew: () => { newCalled = true; },
        }),
      },
    });
    const result = handleProjectOpen({ path: "/tmp/checkpoint.pkt" }, deps) as any;
    expect(newCalled).toBe(true);
    expect(result.parsed.after).toBe("/tmp/checkpoint.pkt");
    expect(result.parsed.ok).toBe(true);
  });

  test("snapshot clear sin snapshotId limpia todo el store", () => {
    const scope: any = { __ptProjectSnapshots: { snap_1: { id: "snap_1", bytes: [1, 2] } } };
    const deps = createDeps({ global: scope });
    const result = handleProjectSnapshotClear({}, deps) as any;
    expect(result.parsed.ok).toBe(true);
    expect(scope.__ptProjectSnapshots).toEqual({});
  });
});