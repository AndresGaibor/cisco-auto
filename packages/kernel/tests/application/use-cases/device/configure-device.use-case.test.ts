import { describe, expect, test, mock } from 'bun:test';
import { ConfigureDeviceUseCase } from '../../../../src/application/use-cases/device/configure-device.use-case.js';
import type { PersistencePort } from '../../../../src/application/ports/driven/persistence.port.js';
import type { BackendPlugin } from '../../../../src/plugin-api/backend.plugin.js';
import type { DeviceEntity, CommandResult } from '../../../../src/application/use-cases/types.js';

function createMockRepository(): PersistencePort<DeviceEntity> {
  const store = new Map<string, DeviceEntity>();

  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (entity: DeviceEntity) => { store.set(entity.id, entity); }),
    delete: mock(async (id: string) => { store.delete(id); }),
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
    configureDevice: mock(async (name: string, commands: string[]) => {
      if (shouldFail) throw new Error('Backend configureDevice failed');
      return {
        results: commands.map(cmd => ({ command: cmd, output: 'ok', success: true })),
      };
    }),
  };
}

describe('ConfigureDeviceUseCase', () => {
  test('ejecuta comandos en dispositivo existente', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new ConfigureDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({
      deviceName: 'R1',
      commands: ['hostname R1', 'interface Gig0/0', 'ip address 192.168.1.1 255.255.255.0'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.executed).toBe(3);
    expect(result.data?.results).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  test('falla cuando dispositivo no existe', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new ConfigureDeviceUseCase(repository, backend);

    const result = await useCase.execute({
      deviceName: 'R99',
      commands: ['hostname R99'],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('falla cuando lista de comandos esta vacia', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin();
    const useCase = new ConfigureDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({
      deviceName: 'R1',
      commands: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('propaga error del backend', async () => {
    const repository = createMockRepository();
    const backend = createMockBackendPlugin(true);
    const useCase = new ConfigureDeviceUseCase(repository, backend);

    await repository.save({ id: 'R1', name: 'R1', model: '2911', type: 'router' });

    const result = await useCase.execute({
      deviceName: 'R1',
      commands: ['hostname R1'],
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
