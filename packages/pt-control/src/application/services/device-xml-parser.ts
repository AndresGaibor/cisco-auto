// ============================================================================
// DeviceXmlParser - Parser para XML de dispositivos PT
// Extrae información de configuración, puertos, módulos, VLANs, tablas de red
// ============================================================================

/**
 * Puerto parseado desde XML de dispositivo
 */
export interface XmlPort {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  status?: string;
  protocol?: string;
  vlan?: number;
  mode?: string;
  description?: string;
  bandwidth?: string;
  delay?: string;
  duplex?: string;
  speed?: string;
  encapsulation?: string;
  trunkVlan?: number;
  type?: string;
}

/**
 * Módulo parseado desde XML de dispositivo
 */
export interface XmlModule {
  slot: string;
  model?: string;
  type?: string;
  ports: string[];
}

/**
 * VLAN parseada desde XML de dispositivo
 */
export interface XmlVlan {
  id: number;
  name?: string;
  state?: string;
}

/**
 * Entrada de tabla de enrutamiento parseada desde XML
 */
export interface XmlRoutingEntry {
  type: string;
  network: string;
  mask?: string;
  nextHop?: string;
  interface?: string;
  metric?: string;
  distance?: string;
  age?: string;
}

/**
 * Entrada de tabla ARP parseada desde XML
 */
export interface XmlArpEntry {
  ipAddress: string;
  macAddress: string;
  interface: string;
  age?: string;
  type?: string;
}

/**
 * Entrada de tabla MAC parseada desde XML
 */
export interface XmlMacEntry {
  vlan: string;
  macAddress: string;
  type: string;
  ports: string[];
}

export interface OspfEntry {
  processId: number;
  routerId?: string;
  networks: Array<{ network: string; wildcard: string; area: number }>;
}

export interface DhcpPoolEntry {
  poolName: string;
  network?: string;
  subnetMask?: string;
  defaultRouter?: string;
  dnsServer?: string;
  domainName?: string;
  leaseDays?: number;
  leaseHours?: number;
  leaseMinutes?: number;
}

/**
 * Resultado completo del parseo de XML de dispositivo
 */
export interface ParsedDeviceXml {
  hostname?: string;
  model?: string;
  typeId?: number;
  power?: boolean;
  version?: string;
  uptime?: string;
  serialNumber?: string;
  configRegister?: string;
  ports: XmlPort[];
  modules: XmlModule[];
  vlans: XmlVlan[];
  routingTable: XmlRoutingEntry[];
  arpTable: XmlArpEntry[];
  macTable: XmlMacEntry[];
  rawXml: string;
  ospf: OspfEntry[];
  dhcpPools: DhcpPoolEntry[];
  extras: Record<string, string[]>;
}

/**
 * Extrae el contenido de texto de una etiqueta XML
 * @param xml - Cadena XML completa
 * @param tag - Nombre de la etiqueta a buscar
 * @param fallback - Valor por defecto si no se encuentra
 * @returns Contenido de la etiqueta o fallback
 */
function extractXmlTagContent(xml: string, tag: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m && m[1] ? m[1].trim() : fallback;
}

/**
 * Extrae el valor de un atributo de una etiqueta XML
 * @param xml - Cadena XML completa
 * @param tag - Nombre de la etiqueta
 * @param attr - Nombre del atributo
 * @param fallback - Valor por defecto si no se encuentra
 * @returns Valor del atributo o fallback
 */
function tagAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, "i");
  const m = xml.match(re);
  return m && m[1] ? m[1] : fallback;
}

/**
 * Extrae todas las ocurrencias de una etiqueta XML
 * @param xml - Cadena XML completa
 * @param tag - Nombre de la etiqueta a buscar
 * @returns Array con todas las etiquetas encontradas
 */
function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[0]);
  }
  re.lastIndex = 0;
  return matches;
}

