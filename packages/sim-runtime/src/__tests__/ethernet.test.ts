/**
 * Tests para el protocolo Ethernet
 */

import { describe, test, expect } from 'bun:test';
import {
  // MAC utilities
  macToBytes,
  bytesToMac,
  normalizeMAC,
  isValidMAC,
  isBroadcastMAC,
  isMulticastMAC,
  isUnicastMAC,
  isSwitchProcessorMAC,
  generateRandomMAC,
  // Frame utilities
  createFrame,
  createBroadcastFrame,
  serializeFrame,
  parseFrame,
  calculateFCS,
  verifyFCS,
  getFrameStats,
  describeFrame,
  // Constants
  ETHERTYPES,
  SPECIAL_MACS,
  MIN_FRAME_SIZE
} from '../protocols/ethernet';

// =============================================================================
// MAC ADDRESS UTILITIES
// =============================================================================

describe('MAC Address Utilities', () => {
  
  describe('macToBytes', () => {
    test('converts colon-separated MAC to bytes', () => {
      const result = macToBytes('aa:bb:cc:dd:ee:ff');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(6);
      expect(result[0]).toBe(0xaa);
      expect(result[5]).toBe(0xff);
    });
    
    test('converts dash-separated MAC to bytes', () => {
      const result = macToBytes('AA-BB-CC-DD-EE-FF');
      expect(result[0]).toBe(0xaa);
      expect(result[5]).toBe(0xff);
    });
    
    test('converts Cisco format MAC to bytes', () => {
      const result = macToBytes('aabb.ccdd.eeff');
      expect(result[0]).toBe(0xaa);
      expect(result[5]).toBe(0xff);
    });
    
    test('throws on invalid MAC format', () => {
      expect(() => macToBytes('invalid')).toThrow();
      expect(() => macToBytes('aa:bb:cc')).toThrow();
    });
  });
  
  describe('bytesToMac', () => {
    test('converts bytes to colon-separated MAC', () => {
      const bytes = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
      expect(bytesToMac(bytes)).toBe('aa:bb:cc:dd:ee:ff');
    });
    
    test('converts bytes to dash-separated MAC', () => {
      const bytes = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
      expect(bytesToMac(bytes, '-')).toBe('aa-bb-cc-dd-ee-ff');
    });
    
    test('converts bytes to Cisco format MAC', () => {
      const bytes = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);
      expect(bytesToMac(bytes, '.')).toBe('aabb.ccdd.eeff');
    });
    
    test('throws on wrong number of bytes', () => {
      expect(() => bytesToMac(new Uint8Array([0xaa, 0xbb]))).toThrow();
    });
  });
  
  describe('normalizeMAC', () => {
    test('normalizes different formats to same result', () => {
      expect(normalizeMAC('AA:BB:CC:DD:EE:FF')).toBe('aa:bb:cc:dd:ee:ff');
      expect(normalizeMAC('aa-bb-cc-dd-ee-ff')).toBe('aa:bb:cc:dd:ee:ff');
      expect(normalizeMAC('AABB.CCDD.EEFF')).toBe('aa:bb:cc:dd:ee:ff');
    });
  });
  
  describe('isValidMAC', () => {
    test('returns true for valid MACs', () => {
      expect(isValidMAC('aa:bb:cc:dd:ee:ff')).toBe(true);
      expect(isValidMAC('00:00:00:00:00:00')).toBe(true);
      expect(isValidMAC('ff:ff:ff:ff:ff:ff')).toBe(true);
    });
    
    test('returns false for invalid MACs', () => {
      expect(isValidMAC('invalid')).toBe(false);
      expect(isValidMAC('aa:bb:cc')).toBe(false);
      expect(isValidMAC('')).toBe(false);
    });
  });
  
  describe('isBroadcastMAC', () => {
    test('returns true for broadcast MAC', () => {
      expect(isBroadcastMAC('ff:ff:ff:ff:ff:ff')).toBe(true);
      expect(isBroadcastMAC('FF:FF:FF:FF:FF:FF')).toBe(true);
    });
    
    test('returns false for non-broadcast MACs', () => {
      expect(isBroadcastMAC('aa:bb:cc:dd:ee:ff')).toBe(false);
      expect(isBroadcastMAC('00:00:00:00:00:00')).toBe(false);
    });
  });
  
  describe('isMulticastMAC', () => {
    test('returns true for multicast MACs', () => {
      // Multicast MACs have least significant bit of first byte = 1
      expect(isMulticastMAC('01:00:5e:00:00:01')).toBe(true);
      expect(isMulticastMAC('33:33:00:00:00:01')).toBe(true);
    });
    
    test('returns false for unicast and broadcast', () => {
      expect(isMulticastMAC('00:00:00:00:00:01')).toBe(false);
      expect(isMulticastMAC('ff:ff:ff:ff:ff:ff')).toBe(false);
    });
  });
  
  describe('isUnicastMAC', () => {
    test('returns true for unicast MACs', () => {
      expect(isUnicastMAC('00:00:00:00:00:01')).toBe(true);
      expect(isUnicastMAC('aa:bb:cc:dd:ee:ff')).toBe(true);
    });
    
    test('returns false for multicast and broadcast', () => {
      expect(isUnicastMAC('01:00:5e:00:00:01')).toBe(false);
      expect(isUnicastMAC('ff:ff:ff:ff:ff:ff')).toBe(false);
    });
  });
  
  describe('isSwitchProcessorMAC', () => {
    test('returns true for reserved bridge MACs', () => {
      // 01:80:c2:00:00:00 to 01:80:c2:00:00:0f
      expect(isSwitchProcessorMAC('01:80:c2:00:00:00')).toBe(true);
      expect(isSwitchProcessorMAC('01:80:c2:00:00:0e')).toBe(true);
    });
    
    test('returns false for other MACs', () => {
      expect(isSwitchProcessorMAC('01:80:c2:00:00:10')).toBe(false);
      expect(isSwitchProcessorMAC('01:00:5e:00:00:01')).toBe(false);
    });
  });
  
  describe('generateRandomMAC', () => {
    test('generates valid MAC', () => {
      const mac = generateRandomMAC();
      expect(isValidMAC(mac)).toBe(true);
    });
    
    test('generates unicast MAC (bit 0 of first byte = 0)', () => {
      const mac = generateRandomMAC();
      expect(isUnicastMAC(mac)).toBe(true);
    });
    
    test('generates locally administered MAC (bit 1 of first byte = 1)', () => {
      const mac = generateRandomMAC();
      const bytes = macToBytes(mac);
      expect((bytes[0] & 0x02) !== 0).toBe(true);
    });
    
    test('uses provided OUI', () => {
      const mac = generateRandomMAC([0x00, 0x11, 0x22], Math.random, true);
      expect(mac.startsWith('00:11:22')).toBe(true);
    });
    
    test('uses deterministic random function', () => {
      let counter = 0;
      const deterministic = () => {
        counter++;
        return (counter % 256) / 256;
      };
      
      const mac1 = generateRandomMAC([0x00, 0x00, 0x00], deterministic);
      counter = 0;
      const mac2 = generateRandomMAC([0x00, 0x00, 0x00], deterministic);
      
      expect(mac1).toBe(mac2);
    });
  });
});

