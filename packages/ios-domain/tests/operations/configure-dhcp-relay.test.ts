import { describe, test, expect } from 'bun:test';
import { CapabilitySet } from '../../src/capabilities/capability-set.js';
import { planConfigureDhcpRelay, type ConfigureDhcpRelayInput } from '../../src/operations/configure-dhcp-relay.js';
import { InterfaceName, Ipv4Address } from '../../src/value-objects/index.js';

describe('planConfigureDhcpRelay', () => {
  const createInput = (overrides?: Partial<ConfigureDhcpRelayInput>): ConfigureDhcpRelayInput => ({
    interface: new InterfaceName('GigabitEthernet0/0'),
    helperAddress: new Ipv4Address('192.168.1.1'),
    ...overrides,
  });

  test('returns null when device does not support DHCP relay', () => {
    // L2 switch has dhcpRelay: false
    const caps = CapabilitySet.l2Switch('2960');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input);

    expect(plan).toBeNull();
  });

  test('returns plan for router device', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input);

    expect(plan).not.toBeNull();
    expect(plan!.operation).toBe('configure-dhcp-relay');
    expect(plan!.target).toBe('GigabitEthernet0/0');
  });

  test('returns plan for L3 switch', () => {
    const caps = CapabilitySet.l3Switch('3750');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input);

    expect(plan).not.toBeNull();
  });

  test('creates plan with interface entry command', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input)!;

    const interfaceStep = plan.steps.find(s => s.command.includes('interface GigabitEthernet0/0'));
    expect(interfaceStep).toBeDefined();
  });

  test('creates plan with ip helper-address command', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input)!;

    const helperStep = plan.steps.find(s => s.command.includes('ip helper-address'));
    expect(helperStep).toBeDefined();
    expect(helperStep!.command).toBe('ip helper-address 192.168.1.1');
  });

  test('adds exit command to return to config mode', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input)!;

    const exitStep = plan.steps[plan.steps.length - 1];
    expect(exitStep.command).toBe('exit');
    expect(exitStep.mode).toBe('config');
  });

  test('plan requires config mode', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input)!;

    expect(plan.requiresConfig).toBe(true);
  });

  test('steps include interface mode entries', () => {
    const caps = CapabilitySet.router('2911');
    const input = createInput();

    const plan = planConfigureDhcpRelay(caps, input)!;

    const configIfSteps = plan.steps.filter(s => s.mode === 'config-if');
    expect(configIfSteps.length).toBeGreaterThan(0);
  });
});

describe('planConfigureDhcpRelay with different interfaces', () => {
  const caps = CapabilitySet.router('2911');

  test('handles FastEthernet interface', () => {
    const input: ConfigureDhcpRelayInput = {
      interface: new InterfaceName('FastEthernet0/1'),
      helperAddress: new Ipv4Address('10.0.0.1'),
    };

    const plan = planConfigureDhcpRelay(caps, input)!;

    expect(plan.target).toBe('FastEthernet0/1');
    const interfaceStep = plan.steps.find(s => s.command.includes('interface FastEthernet0/1'));
    expect(interfaceStep).toBeDefined();
  });

  test('handles subinterface', () => {
    const input: ConfigureDhcpRelayInput = {
      interface: new InterfaceName('GigabitEthernet0/0.100'),
      helperAddress: new Ipv4Address('10.10.10.1'),
    };

    const plan = planConfigureDhcpRelay(caps, input)!;

    expect(plan.target).toBe('GigabitEthernet0/0.100');
  });

  test('handles different DHCP server addresses', () => {
    const input: ConfigureDhcpRelayInput = {
      interface: new InterfaceName('GigabitEthernet0/0'),
      helperAddress: new Ipv4Address('172.16.0.100'),
    };

    const plan = planConfigureDhcpRelay(caps, input)!;

    const helperStep = plan.steps.find(s => s.command.includes('ip helper-address'));
    expect(helperStep!.command).toBe('ip helper-address 172.16.0.100');
  });
});