// Tags conocidos que ya se parsean como campos estructurados
const KNOWN_PARSED_TAGS = new Set([
  "hostname", "devicename", "model", "typeid", "devicetype",
  "power", "powerstate", "iosversion", "version", "uptime",
  "starttime", "serialnumber", "serial", "configregister",
  "runningconfig", "startupconfig", "config",
  "port", "module", "vlan",
  "route", "routingentry", "iproute",
  "arpentry", "arp",
  "macentry", "macaddressentry", "mactableentry",
  "name", "ipaddress", "ip", "subnetmask", "mask", "subnet",
  "macaddress", "address",
  "status", "linestatus", "protocolstatus", "protocol",
  "mode", "switchportmode", "description",
  "bandwidth", "bandwidthkbps", "delay",
  "duplex", "fullduplex", "speed",
  "encapsulation", "trunkvlan", "nativevlan",
  "pins", "mediatype",
  "autonegotiatebandwidth", "autonegotiatespeed", "autonegotiateduplex",
  "up_method", "upmethod",
  "clockrate",
  "channel",
  "port_vlan",
  "type",
  "slot", "portref", "ports",
  "id", "number", "vlanid", "state",
  "routetype", "network", "nexthop", "gateway", "via",
  "interface", "outinterface", "intf",
  "metric", "administrativedistance", "distance", "age",
  "hardwareaddress",
  "vlan",
]);

function collectUnknownTags(xml: string): Record<string, string[]> {
  const tagNames = new Set<string>();
  const tagRe = /<\/(\w+)>|<(\w+)(?:\s[^>]*)?\/>|<(\w+)(?:\s[^>]*?)?>/gi;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    const name = (m[1] || m[2] || m[3] || "").toLowerCase();
    if (name) tagNames.add(name);
  }

  const extras: Record<string, string[]> = {};
  for (const tag of tagNames) {
    if (!KNOWN_PARSED_TAGS.has(tag)) {
      const occurrences = extractAllTags(xml, tag);
      if (occurrences.length > 0) {
        extras[tag] = occurrences;
      }
    }
  }
  return extras;
}

/**
 * Parsea un XML de dispositivo PT y extrae toda la información relevante
 * @param xml - Cadena XML del dispositivo
 * @returns Objeto con la información parseada del dispositivo
 */
