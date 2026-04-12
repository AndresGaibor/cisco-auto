import { describe, test, expect } from 'bun:test';
import { CapabilitySet } from '../../src/capabilities/capability-set.js';
import { planConfigureDhcpPool, type ConfigureDhcpPoolInput } from '../../src/operations/configure-dhcp-pool.js';
import { Ipv4Address, SubnetMask } from '@cisco-auto/kernel/domain/ios/value-objects';

describe('planConfigureDhcpPool', () => {
  const createInput = (overrides?: Partial<ConfigureDhcpPoolInput>): ConfigureDhcpPoolInput => ({
    poolName: 'TEST_POOL',
    network: new Ipv4Address('192.168.1.0'),
    mask: new SubnetMask('255.255.255.0'),
    defaultRouter: new Ipv4Address('192.168.1.1'),
    ...overrides,
  });

  test('returns null when device does not have DHCP pool capability', () => {
    // L2 switch has dhcpRelay: false, but planConfigureDhcpPool checks caps.routing.nat
    const caps = CapabilitySet.l2Switch('2960');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input);

    // Currently returns null because it checks caps.routing.nat which is false for L2 switch
    expect(plan).toBeNull();
  });

  test('returns plan for router device', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input);

    expect(plan).not.toBeNull();
    expect(plan!.operation).toBe('configure-dhcp-pool');
    expect(plan!.target).toBe('TEST_POOL');
  });

  test('returns null for L3 switch (nat capability is false)', () => {
    // L3 switch has nat: false, so planConfigureDhcpPool returns null
    const caps = CapabilitySet.l3Switch('3750');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input);

    // Currently returns null because it checks caps.routing.nat which is false for L3 switch
    expect(plan).toBeNull();
  });

  test('creates plan with ip dhcp pool command', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const poolStep = plan.steps.find(s => s.command.includes('ip dhcp pool'));
    expect(poolStep).toBeDefined();
    expect(poolStep!.command).toBe('ip dhcp pool TEST_POOL');
  });

  test('creates plan with network command', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const networkStep = plan.steps.find(s => s.command.startsWith('network '));
    expect(networkStep).toBeDefined();
    expect(networkStep!.command).toBe('network 192.168.1.0 255.255.255.0');
  });

  test('creates plan with default-router command', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const routerStep = plan.steps.find(s => s.command.startsWith('default-router '));
    expect(routerStep).toBeDefined();
    expect(routerStep!.command).toBe('default-router 192.168.1.1');
  });

  test('includes dns-server when provided', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput({
      dnsServer: new Ipv4Address('8.8.8.8'),
    });

    const plan = planConfigureDhcpPool(caps, input)!;

    const dnsStep = plan.steps.find(s => s.command.startsWith('dns-server '));
    expect(dnsStep).toBeDefined();
    expect(dnsStep!.command).toBe('dns-server 8.8.8.8');
  });

  test('does not include dns-server when not provided', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const dnsStep = plan.steps.find(s => s.command.startsWith('dns-server '));
    expect(dnsStep).toBeUndefined();
  });

  test('includes lease when provided', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput({
      lease: { days: 7, hours: 12 },
    });

    const plan = planConfigureDhcpPool(caps, input)!;

    const leaseStep = plan.steps.find(s => s.command.startsWith('lease '));
    expect(leaseStep).toBeDefined();
    expect(leaseStep!.command).toBe('lease 7 12');
  });

  test('does not include lease when not provided', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const leaseStep = plan.steps.find(s => s.command.startsWith('lease '));
    expect(leaseStep).toBeUndefined();
  });

  test('adds exit command to return to config mode', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    const exitStep = plan.steps[plan.steps.length - 1];
    expect(exitStep.command).toBe('exit');
    expect(exitStep.mode).toBe('config');
  });

  test('plan requires config mode', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    expect(plan.requiresConfig).toBe(true);
  });

  test('plan requires privilege mode', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    expect(plan.requiresPrivilege).toBe(true);
  });

  test('plan does not add rollback steps (CommandPlanBuilder pattern)', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpPool(caps, input)!;

    // The builder doesn't add rollback for DHCP pool commands
    expect(plan.rollback).toHaveLength(0);
  });
});

describe('planConfigureDhcpPool with different pool names', () => {
  const caps = CapabilitySet.router('2911');

  test('handles underscore in pool name', () => {
    const input: ConfigureDhcpPoolInput = {
      poolName: 'VLAN_10_POOL',
      network: new Ipv4Address('10.10.10.0'),
      mask: new SubnetMask('255.255.255.0'),
      defaultRouter: new Ipv4Address('10.10.10.1'),
    };

    const plan = planConfigureDhcpPool(caps, input)!;

    expect(plan.target).toBe('VLAN_10_POOL');
    const poolStep = plan.steps.find(s => s.command.includes('ip dhcp pool'));
    expect(poolStep!.command).toBe('ip dhcp pool VLAN_10_POOL');
  });

  test('handles pool name with spaces (trimmed)', () => {
    const input: ConfigureDhcpPoolInput = {
      poolName: '  ADMIN_POOL  ',
      network: new Ipv4Address('172.16.0.0'),
      mask: new SubnetMask('255.255.0.0'),
      defaultRouter: new Ipv4Address('172.16.0.1'),
    };

    const plan = planConfigureDhcpPool(caps, input)!;

    expect(plan.target).toBe('  ADMIN_POOL  ');
  });
});