// =============================================================================
// FRAME CREATION
// =============================================================================

describe('Frame Creation', () => {
  
  describe('createFrame', () => {
    test('creates basic frame', () => {
      const payload = new Uint8Array(64).fill(0);
      const frame = createFrame({
        dstMAC: 'ff:ff:ff:ff:ff:ff',
        srcMAC: 'aa:bb:cc:dd:ee:ff',
        payload
      });
      
      expect(frame.dstMAC).toBe('ff:ff:ff:ff:ff:ff');
      expect(frame.srcMAC).toBe('aa:bb:cc:dd:ee:ff');
      expect(frame.ethertype).toBe(ETHERTYPES.IPv4);
      expect(frame.payload).toBe(payload);
      expect(frame.vlanTag).toBeUndefined();
    });
    
    test('creates frame with custom ethertype', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        ethertype: ETHERTYPES.ARP,
        payload: new Uint8Array(28)
      });
      
      expect(frame.ethertype).toBe(ETHERTYPES.ARP);
    });
    
    test('creates frame with VLAN tag', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64),
        vlanTag: { vid: 10, pcp: 5, dei: false }
      });
      
      expect(frame.vlanTag).toBeDefined();
      expect(frame.vlanTag?.vid).toBe(10);
      expect(frame.vlanTag?.pcp).toBe(5);
    });
    
    test('throws on invalid MAC', () => {
      expect(() => createFrame({
        dstMAC: 'invalid',
        srcMAC: 'aa:bb:cc:dd:ee:ff',
        payload: new Uint8Array(64)
      })).toThrow();
    });
  });
  
  describe('createBroadcastFrame', () => {
    test('creates broadcast frame', () => {
      const frame = createBroadcastFrame({
        srcMAC: 'aa:bb:cc:dd:ee:ff',
        payload: new Uint8Array(64)
      });
      
      expect(frame.dstMAC).toBe(SPECIAL_MACS.BROADCAST);
    });
  });
});

