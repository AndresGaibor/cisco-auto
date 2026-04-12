import { describe, expect, test } from 'bun:test';
import { configOrchestratorPlugin, validateDeviceConfigSpec } from './orchestrator.plugin.js';
import {
  orchestrateConfig,
  verifyOrchestratedConfig,
  generateSviCommands,
  SECTION_ORDER,
} from './orchestrator.generator.js';
import { deviceConfigSpecSchema, sviSchema, type DeviceConfigSpecInput } from './orchestrator.schema.js';

describe('config orchestrator plugin', () => {
  test('exposes the expected metadata', () => {
    expect(configOrchestratorPlugin.id).toBe('config-orchestrator');
    expect(configOrchestratorPlugin.name).toBe('Configuración Orquestada');
    expect(configOrchestratorPlugin.category).toBe('services');
    expect(configOrchestratorPlugin.version).toBe('1.0.0');
    expect(configOrchestratorPlugin.description).toContain('Orquesta');
  });

  test('has exactly one command', () => {
    expect(configOrchestratorPlugin.commands).toHaveLength(1);
    expect(configOrchestratorPlugin.commands[0].name).toBe('configure-device');
  });

  test('command has examples', () => {
    const cmd = configOrchestratorPlugin.commands[0];
    expect(cmd.examples.length).toBeGreaterThan(0);
    expect(cmd.examples[0].description).toContain('Switch L3');
  });

  test('validate returns ok for minimal valid config', () => {
    const result = validateDeviceConfigSpec({ deviceName: 'R1' });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validate returns errors for invalid schema', () => {
    const result = validateDeviceConfigSpec({ deviceName: '' });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path.includes('deviceName'))).toBe(true);
  });

  test('validate rejects empty vlan list when vlan section is provided', () => {
    const result = validateDeviceConfigSpec({
      deviceName: 'SW1',
      vlan: { vlans: [] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'empty_vlan_list')).toBe(true);
  });

  test('validate rejects empty svi list when svi section is provided', () => {
    const result = validateDeviceConfigSpec({
      deviceName: 'SW1',
      svi: { svis: [] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'empty_svi_list')).toBe(true);
  });
});

describe('orchestrator schema', () => {
  test('accepts minimal config with only deviceName', () => {
    const config = deviceConfigSpecSchema.parse({ deviceName: 'R1' });
    expect(config.deviceName).toBe('R1');
    expect(config.basic).toBeUndefined();
    expect(config.vlan).toBeUndefined();
  });

  test('accepts full config with all sections', () => {
    const config = deviceConfigSpecSchema.parse({
      deviceName: 'SW1',
      basic: { hostname: 'Switch-Core', ssh: { domainName: 'cisco.local' } },
      vlan: { vlans: [{ id: 10, name: 'ADMIN' }] },
      svi: { svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }] },
      stp: { mode: 'rapid-pvst' },
      vtp: { mode: 'server', domain: 'CISCO' },
      routing: { staticRoutes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.254' }] },
      security: { acls: [{ name: 'FILTER', type: 'extended', rules: [{ action: 'permit', protocol: 'ip', source: 'any', destination: 'any' }] }] },
      services: { dhcp: [{ name: 'LAN', network: '192.168.10.0', mask: '255.255.255.0' }] },
    });
    expect(config.deviceName).toBe('SW1');
    expect(config.basic?.hostname).toBe('Switch-Core');
    expect(config.vlan?.vlans).toHaveLength(1);
    expect(config.svi?.svis).toHaveLength(1);
    expect(config.stp?.mode).toBe('rapid-pvst');
  });

  test('rejects invalid VLAN ID', () => {
    expect(() =>
      deviceConfigSpecSchema.parse({
        deviceName: 'SW1',
        vlan: { vlans: [{ id: 5000, name: 'BAD' }] },
      })
    ).toThrow();
  });
});

describe('svi schema', () => {
  test('accepts valid SVI config', () => {
    const config = sviSchema.parse({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });
    expect(config.svis[0].vlanId).toBe(10);
    expect(config.svis[0].ipAddress).toBe('192.168.10.1');
  });

  test('rejects invalid VLAN ID in SVI', () => {
    expect(() =>
      sviSchema.parse({
        deviceName: 'SW1',
        svis: [{ vlanId: 0, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
      })
    ).toThrow();
  });
});

describe('generateSviCommands', () => {
  test('generates correct SVI commands', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }],
    });
    expect(commands).toEqual([
      'interface Vlan10',
      ' ip address 192.168.10.1 255.255.255.0',
      ' no shutdown',
      ' exit',
    ]);
  });

  test('generates SVI with description', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [{ vlanId: 20, ipAddress: '10.0.20.1', subnetMask: '255.255.255.0', description: 'VLAN USERS' }],
    });
    expect(commands).toContain(' description VLAN USERS');
  });

  test('generates multiple SVI commands', () => {
    const commands = generateSviCommands({
      deviceName: 'SW1',
      svis: [
        { vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' },
        { vlanId: 20, ipAddress: '192.168.20.1', subnetMask: '255.255.255.0' },
      ],
    });
    expect(commands.filter((c) => c.startsWith('interface Vlan'))).toHaveLength(2);
  });

  test('rejects invalid SVI config', () => {
    expect(() =>
      generateSviCommands({
        deviceName: 'SW1',
        svis: [{ vlanId: 9999, ipAddress: 'bad', subnetMask: 'bad' }],
      })
    ).toThrow();
  });
});

