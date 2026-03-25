import { test, expect, describe } from 'bun:test';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('Lab Interactive Wizard', () => {
  describe('generarYaml', () => {
    test('debe generar YAML válido con 1 router, 1 switch, 2 PCs', () => {
      const { generarYaml } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      const params = {
        routerCount: 1,
        switchCount: 1,
        pcCount: 2,
        serverCount: 0,
        networkType: 'single_lan' as const,
        routingProtocol: 'static' as const,
        dhcpEnabled: true,
        baseNetwork: '192.168.1.0',
        subnetMask: '255.255.255.0',
      };

      const yaml = generarYaml('test-lab', params);

      expect(yaml).toContain('name: test-lab');
      expect(yaml).toContain('Router1');
      expect(yaml).toContain('Switch1');
      expect(yaml).toContain('PC1');
      expect(yaml).toContain('PC2');
      expect(yaml).toContain('topology:');
      expect(yaml).toContain('devices:');
      expect(yaml).toContain('connections:');
      expect(yaml).toContain('dhcp:');
      expect(yaml).toContain('192.168.1.1');
      expect(yaml).toContain('192.168.1.2');
      expect(yaml).toContain('192.168.1.3');
    });

    test('debe generar YAML con múltiples routers y switches', () => {
      const { generarYaml } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      const params = {
        routerCount: 2,
        switchCount: 2,
        pcCount: 4,
        serverCount: 1,
        networkType: 'multi_lan' as const,
        routingProtocol: 'ospf' as const,
        dhcpEnabled: false,
        vlans: [10, 20],
        baseNetwork: '10.0.0.0',
        subnetMask: '255.255.255.0',
      };

      const yaml = generarYaml('multi-lab', params);

      expect(yaml).toContain('name: multi-lab');
      expect(yaml).toContain('Router1');
      expect(yaml).toContain('Router2');
      expect(yaml).toContain('Switch1');
      expect(yaml).toContain('Switch2');
      expect(yaml).toContain('PC1');
      expect(yaml).toContain('PC2');
      expect(yaml).toContain('PC3');
      expect(yaml).toContain('PC4');
      expect(yaml).toContain('Server1');
      expect(yaml).toContain('VLAN10');
      expect(yaml).toContain('VLAN20');
      expect(yaml).toContain('routingProtocol: ospf');
      expect(yaml).toContain('networkType: multi_lan');
    });

    test('debe generar YAML sin DHCP cuando está deshabilitado', () => {
      const { generarYaml } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      const params = {
        routerCount: 1,
        switchCount: 1,
        pcCount: 2,
        serverCount: 0,
        networkType: 'single_lan' as const,
        routingProtocol: 'none' as const,
        dhcpEnabled: false,
        baseNetwork: '192.168.1.0',
        subnetMask: '255.255.255.0',
      };

      const yaml = generarYaml('no-dhcp-lab', params);

      expect(yaml).toContain('name: no-dhcp-lab');
      expect(yaml).not.toContain('dhcp:');
    });

    test('debe generar IPs secuenciales correctas', () => {
      const { generarYaml } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      const params = {
        routerCount: 1,
        switchCount: 1,
        pcCount: 3,
        serverCount: 0,
        networkType: 'single_lan' as const,
        routingProtocol: 'static' as const,
        dhcpEnabled: false,
        baseNetwork: '10.10.10.0',
        subnetMask: '255.255.255.0',
      };

      const yaml = generarYaml('ip-test', params);

      expect(yaml).toContain('10.10.10.1');
      expect(yaml).toContain('10.10.10.2');
      expect(yaml).toContain('10.10.10.3');
      expect(yaml).toContain('10.10.10.4');
    });
  });

  describe('validarNumero', () => {
    test('debe retornar número válido dentro del rango', () => {
      const { validarNumero } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      expect(validarNumero('5', 1, 10)).toBe(5);
      expect(validarNumero('1', 1, 10)).toBe(1);
      expect(validarNumero('10', 1, 10)).toBe(10);
    });

    test('debe retornar null para número fuera de rango', () => {
      const { validarNumero } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      expect(validarNumero('0', 1, 10)).toBe(null);
      expect(validarNumero('11', 1, 10)).toBe(null);
      expect(validarNumero('-1', 1, 10)).toBe(null);
    });

    test('debe retornar null para entrada no numérica', () => {
      const { validarNumero } = require('../../../apps/cli/src/commands/lab/interactive.ts');
      
      expect(validarNumero('abc', 1, 10)).toBe(null);
      expect(validarNumero('', 1, 10)).toBe(null);
    });
  });
});