// =============================================================================
// FRAME SERIALIZATION
// =============================================================================

describe('Frame Serialization', () => {
  
  describe('serializeFrame and parseFrame', () => {
    test('serializes and parses basic frame', () => {
      const original = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        ethertype: ETHERTYPES.IPv4,
        payload: new Uint8Array(64).fill(0x42)
      });
      
      const serialized = serializeFrame(original);
      const parsed = parseFrame(serialized);
      
      expect(parsed.dstMAC).toBe(original.dstMAC);
      expect(parsed.srcMAC).toBe(original.srcMAC);
      expect(parsed.ethertype).toBe(original.ethertype);
      expect(parsed.vlanTag).toBeUndefined();
    });
    
    test('serializes and parses VLAN tagged frame', () => {
      const original = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64),
        vlanTag: { vid: 100, pcp: 7, dei: true }
      });
      
      const serialized = serializeFrame(original);
      const parsed = parseFrame(serialized);
      
      expect(parsed.vlanTag).toBeDefined();
      expect(parsed.vlanTag?.vid).toBe(100);
      expect(parsed.vlanTag?.pcp).toBe(7);
      expect(parsed.vlanTag?.dei).toBe(true);
    });
    
    test('serializes frame with correct size', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64)
      });
      
      const serialized = serializeFrame(frame);
      // Header (14) + Payload (64) + FCS (4) = 82 bytes
      expect(serialized.length).toBe(82);
    });
    
    test('serializes tagged frame with correct size', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64),
        vlanTag: { vid: 10, pcp: 0, dei: false }
      });
      
      const serialized = serializeFrame(frame);
      // Header (14) + VLAN (4) + Payload (64) + FCS (4) = 86 bytes
      expect(serialized.length).toBe(86);
    });
  });
  
  describe('calculateFCS', () => {
    test('calculates CRC-32', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const fcs = calculateFCS(data);
      
      // FCS debe ser un número de 32 bits
      expect(typeof fcs).toBe('number');
      expect(fcs).toBeGreaterThanOrEqual(0);
      expect(fcs).toBeLessThan(0x100000000);
    });
    
    test('produces consistent results', () => {
      const data = new Uint8Array(64).fill(0x42);
      const fcs1 = calculateFCS(data);
      const fcs2 = calculateFCS(data);
      
      expect(fcs1).toBe(fcs2);
    });
  });
  
  describe('verifyFCS', () => {
    test('verifies correct FCS', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64)
      });
      
      const serialized = serializeFrame(frame);
      const parsed = parseFrame(serialized);
      
      expect(verifyFCS(parsed, serialized)).toBe(true);
    });
  });
});

// =============================================================================
// FRAME STATS
// =============================================================================

describe('Frame Statistics', () => {
  
  describe('getFrameStats', () => {
    test('calculates stats for valid frame', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64)
      });
      
      const stats = getFrameStats(frame);
      
      expect(stats.totalBytes).toBe(82);
      expect(stats.headerBytes).toBe(14);
      expect(stats.payloadBytes).toBe(64);
      expect(stats.tagged).toBe(false);
      expect(stats.valid).toBe(true);
    });
    
    test('calculates stats for tagged frame', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64),
        vlanTag: { vid: 10, pcp: 0, dei: false }
      });
      
      const stats = getFrameStats(frame);
      
      expect(stats.headerBytes).toBe(18);
      expect(stats.tagged).toBe(true);
    });
    
    test('detects runt frame', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(10) // Too small
      });
      
      const stats = getFrameStats(frame);
      
      expect(stats.valid).toBe(false);
      expect(stats.error).toContain('runt frame');
    });
  });
  
  describe('describeFrame', () => {
    test('describes frame in readable format', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64)
      });
      
      const desc = describeFrame(frame);
      
      expect(desc).toContain('aa:bb:cc:dd:ee:02');
      expect(desc).toContain('aa:bb:cc:dd:ee:01');
      expect(desc).toContain('IPv4');
      expect(desc).toContain('bytes');
    });
    
    test('includes VLAN in description', () => {
      const frame = createFrame({
        dstMAC: 'aa:bb:cc:dd:ee:01',
        srcMAC: 'aa:bb:cc:dd:ee:02',
        payload: new Uint8Array(64),
        vlanTag: { vid: 100, pcp: 0, dei: false }
      });
      
      const desc = describeFrame(frame);
      
      expect(desc).toContain('VLAN 100');
    });
  });
});