describe('SECTION_ORDER', () => {
  test('has correct number of sections', () => {
    expect(SECTION_ORDER).toHaveLength(9);
  });

  test('basic comes before vlan', () => {
    expect(SECTION_ORDER.indexOf('basic')).toBeLessThan(SECTION_ORDER.indexOf('vlan'));
  });

  test('vlan comes before svi', () => {
    expect(SECTION_ORDER.indexOf('vlan')).toBeLessThan(SECTION_ORDER.indexOf('svi'));
  });

  test('svi comes before routing', () => {
    expect(SECTION_ORDER.indexOf('svi')).toBeLessThan(SECTION_ORDER.indexOf('routing'));
  });

  test('stp comes before etherchannel', () => {
    expect(SECTION_ORDER.indexOf('stp')).toBeLessThan(SECTION_ORDER.indexOf('etherchannel'));
  });
});

describe('orchestrateConfig', () => {
  test('orchestrates basic config only', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'R1',
      basic: { hostname: 'Router1' },
    });
    expect(commands).toContain('hostname Router1');
  });

  test('orchestrates vlan config only', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'SW1',
      vlan: { vlans: [{ id: 10, name: 'ADMIN' }] },
    });
    expect(commands).toContain('vlan 10');
    expect(commands).toContain('name ADMIN');
  });

  test('orchestrates full switch L3 config', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'SW1',
      basic: { hostname: 'Switch-Core', ssh: { domainName: 'cisco.local' } },
      vlan: { vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }] },
      svi: { svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }] },
      stp: { mode: 'rapid-pvst', priority: 4096 },
    });

    expect(commands).toContain('hostname Switch-Core');
    expect(commands).toContain('vlan 10');
    expect(commands).toContain('vlan 20');
    expect(commands).toContain('interface Vlan10');
    expect(commands).toContain('spanning-tree mode rapid-pvst');
    expect(commands).toContain(' ip address 192.168.10.1 255.255.255.0');
  });

  test('orchestrates with routing section', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'R1',
      routing: {
        staticRoutes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '192.168.1.254' }],
      },
    });
    expect(commands.some((c) => c.includes('ip route 0.0.0.0'))).toBe(true);
  });

  test('orchestrates with security section', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'R1',
      security: {
        acls: [{
          name: 'BLOCK',
          type: 'standard',
          rules: [{ action: 'deny', source: '10.0.0.0', sourceWildcard: '0.255.255.255' }],
        }],
      },
    });
    expect(commands.some((c) => c.includes('access-list BLOCK'))).toBe(true);
  });

  test('orchestrates with services section', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'R1',
      services: {
        dhcp: [{ name: 'OFFICE', network: '192.168.1.0', mask: '255.255.255.0' }],
        ntp: { servers: [{ ip: '10.0.0.1' }] },
      },
    });
    expect(commands.some((c) => c.includes('ip dhcp pool OFFICE'))).toBe(true);
    expect(commands.some((c) => c.includes('ntp server 10.0.0.1'))).toBe(true);
  });

  test('orchestrates with VTP section', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'SW1',
      vtp: { mode: 'server', domain: 'CISCO' },
    });
    expect(commands).toContain('vtp mode server');
    expect(commands).toContain('vtp domain CISCO');
  });

  test('orchestrates with EtherChannel section', async () => {
    const commands = await orchestrateConfig({
      deviceName: 'SW1',
      etherchannel: {
        groupId: 1,
        mode: 'active',
        interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
        portChannel: 'Port-channel1',
      },
    });
    expect(commands.some((c) => c.includes('channel-group 1 mode active'))).toBe(true);
    expect(commands).toContain('interface Port-channel1');
  });

  test('returns empty array for minimal config', async () => {
    const commands = await orchestrateConfig({ deviceName: 'R1' });
    expect(commands).toEqual([]);
  });

  test('orchestrates all sections in correct order', async () => {
    const spec: DeviceConfigSpecInput = {
      deviceName: 'SW1',
      basic: { hostname: 'SW-CORE' },
      vlan: { vlans: [{ id: 10, name: 'MGMT' }] },
      vtp: { mode: 'server' },
      stp: { mode: 'rapid-pvst' },
      etherchannel: {
        groupId: 1,
        mode: 'on',
        interfaces: ['Gi0/1'],
        portChannel: 'Port-channel1',
      },
      svi: { svis: [{ vlanId: 10, ipAddress: '10.0.10.1', subnetMask: '255.255.255.0' }] },
      routing: { staticRoutes: [{ network: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.0.10.254' }] },
      security: { acls: [{ name: 'TEST', type: 'standard', rules: [{ action: 'permit', source: 'any' }] }] },
      services: { ntp: { servers: [{ ip: '10.0.0.1' }] } },
    };

    const commands = await orchestrateConfig(spec);
    const fullConfig = commands.join('\n');

    const sectionPositions = {
      basic: fullConfig.indexOf('hostname SW-CORE'),
      vlan: fullConfig.indexOf('vlan 10'),
      vtp: fullConfig.indexOf('vtp mode'),
      stp: fullConfig.indexOf('spanning-tree mode'),
      etherchannel: fullConfig.indexOf('channel-group'),
      svi: fullConfig.indexOf('interface Vlan'),
      routing: fullConfig.indexOf('ip route'),
      security: fullConfig.indexOf('access-list TEST'),
      services: fullConfig.indexOf('ntp server'),
    };

    for (let i = 0; i < SECTION_ORDER.length - 1; i++) {
      const current = SECTION_ORDER[i];
      const next = SECTION_ORDER[i + 1];
      if (sectionPositions[current as keyof typeof sectionPositions] >= 0 &&
          sectionPositions[next as keyof typeof sectionPositions] >= 0) {
        expect(sectionPositions[current as keyof typeof sectionPositions]).toBeLessThan(
          sectionPositions[next as keyof typeof sectionPositions]
        );
      }
    }
  });
});

describe('verifyOrchestratedConfig', () => {
  test('returns ok for matching hostname', () => {
    const output = 'hostname Router1\nno ip domain-lookup';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'R1',
      basic: { hostname: 'Router1' },
    });
    expect(result.ok).toBe(true);
  });

  test('returns error for missing hostname', () => {
    const output = 'no ip domain-lookup';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'R1',
      basic: { hostname: 'Router1' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'hostname_not_found')).toBe(true);
  });

  test('returns ok for matching VLANs', () => {
    const output = 'vlan 10\n name ADMIN\nexit\nvlan 20\n name USERS\nexit';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      vlan: { vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }] },
    });
    expect(result.ok).toBe(true);
  });

  test('returns error for missing VLAN', () => {
    const output = 'vlan 10\n name ADMIN\nexit';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      vlan: { vlans: [{ id: 10 }, { id: 20 }] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'vlan_not_found')).toBe(true);
  });

  test('returns ok for matching SVI', () => {
    const output = 'interface Vlan10\n ip address 192.168.10.1 255.255.255.0';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      svi: { svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }] },
    });
    expect(result.ok).toBe(true);
  });

  test('returns ok for matching STP mode', () => {
    const output = 'spanning-tree mode rapid-pvst';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      stp: { mode: 'rapid-pvst' },
    });
    expect(result.ok).toBe(true);
  });

  test('returns error for missing STP mode', () => {
    const output = 'spanning-tree mode pvst';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      stp: { mode: 'rapid-pvst' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'stp_mode_not_found')).toBe(true);
  });

  test('returns ok for matching VTP mode', () => {
    const output = 'vtp mode server\nvtp domain CISCO';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      vtp: { mode: 'server', domain: 'CISCO' },
    });
    expect(result.ok).toBe(true);
  });

  test('returns ok for matching DHCP pool', () => {
    const output = 'ip dhcp pool LAN\n network 192.168.1.0 255.255.255.0';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'R1',
      services: { dhcp: [{ name: 'LAN', network: '192.168.1.0', mask: '255.255.255.0' }] },
    });
    expect(result.ok).toBe(true);
  });

  test('returns error for missing DHCP pool', () => {
    const output = '';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'R1',
      services: { dhcp: [{ name: 'LAN', network: '192.168.1.0', mask: '255.255.255.0' }] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'dhcp_pool_not_found')).toBe(true);
  });

  test('returns ok for matching NTP server', () => {
    const output = 'ntp server 10.0.0.1';
    const result = verifyOrchestratedConfig(output, {
      deviceName: 'R1',
      services: { ntp: { servers: [{ ip: '10.0.0.1' }] } },
    });
    expect(result.ok).toBe(true);
  });

  test('returns ok for full config verification', () => {
    const output = [
      'hostname SW-CORE',
      'no ip domain-lookup',
      'vlan 10',
      ' name ADMIN',
      'exit',
      'vtp mode server',
      'spanning-tree mode rapid-pvst',
      'interface Vlan10',
      ' ip address 192.168.10.1 255.255.255.0',
      'exit',
    ].join('\n');

    const result = verifyOrchestratedConfig(output, {
      deviceName: 'SW1',
      basic: { hostname: 'SW-CORE' },
      vlan: { vlans: [{ id: 10, name: 'ADMIN' }] },
      vtp: { mode: 'server' },
      stp: { mode: 'rapid-pvst' },
      svi: { svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }] },
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
