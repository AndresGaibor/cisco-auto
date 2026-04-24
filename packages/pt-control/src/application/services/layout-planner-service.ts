import type { LayoutPlan, LayoutRelation, LayoutSuggestion, LogicalPlacement, TopologySnapshot } from "../../contracts/index.js";

export interface LayoutPlacementIntent {
  device: string;
  anchorDevice?: string;
  relation?: LayoutRelation;
  gap?: number;
  zoneId?: string;
}

export interface LayoutGridIntent {
  devices: string[];
  columns?: number;
  gap?: number;
  startX?: number;
  startY?: number;
}

export interface LayoutZoneIntent {
  zoneId: string;
  devices: string[];
}

function getDevices(snapshot: TopologySnapshot): Array<{ name: string; placement: LogicalPlacement; zones: string[] }> {
  return Object.values(snapshot.devices ?? {}).map((device: any) => ({
    name: String(device?.name ?? device?.id ?? 'unknown'),
    placement: device?.logicalPosition,
    zones: Array.isArray(device?.logicalPosition?.zoneIds) ? [...device.logicalPosition.zoneIds] : [],
  }));
}

function getDevice(snapshot: TopologySnapshot, deviceName: string): any | undefined {
  return (snapshot.devices as Record<string, any> | undefined)?.[deviceName]
    ?? Object.values(snapshot.devices ?? {}).find((device: any) => device?.name === deviceName || device?.id === deviceName);
}

function toSuggestion(device: string, x: number, y: number, relation?: LayoutRelation, anchor?: string, zoneIds: string[] = [], reasoning: string[] = []): LayoutSuggestion {
  return { device, x, y, relation, anchor, zoneIds, reasoning };
}

function relationOffset(relation: LayoutRelation, gap: number): { dx: number; dy: number } {
  switch (relation) {
    case 'left-of':
      return { dx: -gap, dy: 0 };
    case 'above':
      return { dx: 0, dy: -gap };
    case 'below':
      return { dx: 0, dy: gap };
    case 'align-horizontal':
      return { dx: gap, dy: 0 };
    case 'align-vertical':
      return { dx: 0, dy: gap };
    case 'grid':
      return { dx: gap, dy: gap };
    case 'stack':
      return { dx: 0, dy: gap };
    case 'right-of':
    default:
      return { dx: gap, dy: 0 };
  }
}

function buildPlan(suggestions: LayoutSuggestion[], warnings: string[] = []): LayoutPlan {
  return { suggestions, warnings };
}

export class LayoutPlannerService {
  /**
   * Sugiere una nueva posición para un dispositivo basada en una relación con otro dispositivo.
   * @param snapshot - Snapshot de topología actual
   * @param intent - Intent con el dispositivo a mover y su relación
   * @returns Plan de layout con la sugerencia de posición
   */
  suggestPlacement(snapshot: TopologySnapshot, intent: LayoutPlacementIntent): LayoutPlan {
    const device = getDevice(snapshot, intent.device);
    if (!device) {
      return buildPlan([], [`Dispositivo '${intent.device}' no encontrado.`]);
    }

    const gap = intent.gap ?? 160;
    const relation = intent.relation ?? 'right-of';
    const anchor = intent.anchorDevice ? getDevice(snapshot, intent.anchorDevice) : undefined;
    const baseX = anchor?.logicalPosition?.centerX ?? device.logicalPosition.centerX;
    const baseY = anchor?.logicalPosition?.centerY ?? device.logicalPosition.centerY;
    const { dx, dy } = relationOffset(relation, gap);
    const zoneIds = Array.isArray(device.logicalPosition.zoneIds) ? [...device.logicalPosition.zoneIds] : [];
    if (intent.zoneId && !zoneIds.includes(intent.zoneId)) {
      zoneIds.push(intent.zoneId);
    }

    const reasoning = [
      anchor ? `Anchor: ${anchor.name ?? intent.anchorDevice}` : 'No anchor provided; using device current position.',
      `Relation: ${relation}`,
      `Gap: ${gap}px`,
    ];

    return buildPlan([
      toSuggestion(
        intent.device,
        baseX + dx,
        baseY + dy,
        relation,
        intent.anchorDevice,
        zoneIds,
        reasoning,
      ),
    ]);
  }

