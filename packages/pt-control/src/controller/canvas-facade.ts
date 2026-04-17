import type { DevicesInRectResult } from "../contracts/index.js";

export class CanvasFacade {
  constructor(private readonly canvasService: any) {}

  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasService.listCanvasRects();
  }

  async getRect(rectId: string): Promise<unknown> {
    return this.canvasService.getRect(rectId);
  }

  async devicesInRect(rectId: string, includeClusters = false): Promise<DevicesInRectResult> {
    return this.canvasService.devicesInRect(rectId, includeClusters);
  }
}
