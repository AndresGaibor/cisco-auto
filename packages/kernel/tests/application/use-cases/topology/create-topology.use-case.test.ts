import { describe, expect, test, mock } from 'bun:test';
import { CreateTopologyUseCase } from '../../../../src/application/use-cases/topology/create-topology.use-case.js';
import type { PersistencePort } from '../../../../src/application/ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../src/plugin-api/backend.plugin.js';
import type { DeviceEntity, DeviceInput, LinkInput } from '../../../../src/application/use-cases/types.js';

function createMockRepository(): PersistencePort<DeviceEntity> {
  const store = new Map<string, DeviceEntity>();

  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (entity: DeviceEntity) => { store.set(entity.id, entity); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function createMockBackendPlugin(shouldFail = false): BackendPlugin & {
  addDevice: ReturnType<typeof mock>;
  addLink: ReturnType<typeof mock>;
} {
  return {
    id: 'packet-tracer',
    category: 'backend',
    name: 'Mock PT',
    version: '1.0.0',
    validate: mock(() => ({ ok: true, errors: [] })),
    connect: mock(async () => {}),
    disconnect: mock(async () => {}),
    isConnected: mock(() => true),
    addDevice: mock(async (name: string, model: string, options?: { x?: number; y?: number }) => {
      if (shouldFail) throw new Error('Backend addDevice failed');
      return { name, model, ...options };
    }),
    addLink: mock(async (d1: string, p1: string, d2: string, p2: string) => {
      if (shouldFail) throw new Error('Backend addLink failed');
      return { from: d1, to: d2, port1: p1, port2: p2 };
    }),
  };
}

describe('CreateTopologyUseCase', () => {
  test('crea topologia con dispositivos y enlaces', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router', x: 100, y: 100 },
      { name: 'SW1', model: '2960', type: 'switch', x: 300, y: 100 },
    ];
    const links: LinkInput[] = [
      { device1: 'R1', port1: 'Gig0/0', device2: 'SW1', port2: 'Gig0/1' },
    ];

    const result = await useCase.execute({ devices, links });

    expect(result.success).toBe(true);
    expect(result.data?.topology.nodes.size).toBe(2);
    expect(result.data?.topology.edges).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  test('crea topologia sin enlaces', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router' },
    ];

    const result = await useCase.execute({ devices, links: [] });

    expect(result.success).toBe(true);
    expect(result.data?.topology.nodes.size).toBe(1);
    expect(result.data?.topology.edges).toHaveLength(0);
  });

  test('falla cuando lista de dispositivos esta vacia', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new CreateTopologyUseCase(repository, backend);

    const result = await useCase.execute({ devices: [], links: [] });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando backend falla al agregar dispositivo', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router' },
    ];

    const result = await useCase.execute({ devices, links: [] });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando backend falla al agregar enlace', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(false);
    backend.addLink = mock(async () => {
      throw new Error('addLink failed');
    });
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router' },
      { name: 'SW1', model: '2960', type: 'switch' },
    ];
    const links: LinkInput[] = [
      { device1: 'R1', port1: 'Gig0/0', device2: 'SW1', port2: 'Gig0/1' },
    ];

    const result = await useCase.execute({ devices, links });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('guarda dispositivos en repositorio', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router' },
    ];

    await useCase.execute({ devices, links: [] });

    const saved = await repository.findById('R1');
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe('R1');
  });

  test('valida invariantes - enlace referencia dispositivo inexistente', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new CreateTopologyUseCase(repository, backend);

    const devices: DeviceInput[] = [
      { name: 'R1', model: '2911', type: 'router' },
    ];
    const links: LinkInput[] = [
      { device1: 'R1', port1: 'Gig0/0', device2: 'R99', port2: 'Gig0/1' },
    ];

    const result = await useCase.execute({ devices, links });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