export function parseDeviceXml(xml: string): ParsedDeviceXml {
  const hostname = extractXmlTagContent(xml, "hostname") || tagAttr(xml, "device", "name");
  const model = tagAttr(xml, "device", "model");
  const powerStr = tagAttr(xml, "device", "power");
  const power = powerStr === "true" || powerStr === "1";
  const typeIdStr = tagAttr(xml, "device", "typeId");
  const typeId = typeIdStr ? parseInt(typeIdStr, 10) : undefined;

  const ports: XmlPort[] = [];
  for (const portXml of extractAllTags(xml, "port")) {
    const name = tagAttr(portXml, "port", "name") || extractXmlTagContent(portXml, "name");
    ports.push({
      name,
      ipAddress: extractXmlTagContent(portXml, "ipAddress") || undefined,
      subnetMask: extractXmlTagContent(portXml, "subnetMask") || undefined,
      macAddress: extractXmlTagContent(portXml, "macAddress") || undefined,
      status: extractXmlTagContent(portXml, "status") || undefined,
      protocol: extractXmlTagContent(portXml, "protocol") || undefined,
      vlan: parseInt(extractXmlTagContent(portXml, "vlan") || "0", 10) || undefined,
      mode: extractXmlTagContent(portXml, "mode") || undefined,
      description: extractXmlTagContent(portXml, "description") || undefined,
      bandwidth: extractXmlTagContent(portXml, "bandwidth") || undefined,
      delay: extractXmlTagContent(portXml, "delay") || undefined,
      duplex: extractXmlTagContent(portXml, "duplex") || undefined,
      speed: extractXmlTagContent(portXml, "speed") || undefined,
      encapsulation: extractXmlTagContent(portXml, "encapsulation") || undefined,
      trunkVlan: parseInt(extractXmlTagContent(portXml, "trunkVlan") || "0", 10) || undefined,
      type: extractXmlTagContent(portXml, "type") || undefined,
    });
  }

  const modules: XmlModule[] = [];
  for (const modXml of extractAllTags(xml, "module")) {
    const slot = tagAttr(modXml, "module", "slot") || extractXmlTagContent(modXml, "slot");
    let ports: string[] = [];
    const portsStr = extractXmlTagContent(modXml, "ports");
    if (portsStr) {
      ports = portsStr.split(",").map((p) => p.trim());
    }
    const portRefs = extractAllTags(modXml, "portRef");
    for (const refXml of portRefs) {
      const ref = extractXmlTagContent(refXml, "portRef");
      if (ref) ports.push(ref);
    }
    modules.push({
      slot,
      model: extractXmlTagContent(modXml, "model") || undefined,
      type: extractXmlTagContent(modXml, "type") || undefined,
      ports,
    });
  }

  const vlans: XmlVlan[] = [];
  for (const vlanXml of extractAllTags(xml, "vlan")) {
    vlans.push({
      id: parseInt(tagAttr(vlanXml, "vlan", "id") || extractXmlTagContent(vlanXml, "id") || "0", 10),
      name: extractXmlTagContent(vlanXml, "name") || undefined,
      state: extractXmlTagContent(vlanXml, "state") || undefined,
    });
  }

  const routingTable: XmlRoutingEntry[] = [];
  for (const routeXml of extractAllTags(xml, "route")) {
    routingTable.push({
      type: extractXmlTagContent(routeXml, "type") || "C",
      network: extractXmlTagContent(routeXml, "network") || "",
      mask: extractXmlTagContent(routeXml, "mask") || undefined,
      nextHop: extractXmlTagContent(routeXml, "nextHop") || undefined,
      interface: extractXmlTagContent(routeXml, "interface") || undefined,
      metric: extractXmlTagContent(routeXml, "metric") || undefined,
      distance: extractXmlTagContent(routeXml, "distance") || undefined,
      age: extractXmlTagContent(routeXml, "age") || undefined,
    });
  }

  const arpTable: XmlArpEntry[] = [];
  for (const arpXml of extractAllTags(xml, "arp")) {
    arpTable.push({
      ipAddress: extractXmlTagContent(arpXml, "ipAddress") || "",
      macAddress: extractXmlTagContent(arpXml, "macAddress") || "",
      interface: extractXmlTagContent(arpXml, "interface") || "",
      age: extractXmlTagContent(arpXml, "age") || undefined,
      type: extractXmlTagContent(arpXml, "type") || undefined,
    });
  }

  const macTable: XmlMacEntry[] = [];
  for (const macXml of extractAllTags(xml, "mac")) {
    macTable.push({
      vlan: extractXmlTagContent(macXml, "vlan") || "1",
      macAddress: extractXmlTagContent(macXml, "macAddress") || "",
      type: extractXmlTagContent(macXml, "type") || "",
      ports: (extractXmlTagContent(macXml, "ports") || "").split(",").map((p) => p.trim()),
    });
  }

  return {
    hostname: hostname || undefined,
    model: model || undefined,
    typeId: typeId,
    power: power,
    version: extractXmlTagContent(xml, "version") || undefined,
    uptime: extractXmlTagContent(xml, "uptime") || undefined,
    serialNumber: extractXmlTagContent(xml, "serialNumber") || undefined,
    configRegister: extractXmlTagContent(xml, "configRegister") || undefined,
    ports,
    modules,
    vlans,
    routingTable,
    arpTable,
    macTable,
    rawXml: xml,
    ospf: [],
    dhcpPools: [],
    extras: collectUnknownTags(xml),
  };
}