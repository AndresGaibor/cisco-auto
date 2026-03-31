// ============================================================================
// Canvas/Rect Types - Types for working with canvas rectangles and zones
// ============================================================================

export interface CanvasRectItem {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  devices?: string[];
}

export interface CanvasRect {
  id: string;
  name: string;
  type: "rectangle" | "ellipse" | "polygon";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  itemData?: CanvasRectItem;
}

export interface DevicesInRectResult {
  ok: boolean;
  rectId: string;
  devices: string[];
  count: number;
  clusters?: string[];
}
