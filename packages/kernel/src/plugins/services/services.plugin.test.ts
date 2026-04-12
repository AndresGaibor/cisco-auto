import { test, expect, describe } from 'bun:test';
import { servicesPlugin, validateServicesConfig } from './services.plugin.js';
import { generateServicesCommands, verifyShowIpDhcpBinding } from './services.generator.js';
import { servicesSchema } from './services.schema.js';

describe('servicesPlugin', () => {
  test('debe tener metadatos correctos', () => {
    expect(servicesPlugin.id).toBe('services');
    expect(servicesPlugin.category).toBe('services');
    expect(servicesPlugin.name).toBe('Services');
    expect(servicesPlugin.version).toBe('1.0.0');
    expect(servicesPlugin.commands).toHaveLength(1);
    expect(servicesPlugin.commands[0].name).toBe('configure-services');
  });

  test('debe validar configuración válida', () => {
    const result = validateServicesConfig({
      deviceName: 'R1',
      dhcp: [
        {
          name: 'VLAN10_POOL',
          network: '192.168.10.0',
          mask: '255.255.255.0',
          defaultRouter: '192.168.10.1',
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe rechazar configuración con DHCP pool sin nombre', () => {
    const result = validateServicesConfig({
      deviceName: 'R1',
      dhcp: [
        {
          name: '',
          network: '192.168.10.0',
          mask: '255.255.255.0',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].path).toContain('dhcp.0.name');
  });

  test('debe validar esquema con Zod directamente', () => {
    const validConfig = {
      deviceName: 'R1',
      ntp: {
        servers: [{ ip: '0.pool.ntp.org', prefer: true }],
        master: true,
        stratum: 3,
      },
      dns: {
        domainName: 'cisco.local',
        nameServers: ['8.8.8.8'],
      },
    };

    const result = servicesSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  test('debe rechazar IP inválida en esquema', () => {
    const invalidConfig = {
      deviceName: 'R1',
      syslog: {
        servers: [{ ip: 'invalid-ip' }],
      },
    };

    const result = servicesSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});

describe('generateServicesCommands', () => {
  test('debe generar comandos DHCP correctamente', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      dhcp: [
        {
          name: 'VLAN10_POOL',
          network: '192.168.10.0',
          mask: '255.255.255.0',
          defaultRouter: '192.168.10.1',
          dnsServers: ['8.8.8.8', '8.8.4.4'],
          domainName: 'cisco.local',
          excludedAddresses: ['192.168.10.1', '192.168.10.10'],
          lease: 7,
        },
      ],
    });

    expect(commands).toContain('! DHCP Configuration');
    expect(commands).toContain('ip dhcp excluded-address 192.168.10.1');
    expect(commands).toContain('ip dhcp excluded-address 192.168.10.10');
    expect(commands).toContain('ip dhcp pool VLAN10_POOL');
    expect(commands).toContain(' network 192.168.10.0 255.255.255.0');
    expect(commands).toContain(' default-router 192.168.10.1');
    expect(commands).toContain(' dns-server 8.8.8.8 8.8.4.4');
    expect(commands).toContain(' domain-name cisco.local');
    expect(commands).toContain(' lease 7');
    expect(commands).toContain(' exit');
  });

  test('debe generar comandos NTP correctamente', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      ntp: {
        servers: [
          { ip: '0.pool.ntp.org', prefer: true },
          { ip: '1.pool.ntp.org' },
        ],
        master: true,
        stratum: 3,
      },
    });

    expect(commands).toContain('! NTP Configuration');
    expect(commands).toContain('ntp server 0.pool.ntp.org prefer');
    expect(commands).toContain('ntp server 1.pool.ntp.org');
    expect(commands).toContain('ntp master 3');
  });

  test('debe generar comandos DNS correctamente', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      dns: {
        domainName: 'cisco.local',
        nameServers: ['8.8.8.8', '8.8.4.4'],
      },
    });

    expect(commands).toContain('! DNS Configuration');
    expect(commands).toContain('ip domain-name cisco.local');
    expect(commands).toContain('ip name-server 8.8.8.8');
    expect(commands).toContain('ip name-server 8.8.4.4');
  });

  test('debe generar comandos Syslog correctamente', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      syslog: {
        servers: [
          { ip: '192.168.1.100' },
          { ip: '192.168.1.101', severity: 'errors' },
        ],
        trap: 'informational',
      },
    });

    expect(commands).toContain('! Syslog Configuration');
    expect(commands).toContain('logging 192.168.1.100');
    expect(commands).toContain('logging 192.168.1.101');
    expect(commands).toContain('logging trap informational');
  });

  test('debe generar comandos SNMP correctamente', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      snmp: {
        communities: [
          { name: 'public', access: 'ro' },
          { name: 'private', access: 'rw' },
        ],
        hosts: [
          { ip: '192.168.1.100', community: 'public' },
        ],
      },
    });

    expect(commands).toContain('! SNMP Configuration');
    expect(commands).toContain('snmp-server community public ro');
    expect(commands).toContain('snmp-server community private rw');
    expect(commands).toContain('snmp-server host 192.168.1.100 public');
  });

  test('debe generar todos los servicios juntos', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
      dhcp: [
        {
          name: 'POOL',
          network: '192.168.10.0',
          mask: '255.255.255.0',
        },
      ],
      ntp: {
        servers: [{ ip: '0.pool.ntp.org' }],
      },
      dns: {
        domainName: 'cisco.local',
      },
      syslog: {
        servers: [{ ip: '192.168.1.100' }],
      },
      snmp: {
        communities: [{ name: 'public', access: 'ro' }],
      },
    });

    expect(commands).toContain('! DHCP Configuration');
    expect(commands).toContain('! NTP Configuration');
    expect(commands).toContain('! DNS Configuration');
    expect(commands).toContain('! Syslog Configuration');
    expect(commands).toContain('! SNMP Configuration');
  });

  test('debe retornar array vacío si no hay servicios', () => {
    const commands = generateServicesCommands({
      deviceName: 'R1',
    });

    expect(commands).toHaveLength(0);
  });
});

describe('verifyShowIpDhcpBinding', () => {
  test('debe verificar pools DHCP existentes', () => {
    const output = `
Pool 192.168.10.0 - 255.255.255.0
Pool 192.168.20.0 - 255.255.255.0
    `;

    const result = verifyShowIpDhcpBinding(output, {
      deviceName: 'R1',
      dhcp: [
        { name: 'POOL1', network: '192.168.10.0', mask: '255.255.255.0' },
        { name: 'POOL2', network: '192.168.20.0', mask: '255.255.255.0' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe detectar pools DHCP faltantes', () => {
    const output = `
Pool 192.168.10.0 - 255.255.255.0
    `;

    const result = verifyShowIpDhcpBinding(output, {
      deviceName: 'R1',
      dhcp: [
        { name: 'POOL1', network: '192.168.10.0', mask: '255.255.255.0' },
        { name: 'POOL2', network: '192.168.20.0', mask: '255.255.255.0' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('missing_dhcp_pool');
  });
});
