import { expect, test, describe } from 'bun:test';
import { buildVerificationPlan } from '../src/commands/config-ios.js';

describe('Fase 5 config-ios verification plan', () => {
  test('builds interface and vlan plans', () => {
    const plans = buildVerificationPlan(['interface GigabitEthernet0/1', 'vlan 10']);
    expect(new Set(plans.map((plan) => plan.kind))).toEqual(new Set(['interface', 'vlan']));
  });

  test('asserts vlan presence from raw output', () => {
    const plan = buildVerificationPlan(['vlan 10'])[0]!;
    expect(plan.assert('VLAN 10\n', null, ['vlan 10'])).toBe(true);
    expect(plan.assert('VLAN 20\n', null, ['vlan 10'])).toBe(false);
  });

  test('adds routing and acl plans when needed', () => {
    const plans = buildVerificationPlan(['router ospf 1', 'access-list 10 permit any']);
    expect(plans.map((plan) => plan.kind)).toEqual(['routing', 'acl']);
  });
});
