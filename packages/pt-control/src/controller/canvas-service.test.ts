import { describe, expect, test } from "bun:test";
import { ControllerCanvasService } from "./canvas-service.js";

describe("ControllerCanvasService", () => {
  test("delegates canvas calls", async () => {
    const canvasService = {
      listCanvasRects: async () => ({ rects: ["r1"], count: 1 }),
      getRect: async () => ({ id: "r1" }),
      devicesInRect: async () => ({ rectId: "r1", devices: [] }),
    } as any;

    const service = new ControllerCanvasService(canvasService);

    await expect(service.listCanvasRects()).resolves.toEqual({ rects: ["r1"], count: 1 });
    await expect(service.getRect("r1")).resolves.toEqual({ id: "r1" });
    await expect(service.devicesInRect("r1")).resolves.toEqual({ rectId: "r1", devices: [] });
  });
});
