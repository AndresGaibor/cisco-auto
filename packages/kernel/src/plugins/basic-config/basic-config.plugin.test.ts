import { describe, it, expect } from 'bun:test';
import { basicConfigPlugin, validateBasicConfig, generateBasicCommands, verifyShowRunningConfig } from './index.js';

describe('basic-config plugin', () => {
  it('debería tener la estructura correcta del plugin', () => {
    expect(basicConfigPlugin.id).toBe('basic-config');
    expect(basicConfigPlugin.category).toBe('services');
    expect(basicConfigPlugin.commands).toHaveLength(1);
    expect(basicConfigPlugin.commands[0].name).toBe('configure-basic');
  });
});

describe('validateBasicConfig', () => {
  it('debería validar configuración mínima válida', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debería fallar sin hostname', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('debería fallar con hostname inválido (espacios)', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router con espacios',
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0].path).toContain('hostname');
  });

  it('debería validar configuración completa con SSH', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router-Core',
      banner: { motd: 'ACCESO RESTRINGIDO' },
      ssh: { domainName: 'cisco.local', keySize: 2048, version: 2 },
      lines: [
        { type: 'console', loggingSynchronous: true },
        { type: 'vty', transportInput: 'ssh', loginLocal: true, execTimeout: 5 },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('debería fallar con líneas VTY sin autenticación', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
      lines: [{ type: 'vty', transportInput: 'telnet' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('vty_requires_auth');
  });

  it('debería pasar con timezone válido', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
      timezone: { name: 'EST', offset: -5 },
    });
    expect(result.ok).toBe(true);
  });

  it('debería fallar con timezone offset inválido', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
      timezone: { name: 'INVALID', offset: 25 },
    });
    expect(result.ok).toBe(false);
  });

  it('debería validar keySize por defecto (2048)', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
      ssh: { domainName: 'cisco.local' },
    });
    expect(result.ok).toBe(true);
  });

  it('debería validar passwordEncryption y noIpDomainLookup con defaults true', () => {
    const result = validateBasicConfig({
      deviceName: 'R1',
      hostname: 'Router1',
    });
    expect(result.ok).toBe(true);
  });
});

describe('generateBasicCommands', () => {
  it('debería generar hostname', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router-Core',
    });
    expect(commands).toContain('hostname Router-Core');
  });

  it('debería incluir no ip domain-lookup por defecto', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
    });
    expect(commands).toContain('no ip domain-lookup');
  });

  it('debería incluir service password-encryption por defecto', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
    });
    expect(commands).toContain('service password-encryption');
  });

  it('debería incluir logging synchronous por defecto', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
    });
    expect(commands).toContain('logging synchronous');
  });

  it('debería desactivar no ip domain-lookup si se indica', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      noIpDomainLookup: false,
    });
    expect(commands).not.toContain('no ip domain-lookup');
  });

  it('debería generar banner MOTD', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      banner: { motd: 'ACCESO RESTRINGIDO' },
    });
    expect(commands).toContain('banner motd #');
    expect(commands).toContain('ACCESO RESTRINGIDO');
  });

  it('debería generar banner multilínea', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      banner: { motd: 'Línea 1\nLínea 2' },
    });
    expect(commands).toContain('Línea 1');
    expect(commands).toContain('Línea 2');
  });

  it('debería generar configuración SSH', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      ssh: { domainName: 'cisco.local', keySize: 2048, version: 2 },
    });
    expect(commands).toContain('ip domain-name cisco.local');
    expect(commands).toContain('crypto key generate rsa modulus 2048');
    expect(commands).toContain('ip ssh version 2');
    expect(commands).toContain('ip ssh time-out 60');
    expect(commands).toContain('ip ssh authentication-retries 3');
  });

  it('debería generar líneas console con logging synchronous', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      lines: [{ type: 'console', loggingSynchronous: true }],
    });
    expect(commands).toContain('line console 0');
    expect(commands).toContain('logging synchronous');
  });

  it('debería generar líneas vty con SSH y login local', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      lines: [{ type: 'vty', transportInput: 'ssh', loginLocal: true }],
    });
    expect(commands).toContain('line vty 0 15');
    expect(commands).toContain('transport input ssh');
    expect(commands).toContain('login local');
  });

  it('debería generar líneas con password y login', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      lines: [{ type: 'vty', password: 'cisco123' }],
    });
    expect(commands).toContain('password cisco123');
    expect(commands).toContain('login');
  });

  it('debería generar exec-timeout', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      lines: [{ type: 'vty', transportInput: 'ssh', loginLocal: true, execTimeout: 10 }],
    });
    expect(commands).toContain('exec-timeout 10 0');
  });

  it('debería generar timezone', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      timezone: { name: 'EST', offset: -5 },
    });
    expect(commands).toContain('clock timezone EST -5');
  });

  it('debería generar configuración completa', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router-Core',
      banner: { motd: 'ACCESO RESTRINGIDO' },
      ssh: { domainName: 'cisco.local', keySize: 4096, version: 2 },
      lines: [
        { type: 'console', loggingSynchronous: true },
        { type: 'vty', transportInput: 'ssh', loginLocal: true, execTimeout: 5 },
      ],
      timezone: { name: 'EST', offset: -5 },
    });

    expect(commands).toContain('hostname Router-Core');
    expect(commands).toContain('banner motd #');
    expect(commands).toContain('ip domain-name cisco.local');
    expect(commands).toContain('crypto key generate rsa modulus 4096');
    expect(commands).toContain('ip ssh version 2');
    expect(commands).toContain('line vty 0 15');
    expect(commands).toContain('login local');
    expect(commands).toContain('exec-timeout 5 0');
    expect(commands).toContain('clock timezone EST -5');
  });

  it('debería generar keySize 1024 si se especifica', () => {
    const commands = generateBasicCommands({
      deviceName: 'R1',
      hostname: 'Router1',
      ssh: { domainName: 'cisco.local', keySize: 1024, version: 2 },
    });
    expect(commands).toContain('crypto key generate rsa modulus 1024');
  });
});

describe('verifyShowRunningConfig', () => {
  const mockOutput = `hostname Router-Core
no ip domain-lookup
banner motd #
ACCESO RESTRINGIDO
#
ip domain-name cisco.local
crypto key generate rsa modulus 2048
ip ssh version 2`;

  it('debería verificar hostname correcto', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Router-Core',
    });
    expect(result.ok).toBe(true);
  });

  it('debería fallar con hostname incorrecto', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Otro-Router',
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('hostname_not_found');
  });

  it('debería verificar banner configurado', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Router-Core',
      banner: { motd: 'ACCESO RESTRINGIDO' },
    });
    expect(result.ok).toBe(true);
  });

  it('debería verificar SSH domain y version', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Router-Core',
      ssh: { domainName: 'cisco.local', version: 2 },
    });
    expect(result.ok).toBe(true);
  });

  it('debería fallar si falta SSH version', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Router-Core',
      ssh: { domainName: 'cisco.local', version: 1 },
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('ssh_version_not_found');
  });

  it('debería verificar solo hostname sin banner', () => {
    const result = verifyShowRunningConfig(mockOutput, {
      deviceName: 'R1',
      hostname: 'Router-Core',
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
