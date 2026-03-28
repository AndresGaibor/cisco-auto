import { describe, expect, test } from 'bun:test';
import { queryTopology } from './query';

describe('queryTopology', () => {
  const topology = {
    devices: {
      R1: {
        name: 'R1',
        type: 'router',
        ip: '10.0.0.1',
        ports: [{ name: 'GigabitEthernet0/0' }, { name: 'GigabitEthernet0/1' }],
      },
      S1: {
        name: 'S1',
        type: 'switch',
        ip: '10.0.0.2',
        ports: [{ name: 'FastEthernet0/1' }],
      },
    },
    links: {
      'R1-S1': {
        from: 'R1',
        to: 'S1',
        fromPort: 'GigabitEthernet0/0',
        toPort: 'FastEthernet0/1',
        cableType: 'straight-through',
      },
    },
  };

  test('resuelve una consulta de dispositivo', () => {
    const result = queryTopology({ type: 'device', name: 'R1' }, topology);

    expect(result.found).toBe(true);
    expect(result.device).toEqual({
      name: 'R1',
      type: 'router',
      ip: '10.0.0.1',
      ports: ['GigabitEthernet0/0', 'GigabitEthernet0/1'],
    });
  });

  test('resuelve una consulta de enlace entre dos dispositivos', () => {
    const result = queryTopology({ type: 'link', between: ['R1', 'S1'] }, topology);

    expect(result.found).toBe(true);
    expect(result.links).toEqual([
      {
        from: 'R1',
        to: 'S1',
        fromPort: 'GigabitEthernet0/0',
        toPort: 'FastEthernet0/1',
        cableType: 'straight-through',
      },
    ]);
  });

  test('resuelve una consulta completa filtrando por tipo de dispositivo', () => {
    const result = queryTopology(
      {
        type: 'full',
        options: {
          deviceType: 'router',
          includeIPs: false,
          includePorts: false,
          includeCableTypes: false,
        },
      },
      topology,
    );

    expect(result.found).toBe(true);
    expect(result.devices).toEqual([
      {
        name: 'R1',
        type: 'router',
      },
    ]);
    expect(result.links).toEqual([
      {
        from: 'R1',
        to: 'S1',
        fromPort: 'GigabitEthernet0/0',
        toPort: 'FastEthernet0/1',
      },
    ]);
  });

  test('devuelve found=false cuando no hay coincidencia', () => {
    const result = queryTopology({ type: 'device', name: 'X1' }, topology);

    expect(result.found).toBe(false);
  });
});
