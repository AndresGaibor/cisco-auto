import { test, expect } from 'bun:test';
import { detectOS, detectPacketTracer, isPacketTracerRunning } from './os-detection';

test('detectOS returns valid platform', () => {
  const os = detectOS();
  expect(['macos', 'windows', 'linux']).toContain(os);
});

test('detectPacketTracer returns string or null', async () => {
  const result = await detectPacketTracer();
  // Debe ser null o una cadena con la ruta
  expect(result === null || typeof result === 'string').toBe(true);
  if (result !== null) expect((result as string).length).toBeGreaterThan(0);
});

test('isPacketTracerRunning returns boolean', async () => {
  const running = await isPacketTracerRunning();
  expect(typeof running).toBe('boolean');
});
