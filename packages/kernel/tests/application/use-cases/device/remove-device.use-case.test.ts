import { describe, expect, test, mock } from 'bun:test';
import { RemoveDeviceUseCase } from '../../../../src/application/use-cases/device/remove-device.use-case.js';
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
  removeDevice: ReturnType<typeof mock>;
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
    removeDevice: mock(async () => {
      if (shouldFail) throw new Error('Backend removeDevice failed');
    }),
  };
}

describe('RemoveDeviceUseCase', () => {
  test('elimina dispositivo existente', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new RemoveDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({ name: 'R1' });

    expect(result.success).toBe(true);
    expect(result.data?.removed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('falla cuando dispositivo no existe', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new RemoveDeviceUseCase(repository, backend);

    const result = await useCase.execute({ name: 'R99' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('propaga error del backend', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);
    const useCase = new RemoveDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({ name: 'R1' });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('elimina dispositivo del repositorio', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new RemoveDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    await useCase.execute({ name: 'R1' });

    const deleted = await repository.findById('R1');
    expect(deleted).toBeNull();
  });
});
