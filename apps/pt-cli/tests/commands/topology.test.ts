import { describe, test, expect, mock } from 'bun:test';
import { toLabSpec, snapshotToLabSpec, type ParsedLabYaml } from '../../src/types/lab-spec.types';

describe('topology command utilities', () => {
  describe('toLabSpec', () => {
    test('converts parsed lab to LabSpec with nested lab.topology.devices', () => {
      const parsedLab: ParsedLabYaml = {
        lab: {
          topology: {
            devices: [
              { name: 'R1', type: 'router', model: '2911' },
              { name: 'S1', type: 'switch', model: '2960' },
            ],
          },
        },
      };

      const labSpec = toLabSpec(parsedLab);

      expect(labSpec.devices).toHaveLength(2);
      expect(labSpec.devices[0].name).toBe('R1');
    });

    test('handles lab with connections', () => {
      const parsedLab: ParsedLabYaml = {
        lab: {
          topology: {
            devices: [
              { name: 'R1', type: 'router', model: '2911' },
            ],
            connections: [
              { from: 'R1:Gig0/0', to: 'S1:Gig0/1' },
            ],
          },
        },
      };

      const labSpec = toLabSpec(parsedLab);

      expect(labSpec.devices).toHaveLength(1);
      expect(labSpec.connections).toHaveLength(1);
    });

    test('uses default values for missing metadata', () => {
      const parsedLab: ParsedLabYaml = {};

      const labSpec = toLabSpec(parsedLab);

      expect(labSpec.metadata.name).toBe('Lab');
      expect(labSpec.metadata.version).toBe('1.0');
    });
  });

  describe('snapshotToLabSpec', () => {
    test('converts controller snapshot to LabSpec (snapshot uses object, not array)', () => {
      const snapshot = {
        devices: {
          R1: { id: 'R1', name: 'R1', type: 'router', model: '2911' },
          S1: { id: 'S1', name: 'S1', type: 'switch', model: '2960' },
        },
        links: {
          L1: { id: 'L1', sourceDeviceId: 'R1', sourcePort: 'Gig0/0', targetDeviceId: 'S1', targetPort: 'Gig0/1' },
        },
      };

      const labSpec = snapshotToLabSpec(snapshot as any);

      expect(labSpec.devices).toHaveLength(2);
      expect(labSpec.connections).toHaveLength(1);
    });

    test('handles empty snapshot', () => {
      const snapshot = { devices: {}, links: {} };

      const labSpec = snapshotToLabSpec(snapshot as any);

      expect(labSpec.devices).toHaveLength(0);
      expect(labSpec.connections).toHaveLength(0);
    });

    test('uses default metadata values', () => {
      const snapshot = { devices: {}, links: {} };

      const labSpec = snapshotToLabSpec(snapshot as any);

      expect(labSpec.metadata.name).toBe('Canvas Topology');
      expect(labSpec.metadata.author).toBe('PT CLI');
    });
  });
});