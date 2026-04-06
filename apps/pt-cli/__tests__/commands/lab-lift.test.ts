import { test, expect } from 'bun:test';
import { buildScenarioPlan } from '../../src/commands/lab/lift.ts';

test('lab lift genera la topología solicitada', () => {
  const plan = buildScenarioPlan();

  expect(plan.devices).toHaveLength(10);
  expect(plan.links).toHaveLength(9);
  expect(plan.devices.map((device: { name: string }) => device.name)).toEqual([
    'CORE3650',
    'SW1',
    'SW2',
    'SW3',
    'SW4',
    'PC1',
    'PC2',
    'PC3',
    'PC4',
    'SRV1',
  ]);
  expect(plan.notes.length).toBeGreaterThan(0);
});
