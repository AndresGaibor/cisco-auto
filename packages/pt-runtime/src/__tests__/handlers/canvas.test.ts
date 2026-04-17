import { expect, test, describe } from "bun:test";
import { handleListCanvasRects, handleGetRect, handleDevicesInRect } from "../../handlers/canvas";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(lw: any, net: any): HandlerDeps {
  return {
    ipc: {} as never,
    getLW: () => lw,
    getNet: () => net,
    getFM: () => ({} as never),
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => null,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 0,
  } as HandlerDeps;
}

describe("Canvas handlers", () => {
  test("handleListCanvasRects returns empty when no getCanvasRectIds", () => {
    const lw = {};
    const result = handleListCanvasRects({ type: "listCanvasRects" }, createDeps(lw, {}));
    expect(result.ok).toBe(true);
    expect((result as any).rects).toEqual([]);
    expect((result as any).count).toBe(0);
  });

  test("handleListCanvasRects returns rect IDs when available", () => {
    const lw = { getCanvasRectIds: () => ["rect1", "rect2"] };
    const result = handleListCanvasRects({ type: "listCanvasRects" }, createDeps(lw, {}));
    expect(result.ok).toBe(true);
    expect((result as any).rects).toEqual(["rect1", "rect2"]);
    expect((result as any).count).toBe(2);
  });

  test("handleGetRect returns error when rect not found", () => {
    const lw = {};
    const result = handleGetRect({ type: "getRect", rectId: "MISSING" }, createDeps(lw, {}));
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("RECT_NOT_FOUND");
  });

  test("handleGetRect returns data when rect exists", () => {
    const lw = { getRectItemData: () => ({ x: 100, y: 200, width: 300, height: 150 }) };
    const result = handleGetRect({ type: "getRect", rectId: "rect1" }, createDeps(lw, {}));
    expect(result.ok).toBe(true);
    expect((result as any).rectId).toBe("rect1");
    expect((result as any).data).toEqual({ x: 100, y: 200, width: 300, height: 150 });
  });

  test("handleDevicesInRect returns empty when no devicesAt", () => {
    const lw = { getRectItemData: () => ({ x: 0, y: 0, width: 100, height: 100 }) };
    const net = { getDeviceCount: () => 0 };
    const result = handleDevicesInRect({ type: "devicesInRect", rectId: "rect1" }, createDeps(lw, net));
    expect(result.ok).toBe(true);
    expect((result as any).devices).toEqual([]);
    expect((result as any).count).toBe(0);
  });
});
