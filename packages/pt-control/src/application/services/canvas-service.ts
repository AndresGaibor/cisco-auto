// ============================================================================
// CanvasService - Canvas rectangle operations
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { DevicesInRectResult, GetRectResult } from "../../contracts/index.js";

export class CanvasService {
  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string
  ) {}

  /**
   * List all canvas rectangle IDs (colored zones)
   */
  async listCanvasRects(): Promise<{ rects: string[]; count: number }> {
    const result = await this.bridge.sendCommandAndWait<{ rects: string[]; count: number }>(
      "listCanvasRects",
      {
        id: this.generateId(),
      },
    );

    return result.value ?? { rects: [], count: 0 };
  }

  /**
   * Get devices located within a canvas rectangle zone
   */
  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    const result = await this.bridge.sendCommandAndWait<DevicesInRectResult>(
      "devicesInRect",
      {
        id: this.generateId(),
        rectId,
        includeClusters,
      },
    );

    return result.value ?? { ok: false, rectId, devices: [], count: 0 };
  }

  /**
   * Get detailed data for a specific canvas rectangle
   */
  async getRect(rectId: string): Promise<GetRectResult> {
    const result = await this.bridge.sendCommandAndWait<GetRectResult>(
      "getRect",
      {
        id: this.generateId(),
        rectId,
      },
    );

    return result.value ?? { ok: false, rectId, error: "Rect not found" };
  }
}
