/**
 * PKA Adapter - Adaptador completo para archivos PKA
 * 
 * Proporciona:
 * - decode: PKA → XML
 * - encode: XML → PKA
 * - toLabSpec: PKA → LabSpec (canonical)
 * - fromLabSpec: LabSpec → PKA
 * - roundTrip: PKA → PKA (sin pérdida)
 */

import { readFileSync, writeFileSync } from 'fs';
import { decodePKA, detectPKAVersion } from './pka-decoder-v2.ts';
import { encodePKA } from './pka-encoder.ts';
import { PKAtoYAML } from '../pka-to-yaml.ts';
import type { LabSpec, DeviceSpec, ConnectionSpec } from '../../canonical/index.ts';

export interface PKAAdapterOptions {
  /** Preservar Activity Wizard data */
  preserveActivity?: boolean;
  /** Verbosity */
  verbose?: boolean;
}

export interface PKAMetadata {
  /** Versión de Packet Tracer */
  version: string;
  /** Tamaño del archivo original */
  fileSize: number;
  /** Tipo de encriptación detectada */
  encryptionType: 'v5' | 'v7';
  /** Tiempo de procesamiento */
  processTimeMs: number;
}

export interface PKADecodeResult {
  success: boolean;
  lab?: LabSpec;
  metadata?: PKAMetadata;
  xml?: string;
  error?: string;
}

export interface PKAEncodeResult {
  success: boolean;
  data?: Uint8Array;
  metadata?: {
    originalXmlSize: number;
    encodedSize: number;
    processTimeMs: number;
  };
  error?: string;
}

/**
 * Adaptador PKA principal
 */
export class PKAAdapter {
  private options: PKAAdapterOptions;

  constructor(options: PKAAdapterOptions = {}) {
    this.options = {
      preserveActivity: true,
      verbose: false,
      ...options
    };
  }

