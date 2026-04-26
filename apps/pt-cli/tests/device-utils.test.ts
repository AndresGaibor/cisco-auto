import { describe, expect, test, vi } from 'bun:test';

import {
  DeviceAlreadyExistsError,
  DeviceNotFoundError,
  getDeviceByName,
  requireDeviceExists,
  validateDeviceNameNotExists,
} from '../src/utils/device-utils.js';

describe('device utils', () => {
  test('requireDeviceExists devuelve el dispositivo cuando existe', async () => {
    const controller = {
      listDevices: vi.fn().mockResolvedValue([
        { name: 'R1', type: 'router', model: '2911', x: 10, y: 20 },
      ]),
    };

    const device = await requireDeviceExists(controller as never, 'R1');

    expect(device.name).toBe('R1');
  });

  test('requireDeviceExists lanza DeviceNotFoundError con contexto', async () => {
    const controller = {
      listDevices: vi.fn().mockResolvedValue([
        { name: 'FIE', type: 'switch', model: '2960-24TT', x: 1, y: 2 },
        { name: 'SW Core', type: 'switch', model: '3560', x: 3, y: 4 },
      ]),
    };

    await expect(requireDeviceExists(controller as never, 'R99')).rejects.toBeInstanceOf(DeviceNotFoundError);

    try {
      await requireDeviceExists(controller as never, 'R99');
    } catch (error) {
      expect(error).toBeInstanceOf(DeviceNotFoundError);
      const deviceError = error as DeviceNotFoundError;
      expect(deviceError.code).toBe('DEVICE_NOT_FOUND');
      expect(deviceError.toDetails()).toMatchObject({
        requested: 'R99',
        count: 2,
      });
      expect(deviceError.toAdvice()).toContain('Ejecuta bun run pt device list --json para ver los nombres exactos.');
    }
  });

  test('validateDeviceNameNotExists lanza DeviceAlreadyExistsError', async () => {
    const controller = {
      listDevices: vi.fn().mockResolvedValue([
        { name: 'R1', type: 'router', model: '2911', x: 10, y: 20 },
      ]),
    };

    await expect(validateDeviceNameNotExists(controller as never, 'R1')).rejects.toBeInstanceOf(DeviceAlreadyExistsError);
  });

  test('getDeviceByName no oculta errores de listado', async () => {
    const controller = {
      listDevices: vi.fn().mockRejectedValue(new Error('bridge offline')),
    };

    await expect(getDeviceByName(controller as never, 'R1')).rejects.toThrow('bridge offline');
  });
});
