import { describe, expect, test } from "bun:test";
import { ProjectService } from "./project-service.js";

function createBridge(responses: Record<string, unknown>) {
  const calls: Array<{ type: string; payload: unknown; timeoutMs?: number }> = [];
  return {
    calls,
    bridge: {
      sendCommandAndWait: async (type: string, payload: unknown, timeoutMs?: number) => {
        calls.push({ type, payload, timeoutMs });
        return { ok: true, value: responses[type] };
      },
    },
  };
}

describe("ProjectService", () => {
  test("status llama __projectStatus y normaliza parsed", async () => {
    const { bridge, calls } = createBridge({
      __projectStatus: {
        parsed: {
          ok: true,
          activeFile: "/tmp/taller.pkt",
          savedFilename: "/tmp/taller.pkt",
          isSavedToDisk: true,
          isActivityFile: false,
          defaultSaveLocation: "/default",
          tempFileLocation: "/tmp",
          deviceCount: 5,
          linkCount: 10,
          activeFileClass: "NetworkFile",
          networkDescription: "Test",
        },
      },
    });
    const service = new ProjectService(bridge as any);
    const status = await service.status();
    expect(calls[0]?.type).toBe("__projectStatus");
    expect(status.activeFile).toBe("/tmp/taller.pkt");
    expect(status.deviceCount).toBe(5);
    expect(status.linkCount).toBe(10);
    expect(status.isSavedToDisk).toBe(true);
  });

  test("save llama __projectSave y devuelve result normalizado", async () => {
    const { bridge, calls } = createBridge({
      __projectSave: {
        parsed: { ok: true, saved: true, before: "/tmp/test.pkt", after: "/tmp/test.pkt" },
      },
    });
    const service = new ProjectService(bridge as any);
    const result = await service.save();
    expect(calls[0]?.type).toBe("__projectSave");
    expect(result.action).toBe("project.save");
    expect(result.saved).toBe(true);
    expect(result.before).toBe("/tmp/test.pkt");
    expect(result.after).toBe("/tmp/test.pkt");
  });

  test("snapshotBegin usa __projectSnapshotBegin con chunkSize", async () => {
    const { bridge, calls } = createBridge({
      __projectSnapshotBegin: {
        parsed: { ok: true, snapshotId: "snap_1", savedFilename: "/tmp/test.pkt", length: 1000, chunkSize: 4096 },
      },
    });
    const service = new ProjectService(bridge as any);
    const result = await service.snapshotBegin(4096);
    expect(calls[0]?.type).toBe("__projectSnapshotBegin");
    expect((calls[0]?.payload as any).chunkSize).toBe(4096);
    expect(result.snapshotId).toBe("snap_1");
    expect(result.length).toBe(1000);
  });

  test("snapshotRead usa __projectSnapshotRead con offset y limit", async () => {
    const { bridge, calls } = createBridge({
      __projectSnapshotRead: {
        parsed: { ok: true, snapshotId: "snap_1", offset: 0, nextOffset: 100, eof: false, bytes: [1, 2, 3] },
      },
    });
    const service = new ProjectService(bridge as any);
    const result = await service.snapshotRead("snap_1", 0, 100);
    expect(calls[0]?.type).toBe("__projectSnapshotRead");
    expect((calls[0]?.payload as any).snapshotId).toBe("snap_1");
    expect((calls[0]?.payload as any).offset).toBe(0);
    expect((calls[0]?.payload as any).limit).toBe(100);
    expect(result.bytes).toEqual([1, 2, 3]);
  });

  test("snapshotClear llama __projectSnapshotClear", async () => {
    const { bridge, calls } = createBridge({
      __projectSnapshotClear: { parsed: { ok: true, snapshotId: "snap_1" } },
    });
    const service = new ProjectService(bridge as any);
    await service.snapshotClear("snap_1");
    expect(calls[0]?.type).toBe("__projectSnapshotClear");
    expect((calls[0]?.payload as any).snapshotId).toBe("snap_1");
  });
});