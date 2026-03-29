import { XMLParser } from 'fast-xml-parser';
import type { Lab, Device, Connection } from '../types/index.ts';
import type { DeviceType } from '../canonical';

export interface PKAtoYAMLOptions {
  includeConfig?: boolean;
}

export class PKAtoYAML {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  /**
   * Convierte XML de Packet Tracer a objeto Lab
   */
  public convert(xml: string, options: PKAtoYAMLOptions = {}): Lab {
    const jsonObj = this.parser.parse(xml);
    
    // Packet Tracer PKA files have PACKETTRACER5_ACTIVITY -> PACKETTRACER5 (Array) -> NETWORK
    const topLevel = jsonObj.PACKETTRACER5_ACTIVITY || jsonObj.PACKETTRACER5;
    let ptCore: any = null;

    if (topLevel) {
      if (Array.isArray(topLevel.PACKETTRACER5)) {
        // Find the one that actually has a NETWORK node
        ptCore = topLevel.PACKETTRACER5.find((item: any) => item.NETWORK);
      } else if (topLevel.PACKETTRACER5) {
        ptCore = topLevel.PACKETTRACER5;
      } else {
        ptCore = topLevel;
      }
    }
    
    if (!ptCore || !ptCore.NETWORK) {
      throw new Error('Formato XML de Packet Tracer no reconocido o nodo NETWORK no encontrado');
    }

    const network = ptCore.NETWORK;
    const ptDevices = this.ensureArray(network.DEVICES?.DEVICE || []);
    const ptLinks = this.ensureArray(network.LINKS?.LINK || []);

    const devices: Device[] = [];
    const idToNameMap = new Map<string, string>();

    // 1. Mapear dispositivos y crear mapa de IDs
    for (const ptDev of ptDevices) {
      const engine = ptDev.ENGINE;
      if (!engine) continue;

      const name = this.ensureString(engine.NAME);
      const refId = engine.SAVE_REF_ID;
      
      if (refId) {
        idToNameMap.set(refId, name);
      }

      const type = this.mapDeviceType(engine.TYPE?.["#text"] || engine.TYPE);
      const model = engine.TYPE?.["@_model"] || "";

      const device: Device = {
        name,
        type: type as Device['type'],
        model,
        hostname: name,
        interfaces: []
      };

      // Intentar extraer IPs de los puertos (común en PCs)
      const interfaces = this.extractInterfaces(engine);
      if (interfaces.length > 0) {
        // Para switches/routers con muchos puertos, solo guardamos los que tienen IP o están activos
        device.interfaces = (type === 'pc' || type === 'server')
          ? interfaces 
          : interfaces.filter(iface => iface.ip);
      }

      devices.push(device);
    }

    // 2. Mapear conexiones
    const connections: Connection[] = [];
    for (const ptLink of ptLinks) {
      const cable = ptLink.CABLE;
      if (!cable) continue;

      const fromId = cable.FROM;
      const toId = cable.TO;
      
      const fromName = idToNameMap.get(fromId);
      const toName = idToNameMap.get(toId);

      if (fromName && toName) {
        // En el XML, cable.PORT y ptLink.PORT pueden ser arrays o strings
        const ports = this.ensureArray(ptLink.PORT || cable.PORT || cable.TO_PORT);
        
        connections.push({
          from: fromName,
          to: toName,
          fromInterface: this.ensureString(ports[0] || "Unknown"),
          toInterface: this.ensureString(ports[1] || "Unknown"),
          type: this.mapLinkType(ptLink.TYPE)
        });
      }
    }

    return {
      metadata: {
        name: "Imported Lab",
        description: "Laboratorio importado desde PKA",
        version: this.ensureString(topLevel?.VERSION || "1.0"),
        difficulty: "intermediate"
      },
      topology: {
        devices,
        connections
      }
    };
  }

  private ensureArray(obj: any): any[] {
    if (!obj) return [];
    return Array.isArray(obj) ? obj : [obj];
  }

  private ensureString(obj: any): string {
    if (typeof obj === 'string') return obj;
    if (obj && obj["#text"]) return obj["#text"];
    return String(obj || "");
  }

  private mapDeviceType(ptType: any): DeviceType {
    const type = String(ptType || "").toLowerCase();
    if (type.includes('cloud')) return 'cloud' as any;
    if (type.includes('modem')) return 'modem' as any;
    if (type.includes('printer')) return 'printer' as any;
    if (type.includes('wrt') || type.includes('wireless router')) return 'wireless-router' as any;
    if (type.includes('router')) return 'router';
    if (type.includes('switch')) return 'switch';
    if (type.includes('pc')) return 'pc';
    if (type.includes('server')) return 'server';
    if (type.includes('access-point') || type.includes('ap-pt')) return 'access-point';
    return 'router'; // Default
  }

  private mapLinkType(ptLinkType: string): 'fiber' | 'serial' | 'console' | 'wireless' | 'coaxial' | 'ethernet' {
    const type = String(ptLinkType || "").toLowerCase();
    if (type.includes('serial')) return 'serial';
    if (type.includes('console') || type.includes('rollover')) return 'console';
    if (type.includes('coaxial')) return 'coaxial';
    if (type.includes('fiber')) return 'fiber';
    return 'ethernet';
  }

  private extractInterfaces(engine: any): any[] {
    const interfaces: any[] = [];
    
    // Buscar recursivamente en módulos y slots
    const processModule = (module: any) => {
      if (!module) return;
      
      const ports = this.ensureArray(module.PORT);
      for (const port of ports) {
        if (port.TYPE) {
          const iface: any = {
            name: this.ensureString(port.NAME) || this.mapPortTypeToName(port.TYPE),
            enabled: port.POWER === 'true' || port.POWER === true
          };

          if (port.IP && port.SUBNET) {
            const ip = this.ensureString(port.IP);
            const subnet = this.ensureString(port.SUBNET);
            if (ip && subnet) {
              iface.ip = `${ip}/${this.maskToCidr(subnet)}`;
            }
          }
          interfaces.push(iface);
        }
      }

      const slots = this.ensureArray(module.SLOT);
      for (const slot of slots) {
        processModule(slot.MODULE);
      }
    };

    processModule(engine.MODULE);
    return interfaces;
  }

  private mapPortTypeToName(ptPortType: string): string {
    const type = ptPortType.toLowerCase();
    if (type.includes('fastethernet')) return 'FastEthernet0';
    if (type.includes('gigabitethernet')) return 'GigabitEthernet0';
    return ptPortType;
  }

  private maskToCidr(mask: string): number {
    const parts = mask.split('.').map(Number);
    let cidr = 0;
    for (const part of parts) {
      cidr += Math.log2((part ^ 255) + 1) === 0 ? 8 : 8 - Math.log2((part ^ 255) + 1);
    }
    return cidr;
  }
}
