import { describe, expect, test } from "bun:test";
import { RecoveryService } from "./recovery-service.js";
import type { AutosaveService } from "./autosave-service.js";
import type { ProjectService } from "./project-service.js";
import type { PacketTracerAppService } from "../app/packet-tracer-app-service.js";

describe("RecoveryService", () => {
  test("openProject delega a app.open y verifica activeFile", async () => {
    let appOpenCalled = false;
    let appOpenPath = "";
    const mockAppService = {
      status: async () => ({ process: { level: "stopped", pid: null, pidFile: null, lastHeartbeat: null, lastStatus: "unknown" }, runtime: { loaded: false, mainJs: null, mainJsExists: false, runtimeJs: null, runtimeJsExists: false }, project: { hasActiveFile: false, activeFile: null } }),
      open: async (path: string) => { appOpenCalled = true; appOpenPath = path; return { ok: true }; },
      paths: async () => ({ platform: "darwin", candidates: [], selected: "/Applications/PT.app", source: "known-path" as const }),
    };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 3, linkCount: 2 }) };
    const mockAutosaveService = { resolveLatestAutosave: async () => null };

    const service = new RecoveryService(
      mockAppService as unknown as PacketTracerAppService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
    );

    const result = await service.openProject("/tmp/lab.pkt", { wait: false });

    expect(appOpenCalled).toBe(true);
    expect(appOpenPath).toBe("/tmp/lab.pkt");
    expect(result.ok).toBe(true);
    expect(result.action).toBe("project.open");
  });

  test("recoverFromLast busca latest autosave y abre con app.open", async () => {
    let appOpenCalled = false;
    let appOpenPath = "";
    const latestAutosave = {
      id: "autosave_1",
      createdAt: "2026-05-05T10:00:00Z",
      projectPath: "/tmp/lab.pkt",
      autosavePath: "/tmp/.pt-cli/autosaves/lab/lab.2026-05-05T10-00-00.5120.abcdef12.pkt",
      bytes: 5120,
      sha256: "abcdef1234567890",
      source: "fileSaveToBytes" as const,
      deviceCount: 3,
      linkCount: 2,
    };
    const mockAppService = {
      open: async (path: string) => { appOpenCalled = true; appOpenPath = path; return { ok: true }; },
      paths: async () => ({ platform: "darwin", candidates: [], selected: "/Applications/PT.app", source: "known-path" as const }),
    };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 3, linkCount: 2 }) };
    const mockAutosaveService = { resolveLatestAutosave: async () => latestAutosave };

    const service = new RecoveryService(
      mockAppService as unknown as PacketTracerAppService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
    );

    const result = await service.recoverFromLast();

    expect(appOpenCalled).toBe(true);
    expect(appOpenPath).toBe(latestAutosave.autosavePath);
    expect(result.ok).toBe(true);
    expect(result.action).toBe("project.recover");
    expect(result.recoveredFrom).toBe(latestAutosave.autosavePath);
  });

  test("recoverFromLast retorna error cuando no hay autosaves", async () => {
    const mockAppService = { open: async () => ({ ok: true }), paths: async () => ({ platform: "darwin", candidates: [], selected: "/Applications/PT.app", source: "known-path" as const }) };
    const mockProjectService = { status: async () => ({ ok: false, activeFile: "", savedFilename: "", isSavedToDisk: false, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: null, linkCount: null }) };
    const mockAutosaveService = { resolveLatestAutosave: async () => null };

    const service = new RecoveryService(
      mockAppService as unknown as PacketTracerAppService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
    );

    const result = await service.recoverFromLast();

    expect(result.ok).toBe(false);
    expect(result.error).toContain("No se encontró autosave");
  });

  test("listCheckpoints delega a autosaveService.listAutosaves", async () => {
    const checkpoints = [
      { id: "autosave_1", createdAt: "2026-05-05T10:00:00Z", projectPath: "/tmp/lab.pkt", autosavePath: "/tmp/checkpoint1.pkt", bytes: 5120, sha256: "abc123", source: "fileSaveToBytes" as const, deviceCount: 3, linkCount: 2 },
      { id: "autosave_2", createdAt: "2026-05-05T11:00:00Z", projectPath: "/tmp/lab.pkt", autosavePath: "/tmp/checkpoint2.pkt", bytes: 10240, sha256: "def456", source: "fileSaveToBytes" as const, deviceCount: 5, linkCount: 4 },
    ];
    const mockAppService = { open: async () => ({ ok: true }), paths: async () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" as const }) };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 5, linkCount: 4 }) };
    const mockAutosaveService = { listAutosaves: async (path?: string) => path === "/tmp/lab.pkt" ? checkpoints : [] };

    const service = new RecoveryService(
      mockAppService as unknown as PacketTracerAppService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
    );

    const result = await service.listCheckpoints("/tmp/lab.pkt");

    expect(result).toHaveLength(2);
    expect(result[0].autosavePath).toBe("/tmp/checkpoint1.pkt");
    expect(result[1].autosavePath).toBe("/tmp/checkpoint2.pkt");
  });

  test("openProject rechaza extensiones distintas de .pkt", async () => {
    const mockAppService = { open: async () => ({ ok: true }), paths: async () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" as const }) };
    const mockProjectService = { status: async () => ({ ok: false, activeFile: "", savedFilename: "", isSavedToDisk: false, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: null, linkCount: null }) };
    const mockAutosaveService = { resolveLatestAutosave: async () => null };

    const service = new RecoveryService(
      mockAppService as unknown as PacketTracerAppService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
    );

    const result = await service.openProject("/tmp/lab.pka");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Solo se soportan archivos .pkt");
  });
});