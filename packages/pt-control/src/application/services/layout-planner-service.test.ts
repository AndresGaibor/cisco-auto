import { describe, expect, test } from 'bun:test';
import { LayoutPlannerService } from './layout-planner-service.js';

function createSnapshot() {
  return {
    devices: {
      R1: {
        name: 'R1',
        logicalPosition: { x: 100, y: 100, centerX: 120, centerY: 120, zoneIds: ['Z1'] },
      },
      S1: {
        name: 'S1',
        logicalPosition: { x: 300, y: 120, centerX: 320, centerY: 140, zoneIds: [] },
      },
      PC1: {
        name: 'PC1',
        logicalPosition: { x: 500, y: 200, centerX: 520, centerY: 220, zoneIds: [] },
      },
      PC2: {
        name: 'PC2',
        logicalPosition: { x: 700, y: 260, centerX: 720, centerY: 280, zoneIds: [] },
      },
    },
    links: {},
  } as any;
}

describe('LayoutPlannerService', () => {
  test('suggestPlacement places a device relative to an anchor', () => {
    const service = new LayoutPlannerService();
    const result = service.suggestPlacement(createSnapshot(), {
      device: 'S1',
      anchorDevice: 'R1',
      relation: 'right-of',
      gap: 80,
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.device).toBe('S1');
    expect(result.suggestions[0]?.x).toBe(200);
    expect(result.suggestions[0]?.y).toBe(120);
  });

  test('gridDevices creates a grid layout plan', () => {
    const service = new LayoutPlannerService();
    const result = service.gridDevices(createSnapshot(), {
      devices: ['PC1', 'PC2'],
      columns: 2,
      gap: 100,
      startX: 10,
      startY: 20,
    });

    expect(result.suggestions.map((item) => item.device)).toEqual(['PC1', 'PC2']);
    expect(result.suggestions[1]?.x).toBe(110);
    expect(result.suggestions[1]?.y).toBe(20);
  });
});
