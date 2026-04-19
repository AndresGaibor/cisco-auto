// ============================================================================
// CanvasService - Canvas rectangle operations
// ============================================================================

import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { DevicesInRectResult, GetRectResult } from "../../contracts/index.js";

export class CanvasService {
  constructor(
    private readonly primitivePort: RuntimePrimitivePort,
    private generateId: () => string,
  ) {}

  /**
   * List all canvas rectangle IDs (colored zones)
   */
  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    const result = await this.primitivePort.runPrimitive("canvas.listRects", {
      id: this.generateId(),
    });

    return result.value as { rects: string[]; count: number } ?? { rects: [], count: 0 };
  }

  /**
   * Get devices located within a canvas rectangle zone
   */
  async devicesInRect(
    rectId: string,
    includeClusters = false,
  ): Promise<DevicesInRectResult> {
    const result = await this.primitivePort.runPrimitive("canvas.devicesInRect", {
      id: this.generateId(),
      rectId,
      includeClusters,
    });

    return result.value as DevicesInRectResult ?? { ok: false, rectId, devices: [], count: 0 };
  }

  /**
   * Get detailed data for a specific canvas rectangle
   */
  async getRect(rectId: string): Promise<GetRectResult> {
    const result = await this.primitivePort.runPrimitive("canvas.getRect", {
      id: this.generateId(),
      rectId,
    });

    return result.value as GetRectResult ?? { ok: false, rectId, error: "Rect not found" };
  }
}
