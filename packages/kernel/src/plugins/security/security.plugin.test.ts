import { describe, test, expect } from 'bun:test';
import { securityPlugin, validateSecurityConfig } from './security.plugin.js';
import { generateSecurityCommands, verifyShowAccessLists } from './security.generator.js';
import { securitySchema } from './security.schema.js';

describe('securityPlugin', () => {
  test('debe tener metadata correcta', () => {
    expect(securityPlugin.id).toBe('security');
    expect(securityPlugin.category).toBe('security');
    expect(securityPlugin.name).toBe('Security (ACL/NAT)');
    expect(securityPlugin.version).toBe('1.0.0');
    expect(securityPlugin.commands.length).toBe(1);
  });

  test('debe tener comando configure-security', () => {
    const cmd = securityPlugin.commands[0];
    expect(cmd.name).toBe('configure-security');
    expect(cmd.examples.length).toBe(2);
  });
});

describe('validateSecurityConfig', () => {
  test('debe aceptar configuración válida con ACL extendida', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
              destination: 'any',
              destinationPort: '80',
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe aceptar configuración válida con ACL estándar', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [
            {
              action: 'permit',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe aceptar configuración con NAT estático', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
      natStatic: [
        { localIp: '192.168.1.100', globalIp: '203.0.113.10' },
      ],
      natInsideInterfaces: ['GigabitEthernet0/0'],
      natOutsideInterfaces: ['GigabitEthernet0/1'],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe rechazar configuración vacía', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'empty_security_config')).toBe(true);
  });

  test('debe rechazar ACL estándar con destino', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [
            {
              action: 'permit',
              source: '192.168.1.0',
              destination: '10.0.0.0',
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'standard_acl_with_destination')).toBe(true);
  });

  test('debe rechazar ACL extendida sin protocolo', () => {
    const result = validateSecurityConfig({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              source: '192.168.1.0',
              destination: 'any',
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'extended_acl_missing_protocol')).toBe(true);
  });

  test('debe rechazar esquema inválido (falta deviceName)', () => {
    const result = validateSecurityConfig({
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [
            { action: 'permit', source: 'any' },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
  });
});

describe('generateSecurityCommands', () => {
  test('debe generar comandos ACL estándar', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [
            {
              action: 'permit',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
            },
          ],
        },
      ],
    });

    expect(commands).toContain('access-list 10 permit 192.168.1.0 0.0.0.255');
  });

  test('debe generar comandos ACL extendida', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
              destination: 'any',
              destinationPort: '80',
            },
            {
              action: 'deny',
              protocol: 'ip',
              source: 'any',
              destination: 'any',
            },
          ],
        },
      ],
    });

    expect(commands).toContain('access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80');
    expect(commands).toContain('access-list 100 deny ip any any');
  });

  test('debe generar comandos NAT estático', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      natStatic: [
        { localIp: '192.168.1.100', globalIp: '203.0.113.10' },
      ],
    });

    expect(commands).toContain('ip nat inside source static 192.168.1.100 203.0.113.10');
  });

  test('debe generar comando NAT pool', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      natPool: {
        name: 'POOL1',
        startIp: '203.0.113.10',
        endIp: '203.0.113.20',
        netmask: '255.255.255.0',
      },
    });

    expect(commands).toContain('ip nat pool POOL1 203.0.113.10 203.0.113.20 netmask 255.255.255.0');
  });

  test('debe configurar interfaces NAT inside/outside', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      natStatic: [
        { localIp: '192.168.1.100', globalIp: '203.0.113.10' },
      ],
      natInsideInterfaces: ['GigabitEthernet0/0'],
      natOutsideInterfaces: ['GigabitEthernet0/1'],
    });

    expect(commands).toContain('interface GigabitEthernet0/0');
    expect(commands).toContain('ip nat inside');
    expect(commands).toContain('interface GigabitEthernet0/1');
    expect(commands).toContain('ip nat outside');
  });

  test('debe aplicar ACL a interfaz', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: 'any',
              destination: 'any',
            },
          ],
          appliedOn: 'GigabitEthernet0/0',
          direction: 'in',
        },
      ],
    });

    expect(commands).toContain('interface GigabitEthernet0/0');
    expect(commands).toContain('ip access-group 100 in');
  });

  test('debe generar configuración completa ACL + NAT', () => {
    const commands = generateSecurityCommands({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            {
              action: 'permit',
              protocol: 'tcp',
              source: '192.168.1.0',
              sourceWildcard: '0.0.0.255',
              destination: 'any',
              destinationPort: '443',
            },
          ],
        },
      ],
      natStatic: [
        { localIp: '192.168.1.100', globalIp: '203.0.113.10' },
      ],
      natPool: {
        name: 'POOL1',
        startIp: '203.0.113.20',
        endIp: '203.0.113.30',
        netmask: '255.255.255.0',
      },
    });

    expect(commands.length).toBeGreaterThan(3);
    expect(commands.some(c => c.includes('access-list 100'))).toBe(true);
    expect(commands.some(c => c.includes('ip nat inside source static'))).toBe(true);
    expect(commands.some(c => c.includes('ip nat pool'))).toBe(true);
  });
});

describe('verifyShowAccessLists', () => {
  test('debe validar ACL presente en output', () => {
    const output = `
Extended IP access list 100
    10 permit tcp 192.168.1.0 0.0.0.255 any eq www
    20 deny ip any any
`;

    const result = verifyShowAccessLists(output, {
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            { action: 'permit', protocol: 'tcp', source: '192.168.1.0', sourceWildcard: '0.0.0.255', destination: 'any', destinationPort: '80' },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('debe reportar ACL faltante', () => {
    const output = 'Standard IP access list 10';

    const result = verifyShowAccessLists(output, {
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            { action: 'permit', protocol: 'ip', source: 'any', destination: 'any' },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'missing_acl')).toBe(true);
  });
});

describe('securitySchema', () => {
  test('debe parsear configuración válida', () => {
    const result = securitySchema.safeParse({
      deviceName: 'R1',
      acls: [
        {
          name: '100',
          type: 'extended',
          rules: [
            { action: 'permit', protocol: 'tcp', source: 'any', destination: 'any', destinationPort: '80' },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test('debe rechazar deviceName vacío', () => {
    const result = securitySchema.safeParse({
      deviceName: '',
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [
            { action: 'permit', source: 'any' },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test('debe rechazar ACL sin reglas', () => {
    const result = securitySchema.safeParse({
      deviceName: 'R1',
      acls: [
        {
          name: '10',
          type: 'standard',
          rules: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test('debe rechazar IP inválida en NAT estático', () => {
    const result = securitySchema.safeParse({
      deviceName: 'R1',
      natStatic: [
        { localIp: 'not-an-ip', globalIp: '203.0.113.10' },
      ],
    });

    expect(result.success).toBe(false);
  });
});
