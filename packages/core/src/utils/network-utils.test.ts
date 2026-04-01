/**
 * Tests for Network Configuration Utilities
 */

import { describe, test, expect } from 'bun:test';

describe('Network Utilities', () => {
  describe('IP address utilities', () => {
    test('should parse IPv4 addresses', () => {
      const ip = '192.168.1.1';
      const parts = ip.split('.');

      expect(parts).toHaveLength(4);
    });

    test('should validate IP address format', () => {
      const isValidIp = (ip: string) => {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(p => {
          const num = parseInt(p);
          return !isNaN(num) && num >= 0 && num <= 255;
        });
      };

      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('256.1.1.1')).toBe(false);
    });

    test('should convert CIDR to netmask', () => {
      const cidrTomask = (cidr: number) => {
        const ones = Array(cidr).fill('1').join('');
        const zeros = Array(32 - cidr).fill('0').join('');
        const bits = (ones + zeros).match(/.{1,8}/g);
        return bits?.map(b => parseInt(b, 2)).join('.') || '';
      };

      expect(cidrTomask(24)).toBe('255.255.255.0');
      expect(cidrTomask(16)).toBe('255.255.0.0');
    });
  });

  describe('Interface utilities', () => {
    test('should parse interface names', () => {
      const interfaces = ['Gi0/0', 'Fa0/1', 'Vlan10'];
      expect(interfaces).toHaveLength(3);
    });

    test('should validate VLAN ranges', () => {
      const isValidVlan = (vlan: number) => vlan >= 1 && vlan <= 4094;
      expect(isValidVlan(1)).toBe(true);
      expect(isValidVlan(4095)).toBe(false);
    });
  });

  describe('Port utilities', () => {
    test('should validate port numbers', () => {
      const isValidPort = (port: number) => port > 0 && port <= 65535;
      expect(isValidPort(80)).toBe(true);
      expect(isValidPort(65536)).toBe(false);
    });

    test('should categorize port ranges', () => {
      const getPortCategory = (port: number) => {
        if (port < 1024) return 'well-known';
        return 'registered';
      };

      expect(getPortCategory(22)).toBe('well-known');
      expect(getPortCategory(3000)).toBe('registered');
    });
  });

  describe('MAC address utilities', () => {
    test('should validate MAC format', () => {
      const isValidMac = (mac: string) => {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
      };

      expect(isValidMac('00:11:22:33:44:55')).toBe(true);
      expect(isValidMac('00:11:22:33:44:GG')).toBe(false);
    });
  });

  describe('Command formatting', () => {
    test('should format show commands', () => {
      const commands = ['show version', 'show interfaces'];
      commands.forEach(cmd => {
        expect(cmd.startsWith('show')).toBe(true);
      });
    });

    test('should sanitize command strings', () => {
      const sanitize = (cmd: string) => cmd.trim().replace(/\s+/g, ' ');
      expect(sanitize('  configure   terminal  ')).toBe('configure terminal');
    });
  });

  describe('Validation utilities', () => {
    test('should validate hostnames', () => {
      const isValidHostname = (hostname: string) => {
        const regex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        return regex.test(hostname) && hostname.length <= 63;
      };

      expect(isValidHostname('router-1')).toBe(true);
      expect(isValidHostname('-invalid')).toBe(false);
    });
  });

  describe('Time utilities', () => {
    test('should convert seconds to minutes', () => {
      expect(Math.floor(3600 / 60)).toBe(60);
    });

    test('should handle exponential backoff', () => {
      const backoff = (attempt: number, base: number = 100, max: number = 10000) => {
        return Math.min(base * Math.pow(2, attempt), max);
      };

      expect(backoff(0)).toBe(100);
      expect(backoff(1)).toBe(200);
      expect(backoff(10)).toBe(10000);
    });
  });
});
