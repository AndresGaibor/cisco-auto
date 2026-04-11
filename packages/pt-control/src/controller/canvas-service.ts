import type { CanvasService } from "../application/services/canvas-service.js";
import type { DevicesInRectResult } from "../contracts/index.js";

export class ControllerCanvasService {
  constructor(private readonly canvasService: CanvasService) {}

  listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    return this.canvasService.listCanvasRects();
  }

  getRect(rectId: string): Promise<unknown> {
    return this.canvasService.getRect(rectId);
  }

  devicesInRect(rectId: string, includeClusters = false): Promise<DevicesInRectResult> {
    return this.canvasService.devicesInRect(rectId, includeClusters);
  }
}
