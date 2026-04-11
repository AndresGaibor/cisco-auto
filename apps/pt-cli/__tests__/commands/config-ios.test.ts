import { test, expect } from 'bun:test';
import { buildVerificationPlan } from '../../src/commands/config-ios.ts';

test('buildVerificationPlan detecta comandos VLAN', () => {
  const plans = buildVerificationPlan(['vlan 10', 'vlan 20']);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('vlan');
  expect(plans[0].verifyCommand).toBe('show vlan brief');
});

test('buildVerificationPlan detecta comandos de interfaz', () => {
  const plans = buildVerificationPlan([
    'interface GigabitEthernet0/0',
    'ip address 192.168.1.1 255.255.255.0',
  ]);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('interface');
  expect(plans[0].verifyCommand).toBe('show ip interface brief');
});

test('buildVerificationPlan detecta comandos de routing OSPF', () => {
  const plans = buildVerificationPlan(['router ospf 1', 'network 192.168.1.0 0.0.0.255 area 0']);

  expect(plans.some((p) => p.kind === 'routing')).toBe(true);
  const routingPlan = plans.find((p) => p.kind === 'routing');
  expect(routingPlan?.verifyCommand).toBe('show ip route');
});

test('buildVerificationPlan detecta comandos EIGRP', () => {
  const plans = buildVerificationPlan(['router eigrp 100', 'network 10.0.0.0 0.0.0.255']);

  expect(plans.some((p) => p.kind === 'routing')).toBe(true);
});

test('buildVerificationPlan detecta static route', () => {
  const plans = buildVerificationPlan(['ip route 0.0.0.0 0.0.0.0 192.168.1.254']);

  expect(plans.some((p) => p.kind === 'routing')).toBe(true);
});

test('buildVerificationPlan detecta ACLs', () => {
  const plans = buildVerificationPlan(['access-list 1 permit any']);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('acl');
  expect(plans[0].verifyCommand).toBe('show access-lists');
});

test('buildVerificationPlan detecta STP', () => {
  const plans = buildVerificationPlan(['spanning-tree mode pvst']);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('stp');
  expect(plans[0].verifyCommand).toBe('show spanning-tree');
});

test('buildVerificationPlan detecta EtherChannel via etherchannel keyword', () => {
  const plans = buildVerificationPlan(['etherchannel group']);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('etherchannel');
  expect(plans[0].verifyCommand).toBe('show etherchannel summary');
});

test('buildVerificationPlan detecta EtherChannel via port-channel keyword', () => {
  const plans = buildVerificationPlan(['port-channel interface']);

  expect(plans).toHaveLength(1);
  expect(plans[0].kind).toBe('etherchannel');
  expect(plans[0].verifyCommand).toBe('show etherchannel summary');
});

test('buildVerificationPlan ignora comandos sin verificacion', () => {
  const plans = buildVerificationPlan(['show version', 'show interfaces']);

  expect(plans).toHaveLength(0);
});

test('buildVerificationPlan deduplica comandos repetidos', () => {
  const plans = buildVerificationPlan(['vlan 10', 'vlan 10', 'vlan 20']);

  expect(plans).toHaveLength(1);
});
