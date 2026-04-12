import { describe, expect, test, mock } from 'bun:test';
import { ApplyVlanUseCase } from '../../../../src/application/use-cases/vlan/apply-vlan.use-case.js';
import type { PersistencePort } from '../../../../src/application/ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../src/plugin-api/backend.plugin.js';
import type { ProtocolPlugin } from '../../../../src/plugin-api/protocol.plugin.js';
import type { PluginRegistry } from '../../../../src/plugin-api/registry.js';
import type { DeviceEntity, VlanEntry } from '../../../../src/application/use-cases/types.js';

function createMockRepository(): PersistencePort<DeviceEntity> {
  const store = new Map<string, DeviceEntity>();

  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (entity: DeviceEntity) => { store.set(entity.id, entity); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function createMockVlanPlugin(): ProtocolPlugin {
  return {
    id: 'vlan',
    category: 'switching',
    name: 'VLAN',
    version: '1.0.0',
    description: 'VLAN plugin',
    commands: [],
    validate: mock(() => ({ ok: true, errors: [] })),
  };
}

function createMockBackendPlugin(shouldFail = false): BackendPlugin & {
  configureDevice: ReturnType<typeof mock>;
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
    configureDevice: mock(async () => {
      if (shouldFail) throw new Error('Backend configureDevice failed');
      return { results: [] };
    }),
  };
}

function createMockRegistry(vlanPlugin?: ProtocolPlugin | null): PluginRegistry {
  const plugins = new Map<string, ProtocolPlugin>();
  if (vlanPlugin) {
    plugins.set('vlan', vlanPlugin);
  }

  return {
    register: mock(() => {}),
    get: mock((kind: string, id: string) => {
      if (kind === 'protocol') return plugins.get(id);
      return undefined;
    }),
    list: mock((kind: string) => {
      if (kind === 'protocol') return [...plugins.values()];
      return [];
    }),
  };
}

describe('ApplyVlanUseCase', () => {
  test('aplica VLANs a switch existente', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10, 20, 30],
      vlanNames: { 10: 'ADMIN', 20: 'USERS', 30: 'GUEST' },
    });

    expect(result.success).toBe(true);
    expect(result.data?.vlans).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  test('falla cuando switch no existe', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    const result = await useCase.execute({
      switchName: 'SW99',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando plugin VLAN no esta registrado', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const registry = createMockRegistry(null);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando lista de VLANs esta vacia', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando backend falla', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('genera entradas VLAN con nombres', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const vlanPlugin = createMockVlanPlugin();
    const registry = createMockRegistry(vlanPlugin);
    const useCase = new ApplyVlanUseCase(repository, backend, registry);

    await repository.save({ id: 'SW1', name: 'SW1', model: '2960', type: 'switch' });

    const result = await useCase.execute({
      switchName: 'SW1',
      vlanIds: [10, 20],
      vlanNames: { 10: 'ADMIN', 20: 'USERS' },
    });

    expect(result.success).toBe(true);
    expect(result.data?.vlans[0].id).toBe(10);
    expect(result.data?.vlans[0].name).toBe('ADMIN');
    expect(result.data?.vlans[1].id).toBe(20);
    expect(result.data?.vlans[1].name).toBe('USERS');
  });
});