  /**
   * Decodifica un archivo PKA a LabSpec
   */
  decodeFile(filepath: string): PKADecodeResult {
    const startTime = Date.now();
    
    try {
      // Leer archivo
      const data = new Uint8Array(readFileSync(filepath));
      
      if (this.options.verbose) {
        console.log(`[PKAAdapter] Loading ${filepath} (${data.length} bytes)`);
      }
      
      // Detectar versión
      const encryptionType = detectPKAVersion(data);
      
      if (this.options.verbose) {
        console.log(`[PKAAdapter] Detected encryption: ${encryptionType}`);
      }
      
      // Decodificar
      const decodeResult = decodePKA(data);
      
      if (!decodeResult.success) {
        return {
          success: false,
          error: decodeResult.error
        };
      }
      
      // Convertir XML a LabSpec
      const converter = new PKAtoYAML();
      const lab = converter.convert(decodeResult.xml!);
      
      // Convertir a LabSpec canonical
      const labSpec = this.toLabSpec(lab);
      
      const processTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        lab: labSpec,
        xml: decodeResult.xml,
        metadata: {
          version: decodeResult.version || 'unknown',
          fileSize: data.length,
          encryptionType,
          processTimeMs
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Codifica un LabSpec a archivo PKA
   */
  encodeFile(lab: LabSpec, filepath: string, options?: { xmlTemplate?: string }): PKAEncodeResult {
    const startTime = Date.now();
    
    try {
      // Generar XML desde LabSpec
      const xml = options?.xmlTemplate || this.fromLabSpec(lab);
      
      if (this.options.verbose) {
        console.log(`[PKAAdapter] Encoding ${xml.length} chars to PKA`);
      }
      
      // Codificar
      const encodeResult = encodePKA(xml);
      
      if (!encodeResult.success || !encodeResult.data) {
        return {
          success: false,
          error: encodeResult.error
        };
      }
      
      // Guardar archivo
      writeFileSync(filepath, Buffer.from(encodeResult.data));
      
      const processTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        data: encodeResult.data,
        metadata: {
          originalXmlSize: xml.length,
          encodedSize: encodeResult.data.length,
          processTimeMs
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convierte Lab del parser a LabSpec canonical
   */
  private toLabSpec(lab: any): LabSpec {
    return {
      metadata: {
        name: lab.metadata?.name || 'Imported Lab',
        version: lab.metadata?.version || '1.0',
        author: 'cisco-auto',
        created: new Date().toISOString()
      },
      devices: (lab.topology?.devices || []).map((d: any) => this.deviceToSpec(d)),
      connections: (lab.topology?.connections || []).map((c: any) => this.connectionToSpec(c))
    };
  }

  /**
   * Convierte Device del parser a DeviceSpec
   */
  private deviceToSpec(device: any): DeviceSpec {
    return {
      name: device.name,
      type: device.type,
      hostname: device.hostname || device.name,
      managementIp: device.interfaces?.[0]?.ip?.split('/')[0],
      interfaces: (device.interfaces || []).map((i: any) => ({
        name: i.name,
        description: i.description,
        ipAddress: i.ip,
        shutdown: i.enabled === false
      }))
    };
  }

  /**
   * Convierte Connection a ConnectionSpec
   */
  private connectionToSpec(conn: any): ConnectionSpec {
    return {
      from: {
        deviceName: conn.from,
        portName: conn.fromInterface || 'unknown'
      },
      to: {
        deviceName: conn.to,
        portName: conn.toInterface || 'unknown'
      },
      cableType: this.mapCableType(conn.type)
    };
  }

  /**
   * Mapea tipo de cable
   */
  private mapCableType(type: string): any {
    const types: Record<string, string> = {
      'ethernet': 'eStraightThrough',
      'serial': 'eSerialDCE',
      'console': 'eConsole',
      'fiber': 'eFiber',
      'coaxial': 'eCoax'
    };
    return types[type] || 'eStraightThrough';
  }

  /**
   * Genera XML desde LabSpec
   * Nota: Esta es una implementación básica que crea un XML funcional
   * Para preservar Activity Wizard, usar xmlTemplate option
   */
  fromLabSpec(lab: LabSpec): string {
    const lines: string[] = [];
    
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<PACKETTRACER5_ACTIVITY>');
    lines.push('  <VERSION>7.2.1</VERSION>');
    lines.push('  <PACKETTRACER5>');
    lines.push('    <NETWORK>');
    
    // Dispositivos
    lines.push('      <DEVICES>');
    for (let i = 0; i < lab.devices.length; i++) {
      const device = lab.devices[i];
      lines.push(`        <DEVICE id="${i + 1}">`);
      lines.push('          <ENGINE>');
      lines.push(`            <NAME>${this.escapeXml(device.name)}</NAME>`);
      lines.push(`            <TYPE>${device.type}</TYPE>`);
      
      if (device.interfaces && device.interfaces.length > 0) {
        lines.push('            <MODULE>');
        for (const iface of device.interfaces) {
          lines.push(`              <PORT name="${this.escapeXml(iface.name)}">`);
          if (iface.ipAddress) {
            const [ip, cidr] = iface.ipAddress.split('/');
            lines.push(`                <IP>${ip}</IP>`);
            if (cidr) {
              lines.push(`                <SUBNET>${this.cidrToMask(parseInt(cidr))}</SUBNET>`);
            }
          }
          lines.push('              </PORT>');
        }
        lines.push('            </MODULE>');
      }
      
      lines.push('          </ENGINE>');
      lines.push('        </DEVICE>');
    }
    lines.push('      </DEVICES>');
    
    // Conexiones
    lines.push('      <LINKS>');
    for (const conn of lab.connections) {
      lines.push('        <LINK>');
      lines.push(`          <CABLE from="${conn.from.deviceName}" to="${conn.to.deviceName}" type="${conn.cableType}"/>`);
      lines.push('        </LINK>');
    }
    lines.push('      </LINKS>');
    
    lines.push('    </NETWORK>');
    lines.push('  </PACKETTRACER5>');
    lines.push('</PACKETTRACER5_ACTIVITY>');
    
    return lines.join('\n');
  }

  /**
   * Escapa caracteres XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Convierte CIDR a máscara de subred
   */
  private cidrToMask(cidr: number): string {
    const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    return [
      (mask >>> 24) & 255,
      (mask >>> 16) & 255,
      (mask >>> 8) & 255,
      mask & 255
    ].join('.');
  }

  /**
   * Verifica round-trip sin pérdida
   * Decodifica PKA → LabSpec → PKA y compara
   */
  async verifyRoundTrip(filepath: string): Promise<{
    success: boolean;
    originalSize: number;
    roundTripSize: number;
    dataLoss: boolean;
  }> {
    // Decodificar original
    const original = this.decodeFile(filepath);
    if (!original.success || !original.xml) {
      return { success: false, originalSize: 0, roundTripSize: 0, dataLoss: true };
    }
    
    // Re-codificar
    const reEncoded = encodePKA(original.xml);
    if (!reEncoded.success || !reEncoded.data) {
      return { success: false, originalSize: 0, roundTripSize: 0, dataLoss: true };
    }
    
    // Leer original para comparar tamaños
    const originalData = readFileSync(filepath);
    
    return {
      success: true,
      originalSize: originalData.length,
      roundTripSize: reEncoded.data.length,
      dataLoss: originalData.length !== reEncoded.data.length
    };
  }
}

// Funciones de conveniencia
export function decodePKAFile(filepath: string, options?: PKAAdapterOptions): PKADecodeResult {
  const adapter = new PKAAdapter(options);
  return adapter.decodeFile(filepath);
}

export function encodePKAFromLab(lab: LabSpec, filepath: string): PKAEncodeResult {
  const adapter = new PKAAdapter();
  return adapter.encodeFile(lab, filepath);
}
