import { test, expect } from 'bun:test';
import { generatePtsTemplate } from '../pts-template-generator';

test('generatePtsTemplate returns a .pts string containing topology and bootstrap', () => {
  const topology = {
    id: 't-1',
    name: 'test-topo',
    devices: [],
    links: [],
    params: { routerCount: 0, switchCount: 0, pcCount: 0, networkType: 'single_lan' }
  } as any;

  const pts = generatePtsTemplate(topology);

  expect(typeof pts).toBe('string');
  // Debe contener la variable TOPLOGY y el bootstrap HTTP polling
  expect(pts).toContain('const TOPLOGY =');
  expect(pts).toMatch(/127\.0\.0\.1:\d{2,5}\/next/);
  expect(pts).toContain('XMLHttpRequest');
  expect(pts).toContain('setInterval');
});