  /**
   * Alinea múltiples dispositivos en una línea horizontal o vertical.
   * @param snapshot - Snapshot de topología actual
   * @param devices - Lista de nombres de dispositivos a alinear
   * @param orientation - Orientación de la alineación ('horizontal' o 'vertical')
   * @param gap - Espacio entre dispositivos en píxeles
   * @returns Plan de layout con posiciones alineadas
   */
  alignDevices(snapshot: TopologySnapshot, devices: string[], orientation: 'horizontal' | 'vertical' = 'horizontal', gap = 160): LayoutPlan {
    const resolved = devices.map((deviceName) => getDevice(snapshot, deviceName)).filter(Boolean);
    if (resolved.length === 0) {
      return buildPlan([], ['No devices matched the alignment request.']);
    }

    const anchor = resolved[0];
    const anchorX = anchor.logicalPosition.centerX;
    const anchorY = anchor.logicalPosition.centerY;
    const suggestions = resolved.map((device: any, index) => {
      const offset = index === 0 ? 0 : gap * index;
      return toSuggestion(
        device.name ?? device.id,
        orientation === 'horizontal' ? anchorX + offset : anchorX,
        orientation === 'horizontal' ? anchorY : anchorY + offset,
        orientation === 'horizontal' ? 'align-horizontal' : 'align-vertical',
        anchor.name ?? anchor.id,
        Array.isArray(device.logicalPosition?.zoneIds) ? [...device.logicalPosition.zoneIds] : [],
        [
          `Aligned ${orientation} relative to ${anchor.name ?? anchor.id}`,
          `Index ${index + 1}/${resolved.length}`,
        ],
      );
    });

    return buildPlan(suggestions);
  }

  /**
   * Coloca dispositivos en una grilla rectangular.
   * @param snapshot - Snapshot de topología actual
   * @param intent - Intent con dispositivos y parámetros de grilla
   * @returns Plan de layout con posiciones en grilla
   */
  gridDevices(snapshot: TopologySnapshot, intent: LayoutGridIntent): LayoutPlan {
    const devices = intent.devices.map((deviceName) => getDevice(snapshot, deviceName)).filter(Boolean);
    if (devices.length === 0) {
      return buildPlan([], ['No devices matched the grid request.']);
    }

    const columns = Math.max(1, intent.columns ?? 3);
    const gap = intent.gap ?? 180;
    const startX = intent.startX ?? devices[0].logicalPosition.centerX;
    const startY = intent.startY ?? devices[0].logicalPosition.centerY;

    const suggestions = devices.map((device: any, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      return toSuggestion(
        device.name ?? device.id,
        startX + column * gap,
        startY + row * gap,
        'grid',
        undefined,
        Array.isArray(device.logicalPosition?.zoneIds) ? [...device.logicalPosition.zoneIds] : [],
        [`Grid cell row ${row + 1}, column ${column + 1}`],
      );
    });

    return buildPlan(suggestions);
  }

  /**
   * Asigna dispositivos a una zona específica.
   * @param snapshot - Snapshot de topología actual
   * @param intent - Intent con zona y dispositivos a asignar
   * @returns Plan de layout con dispositivos asignados a la zona
   */
  assignZone(snapshot: TopologySnapshot, intent: LayoutZoneIntent): LayoutPlan {
    const devices = intent.devices.map((deviceName) => getDevice(snapshot, deviceName)).filter(Boolean);
    if (devices.length === 0) {
      return buildPlan([], ['No devices matched the zone assignment request.']);
    }

    const suggestions = devices.map((device: any) => {
      const zoneIds = Array.isArray(device.logicalPosition?.zoneIds) ? [...device.logicalPosition.zoneIds] : [];
      if (!zoneIds.includes(intent.zoneId)) zoneIds.push(intent.zoneId);
      return toSuggestion(
        device.name ?? device.id,
        device.logicalPosition.centerX,
        device.logicalPosition.centerY,
        'stack',
        undefined,
        zoneIds,
        [`Assign to zone ${intent.zoneId}`],
      );
    });

    return buildPlan(suggestions);
  }
}
