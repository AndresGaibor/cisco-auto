import { describe, expect, test } from "bun:test";
import { PacketTracerAppService } from "./packet-tracer-app-service.js";
import type { PacketTracerPathResolver } from "./packet-tracer-path-resolver.js";
import type { PacketTracerProcessService } from "./packet-tracer-process-service.js";
import type { ProjectService } from "../project/project-service.js";
import type { AutosaveService } from "../project/autosave-service.js";
import type { FileBridgePort } from "../ports/file-bridge.port.js";

describe("PacketTracerAppService", () => {
  test("status combina process + runtime + project", async () => {
    let statusCalls = 0;
    const mockPathResolver = {
      resolve: () => ({ platform: "darwin" as NodeJS.Platform, candidates: [], selected: null, source: "fallback" as const }),
    };
    const mockProcessService = {
      isRunning: async () => true,
      launch: async () => ({ ok: true }),
      closeGraceful: async () => ({ ok: true }),
      closeForce: async () => ({ ok: true }),
    };
    const mockProjectService = {
      status: async () => { statusCalls++; return { ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 3, linkCount: 2 }; },
      save: async () => ({ ok: true, action: "project.save" as const, activeFile: "/tmp/lab.pkt", saved: true }),
    };
    const mockAutosaveService = { createAutosave: async () => ({ ok: true, action: "project.autosave" as const, activeFile: "/tmp/lab.pkt", autosavePath: "/tmp/autosave.pkt", bytes: 1024, sha256: "abc", kept: 20, deletedOld: [] }) };
    const mockBridge = {
      getHeartbeat: () => ({ ts: Date.now() }),
      getHeartbeatHealth: () => ({ state: "ok" as const, ageMs: 500, lastSeenTs: Date.now() }),
    };

    const service = new PacketTracerAppService(
      mockPathResolver as unknown as PacketTracerPathResolver,
      mockProcessService as unknown as PacketTracerProcessService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
      mockBridge as unknown as FileBridgePort,
    );

    const result = await service.status();

    expect(result.process.level).toBe("running");
    expect(result.project.hasActiveFile).toBe(true);
    expect(result.project.activeFile).toBe("/tmp/lab.pkt");
    expect(result.runtime.loaded).toBe(true);
    expect(statusCalls).toBe(1);
  });

  test("close con save+autosave llama ambos servicios", async () => {
    let saveCalls = 0;
    let autosaveCalls = 0;
    const mockPathResolver = { resolve: () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" }) };
    const mockProcessService = { isRunning: async () => false, closeGraceful: async () => ({ ok: true }), closeForce: async () => ({ ok: true }) };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 1, linkCount: 0 }), save: async () => { saveCalls++; return { ok: true, action: "project.save" as const, activeFile: "/tmp/lab.pkt", saved: true }; } };
    const mockAutosaveService = { createAutosave: async () => { autosaveCalls++; return { ok: true, action: "project.autosave" as const, activeFile: "/tmp/lab.pkt", autosavePath: "/tmp/autosave.pkt", bytes: 1024, sha256: "abc", kept: 20, deletedOld: [] }; } };
    const mockBridge = { getHeartbeat: () => null, getHeartbeatHealth: () => ({ state: "missing" as const }) };

    const service = new PacketTracerAppService(
      mockPathResolver as unknown as PacketTracerPathResolver,
      mockProcessService as unknown as PacketTracerProcessService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
      mockBridge as unknown as FileBridgePort,
    );

    await service.close({ save: true, autosave: true });

    expect(saveCalls).toBe(1);
    expect(autosaveCalls).toBe(1);
  });

  test("open retorna error cuando PT no encontrado", async () => {
    const mockPathResolver = { resolve: () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" }) };
    const mockProcessService = { isRunning: async () => false, launch: async () => ({ ok: true }), closeGraceful: async () => ({ ok: true }), closeForce: async () => ({ ok: true }) };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "", savedFilename: "", isSavedToDisk: false, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: null, linkCount: null }), save: async () => ({ ok: true, action: "project.save" as const, activeFile: "", saved: false }) };
    const mockAutosaveService = { createAutosave: async () => ({ ok: true, action: "project.autosave" as const, activeFile: "", autosavePath: "", bytes: 0, sha256: "", kept: 20, deletedOld: [] }) };
    const mockBridge = { getHeartbeat: () => null, getHeartbeatHealth: () => ({ state: "missing" as const }) };

    const service = new PacketTracerAppService(
      mockPathResolver as unknown as PacketTracerPathResolver,
      mockProcessService as unknown as PacketTracerProcessService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
      mockBridge as unknown as FileBridgePort,
    );

    const result = await service.open("/tmp/lab.pkt");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("no encontrado");
  });

  test("wait retorna ok cuando runtime disponible", async () => {
    const mockPathResolver = { resolve: () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" }) };
    const mockProcessService = { isRunning: async () => true, launch: async () => ({ ok: true }), closeGraceful: async () => ({ ok: true }), closeForce: async () => ({ ok: true }) };
    const mockProjectService = { status: async () => ({ ok: true, activeFile: "/tmp/lab.pkt", savedFilename: "/tmp/lab.pkt", isSavedToDisk: true, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: 1, linkCount: 0 }), save: async () => ({ ok: true, action: "project.save" as const, activeFile: "/tmp/lab.pkt", saved: true }) };
    const mockAutosaveService = { createAutosave: async () => ({ ok: true, action: "project.autosave" as const, activeFile: "/tmp/lab.pkt", autosavePath: "", bytes: 0, sha256: "", kept: 20, deletedOld: [] }) };
    let hbCallCount = 0;
    const mockBridge = {
      getHeartbeat: () => ({ ts: Date.now() }),
      getHeartbeatHealth: () => ({ state: (++hbCallCount >= 2 ? "ok" : "stale") as "ok" | "stale", lastSeenTs: Date.now() }),
    };

    const service = new PacketTracerAppService(
      mockPathResolver as unknown as PacketTracerPathResolver,
      mockProcessService as unknown as PacketTracerProcessService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
      mockBridge as unknown as FileBridgePort,
    );

    const result = await service.wait({ runtime: true, timeoutMs: 5000 });
    expect(result.ok).toBe(true);
  }, 10000);

  test("close force usa closeForce sin guardar", async () => {
    let closeForceCalled = false;
    const mockPathResolver = { resolve: () => ({ platform: "darwin", candidates: [], selected: null, source: "fallback" }) };
    const mockProcessService = { isRunning: async () => false, closeGraceful: async () => ({ ok: true }), closeForce: async () => { closeForceCalled = true; return { ok: true }; } };
    const mockProjectService = { status: async () => ({ ok: false, activeFile: "", savedFilename: "", isSavedToDisk: false, isActivityFile: false, defaultSaveLocation: "", tempFileLocation: "", deviceCount: null, linkCount: null }), save: async () => ({ ok: false, action: "project.save" as const, activeFile: "", saved: false }) };
    const mockAutosaveService = { createAutosave: async () => ({ ok: false, action: "project.autosave" as const, activeFile: "", autosavePath: "", bytes: 0, sha256: "", kept: 20, deletedOld: [] }) };
    const mockBridge = { getHeartbeat: () => null, getHeartbeatHealth: () => ({ state: "missing" as const }) };

    const service = new PacketTracerAppService(
      mockPathResolver as unknown as PacketTracerPathResolver,
      mockProcessService as unknown as PacketTracerProcessService,
      mockProjectService as unknown as ProjectService,
      mockAutosaveService as unknown as AutosaveService,
      mockBridge as unknown as FileBridgePort,
    );

    await service.close({ force: true });

    expect(closeForceCalled).toBe(true);
  });
});