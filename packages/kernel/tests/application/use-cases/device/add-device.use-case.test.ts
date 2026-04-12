import { describe, expect, test, mock } from 'bun:test';
import { AddDeviceUseCase } from '../../../../src/application/use-cases/device/add-device.use-case.js';
import type { PersistencePort } from '../../../../src/application/ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../src/plugin-api/backend.plugin.js';
import type { DeviceEntity } from '../../../../src/application/use-cases/types.js';

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
  removeDevice: ReturnType<typeof mock>;
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
    addDevice: mock(async (name: string, model: string, options?: { x?: number; y?: number }) => {
      if (shouldFail) throw new Error('Backend addDevice failed');
      return { name, model, ...options };
    }),
    removeDevice: mock(async () => {}),
    configureDevice: mock(async () => ({ results: [] })),
  };
}

describe('AddDeviceUseCase', () => {
  test('agrega dispositivo cuando nombre es unico', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new AddDeviceUseCase(repository, backend);

    const result = await useCase.execute({
      name: 'R1',
      model: '2911',
      type: 'router',
      x: 100,
      y: 200,
    });

    expect(result.success).toBe(true);
    expect(result.data?.device.name).toBe('R1');
    expect(result.data?.device.model).toBe('2911');
    expect(result.errors).toHaveLength(0);
  });

  test('rechaza dispositivo con nombre duplicado', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new AddDeviceUseCase(repository, backend);

    await useCase.execute({ name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({ name: 'R1', model: '4321', type: 'router' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rechaza nombre vacio', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new AddDeviceUseCase(repository, backend);

    const result = await useCase.execute({ name: '', model: '2911', type: 'router' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('rechaza modelo vacio', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new AddDeviceUseCase(repository, backend);

    const result = await useCase.execute({ name: 'R1', model: '', type: 'router' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('propaga error del backend', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);
    const useCase = new AddDeviceUseCase(repository, backend);

    const result = await useCase.execute({ name: 'R1', model: '2911', type: 'router' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('guarda dispositivo en repositorio', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new AddDeviceUseCase(repository, backend);

    await useCase.execute({ name: 'R1', model: '2911', type: 'router' });

    const saved = await repository.findById('R1');
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe('R1');
  });
});
