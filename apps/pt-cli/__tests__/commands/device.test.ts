import { test, expect } from 'bun:test';
import {
  DEVICE_MODELS,
  filterDevicesByType,
  getIOSCapableDevices,
  formatDevice,
  formatDeviceType,
} from '../../src/utils/device-utils.ts';

test('DEVICE_MODELS contiene modelos para router, switch, pc y server', () => {
  expect(DEVICE_MODELS.router.length).toBeGreaterThan(0);
  expect(DEVICE_MODELS.switch.length).toBeGreaterThan(0);
  expect(DEVICE_MODELS.pc.length).toBeGreaterThan(0);
  expect(DEVICE_MODELS.server.length).toBeGreaterThan(0);
});

test('DEVICE_MODELS router incluye modelos comunes', () => {
  const routerModels = DEVICE_MODELS.router.map((m) => m.name);
  expect(routerModels).toContain('2911');
  expect(routerModels).toContain('1941');
});

test('filterDevicesByType filtra dispositivos por tipo', () => {
  const devices = [
    { name: 'R1', type: 'router' },
    { name: 'S1', type: 'switch' },
    { name: 'PC1', type: 'pc' },
    { name: 'R2', type: 'router' },
  ];

  const routers = filterDevicesByType(devices, 'router');
  expect(routers).toHaveLength(2);
  expect(routers.map((d) => d.name)).toEqual(['R1', 'R2']);

  const switches = filterDevicesByType(devices, 'switch');
  expect(switches).toHaveLength(1);
  expect(switches[0].name).toBe('S1');
});

test('getIOSCapableDevices filtra solo routers y switches', () => {
  const devices = [
    { name: 'R1', type: 'router' },
    { name: 'S1', type: 'switch' },
    { name: 'PC1', type: 'pc' },
    { name: 'SRV1', type: 'server' },
  ];

  const iosDevices = getIOSCapableDevices(devices);
  expect(iosDevices).toHaveLength(2);
  expect(iosDevices.map((d) => d.name)).toEqual(['R1', 'S1']);
});

test('getIOSCapableDevices maneja tipos numericos de PT', () => {
  const devices = [
    { name: 'R1', type: 0 }, // router
    { name: 'S1', type: 1 }, // switch
    { name: 'MLS1', type: 16 }, // multilayer-switch
    { name: 'PC1', type: 'pc' },
  ];

  const iosDevices = getIOSCapableDevices(devices);
  expect(iosDevices).toHaveLength(3);
  expect(iosDevices.map((d) => d.name)).toEqual(['R1', 'S1', 'MLS1']);
});

test('formatDeviceType formatea tipos correctamente', () => {
  expect(formatDeviceType('router')).toBe('Router');
  expect(formatDeviceType('switch')).toBe('Switch');
  expect(formatDeviceType('pc')).toBe('PC');
  expect(formatDeviceType('server')).toBe('Server');
});

test('formatDeviceType maneja tipo desconocido', () => {
  expect(formatDeviceType('unknown')).toBe('Unknown');
});

test('formatDevice formatea informacion del dispositivo', () => {
  const device = {
    name: 'R1',
    type: 'router',
    model: '2911',
    power: true,
    ports: ['GigabitEthernet0/0'],
  };

  const formatted = formatDevice(device as any);
  expect(formatted).toContain('R1');
  expect(formatted).toContain('router');
  expect(formatted).toContain('2911');
  expect(formatted).toContain('ON');
  expect(formatted).toContain('Ports: 1');
});

test('formatDevice maneja dispositivo sin informacion opcional', () => {
  const device = { name: 'R1', type: 'router' };
  const formatted = formatDevice(device as any);
  expect(formatted).toContain('R1');
  expect(formatted).toContain('router');
});
