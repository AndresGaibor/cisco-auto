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
    const { value } = await this.bridge.sendCommandAndWait<{ rects: string[]; count: number }>({
      type: "listCanvasRects",
      id: this.generateId(),
    });

    return value ?? { rects: [], count: 0 };
  }

  /**
   * Get devices located within a canvas rectangle zone
   */
  async devicesInRect(
    rectId: string,
    includeClusters = false
  ): Promise<DevicesInRectResult> {
    const { value } = await this.bridge.sendCommandAndWait<DevicesInRectResult>({
      type: "devicesInRect",
      id: this.generateId(),
      rectId,
      includeClusters,
    });

    return value ?? { ok: false, rectId, devices: [], count: 0 };
  }

  /**
   * Get detailed data for a specific canvas rectangle
   */
  async getRect(rectId: string): Promise<GetRectResult> {
    const { value } = await this.bridge.sendCommandAndWait<GetRectResult>({
      type: "getRect",
      id: this.generateId(),
      rectId,
    });

    return value ?? { ok: false, rectId, error: "Rect not found" };
  }
}
