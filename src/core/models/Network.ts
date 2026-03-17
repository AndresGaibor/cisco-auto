import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { BaseDevice } from './BaseDevice.ts';
import { PC } from './PC.ts';
import { Server } from './Server.ts';
import { Switch } from './Switch.ts';
import { Router } from './Router.ts';
import { WirelessRouter } from './WirelessRouter.ts';
import { Activity } from './Activity.ts';
import { CableType, LinkMedium } from './CableTypes.ts';
import { ValidationEngine } from './ValidationEngine.ts';

export class Network {
  private parsedTree: any;
  private devicesMap: Map<string, BaseDevice> = new Map();
  private ptCore: any;
  public activity: Activity;

  constructor(xmlData: string) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      cdataPropName: "__cdata",
      preserveOrder: false,
    });
    
    this.parsedTree = parser.parse(xmlData);
    this.activity = new Activity(this.parsedTree);
    this.initDevices();
  }

  private initDevices(): void {
    const topLevel = this.parsedTree.PACKETTRACER5_ACTIVITY || this.parsedTree.PACKETTRACER5;
    
    if (topLevel) {
      if (Array.isArray(topLevel.PACKETTRACER5)) {
        this.ptCore = topLevel.PACKETTRACER5.find((item: any) => item.NETWORK);
      } else {
        this.ptCore = topLevel.PACKETTRACER5 || topLevel;
      }
    }

    if (!this.ptCore?.NETWORK?.DEVICES) return;

    let deviceNodes = this.ptCore.NETWORK.DEVICES.DEVICE;
    if (!deviceNodes) return;
    if (!Array.isArray(deviceNodes)) deviceNodes = [deviceNodes];

    for (const node of deviceNodes) {
      const typeStr = String(node.ENGINE?.TYPE?.["#text"] || node.ENGINE?.TYPE || "").toLowerCase();
      const name = String(node.ENGINE?.NAME?.["#text"] || node.ENGINE?.NAME || "");

      let deviceObj: BaseDevice;
      if (typeStr.includes('server')) deviceObj = new Server(node);
      else if (typeStr.includes('pc')) deviceObj = new PC(node);
      else if (typeStr.includes('switch')) deviceObj = new Switch(node);
      else if (typeStr.includes('router')) deviceObj = new Router(node);
      else if (typeStr.includes('wrt') || typeStr.includes('wireless')) deviceObj = new WirelessRouter(node);
      else deviceObj = new PC(node);

      this.devicesMap.set(name, deviceObj);
    }
  }

  /**
   * Conecta dos dispositivos físicamente con validación estricta de hardware
   */
  public connect(fromName: string, fromPort: string, toName: string, toPort: string, type: CableType): void {
    const fromDev = this.devicesMap.get(fromName);
    const toDev = this.devicesMap.get(toName);

    if (!fromDev || !toDev) throw new Error(`Dispositivo no encontrado: ${!fromDev ? fromName : toName}`);

    // VALIDACIÓN FÍSICA: ¿Es el cable compatible con los puertos?
    // Esto previene conectar Fibra a Cobre, etc.
    ValidationEngine.validateCableCompatibility(fromPort, type);
    ValidationEngine.validateCableCompatibility(toPort, type);

    if (!this.ptCore.NETWORK.LINKS) this.ptCore.NETWORK.LINKS = { LINK: [] };
    if (!Array.isArray(this.ptCore.NETWORK.LINKS.LINK)) {
      this.ptCore.NETWORK.LINKS.LINK = [this.ptCore.NETWORK.LINKS.LINK];
    }

    // Inferencia de medio físico para el XML
    const typeLower = type.toLowerCase();
    const medium = typeLower.includes('fiber') ? LinkMedium.FIBER : 
                   typeLower.includes('serial') ? LinkMedium.SERIAL : LinkMedium.COPPER;

    const newLink = {
      TYPE: medium,
      CABLE: {
        LENGTH: "1",
        FUNCTIONAL: "true",
        FROM: fromDev.getRefId(),
        PORT: fromPort,
        TO: toDev.getRefId(),
        TO_PORT: toPort,
        TYPE: type
      }
    };

    this.ptCore.NETWORK.LINKS.LINK.push(newLink);
    console.log(`   [Link OK] ${fromName}(${fromPort}) <---> ${toName}(${toPort}) [${type}]`);
  }

  public getDevice<T extends BaseDevice>(name: string): T | undefined {
    return this.devicesMap.get(name) as T;
  }

  public getDevices(): BaseDevice[] {
    return Array.from(this.devicesMap.values());
  }

  public toXML(): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      format: true,
      suppressEmptyNode: true,
      cdataPropName: "__cdata"
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(this.parsedTree)}`;
  }
}
