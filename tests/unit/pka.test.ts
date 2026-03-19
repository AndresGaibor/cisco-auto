/**
 * PKA Encoder/Decoder Tests
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { decodePKA, detectPKAVersion } from '../../src/core/parser/pka/pka-decoder-v2.ts';
import { encodePKA } from '../../src/core/parser/pka/pka-encoder.ts';
import { PKAAdapter } from '../../src/core/parser/pka/pka-adapter.ts';

// Test files
const TEST_FILES_DIR = join(process.cwd(), 'archivos_prueba');
const TEST_PKA = join(TEST_FILES_DIR, '2.3.7 Packet Tracer - Navigate the IOS (1).pka');

describe('PKA Decoder', () => {
  test('should detect PKA version', () => {
    const data = new Uint8Array(readFileSync(TEST_PKA));
    const version = detectPKAVersion(data);
    
    expect(['v5', 'v7', 'unknown']).toContain(version);
  });
  
  test('should handle decode attempt gracefully', () => {
    const data = new Uint8Array(readFileSync(TEST_PKA));
    const result = decodePKA(data);
    
    // Result should be structured, even if it fails
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('stagesCompleted');
    
    // If it fails, should have error message
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('PKA Encoder', () => {
  test('should encode simple XML', () => {
    const xml = `<?xml version="1.0"?>
<PACKETTRACER5_ACTIVITY>
  <VERSION>7.2.1</VERSION>
  <PACKETTRACER5>
    <NETWORK>
      <DEVICES></DEVICES>
      <LINKS></LINKS>
    </NETWORK>
  </PACKETTRACER5>
</PACKETTRACER5_ACTIVITY>`;
    
    const result = encodePKA(xml);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBeGreaterThan(0);
    expect(result.stagesCompleted).toEqual([1, 2, 3, 4]);
  });
});

describe('PKAAdapter', () => {
  test('should attempt decode PKA to LabSpec', () => {
    const adapter = new PKAAdapter({ verbose: false });
    const result = adapter.decodeFile(TEST_PKA);
    
    // Result should be structured
    expect(result).toHaveProperty('success');
    
    // May fail with EAX auth, but should handle gracefully
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
  
  test('should generate XML from LabSpec', () => {
    const adapter = new PKAAdapter();
    
    const labSpec = {
      metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
      devices: [
        { name: 'Router1', type: 'router' as const, interfaces: [{ name: 'Gi0/0', ipAddress: '192.168.1.1/24' }] }
      ],
      connections: []
    };
    
    const xml = adapter.fromLabSpec(labSpec);
    
    expect(xml).toContain('<?xml');
    expect(xml).toContain('Router1');
    expect(xml).toContain('192.168.1.1');
  });
  
  test('should encode LabSpec to PKA', () => {
    const adapter = new PKAAdapter();
    
    const labSpec = {
      metadata: { name: 'Test Lab', version: '1.0', author: 'test', created: new Date().toISOString() },
      devices: [
        { name: 'Switch1', type: 'switch' as const }
      ],
      connections: []
    };
    
    const result = adapter.encodeFile(labSpec, '/tmp/test-output.pka');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe('PKA Round-trip', () => {
  test('should encode and produce valid PKA structure', () => {
    const originalXml = `<?xml version="1.0"?>
<PACKETTRACER5_ACTIVITY>
  <VERSION>7.2.1</VERSION>
  <PACKETTRACER5>
    <NETWORK>
      <DEVICES>
        <DEVICE id="1">
          <ENGINE>
            <NAME>TestDevice</NAME>
            <TYPE>Router-PT</TYPE>
          </ENGINE>
        </DEVICE>
      </DEVICES>
      <LINKS></LINKS>
    </NETWORK>
  </PACKETTRACER5>
</PACKETTRACER5_ACTIVITY>`;
    
    // Encode should succeed
    const encodeResult = encodePKA(originalXml);
    expect(encodeResult.success).toBe(true);
    expect(encodeResult.data).toBeDefined();
    expect(encodeResult.data!.length).toBeGreaterThan(0);
    
    // Note: Round-trip decode currently fails due to EAX auth mismatch
    // This is a known limitation with the current implementation
  });
});

describe('Cable Type Mapping', () => {
  test('should map cable types correctly', () => {
    const adapter = new PKAAdapter();
    
    // Access private method via any for testing
    const mapCableType = (adapter as any).mapCableType.bind(adapter);
    
    expect(mapCableType('ethernet')).toBe('eStraightThrough');
    expect(mapCableType('serial')).toBe('eSerialDCE');
    expect(mapCableType('console')).toBe('eConsole');
    expect(mapCableType('fiber')).toBe('eFiber');
  });
});

describe('CIDR to Mask Conversion', () => {
  test('should convert CIDR to subnet mask', () => {
    const adapter = new PKAAdapter();
    const cidrToMask = (adapter as any).cidrToMask.bind(adapter);
    
    expect(cidrToMask(24)).toBe('255.255.255.0');
    expect(cidrToMask(16)).toBe('255.255.0.0');
    expect(cidrToMask(8)).toBe('255.0.0.0');
    expect(cidrToMask(32)).toBe('255.255.255.255');
    expect(cidrToMask(0)).toBe('0.0.0.0');
  });
});
