// ============================================================================
// Device XML Parser — Extrae estructura desde serializeToXml() de Packet Tracer
// ============================================================================
// Parser sin DOMParser — compatible con entorno QtScript de PT.
// Soporta tags reales de PT: IP, SUBNET, MACADDRESS, FULLDUPLEX, TYPE, PINS,
// AUTONEGOTIATE*, etc. No requiere <name> dentro de <PORT> — infiere desde
// RUNNINGCONFIG o desde índice de módulo.
//No usa DOMParser para mantener compatibilidad con el entorno QtScript de PT.

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
  pins?: string;
  power?: string;
  mediaType?: string;
  autoNegotiateBandwidth?: boolean;
  autoNegotiateSpeed?: boolean;
  autoNegotiateDuplex?: boolean;
  upMethod?: string;
  linkConnected?: boolean;
  linkRemoteName?: string;
  linkRemotePort?: string;
  clockRate?: string;
  channel?: string;
  vlanId?: number;
}

export interface XmlModule {
  slot: string;
  model?: string;
  type?: string;
  ports: string[];
}

export interface XmlVlan {
  id: number;
  name?: string;
  state?: string;
}

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

export interface XmlArpEntry {
  ipAddress: string;
  macAddress: string;
  interface: string;
  age?: string;
  type?: string;
}

export interface XmlMacEntry {
  vlan: string;
  macAddress: string;
  type: string;
  ports: string[];
}

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
  runningConfig?: string;
  startupConfig?: string;
}

// Alias para tags PT reales que difieren del nombre de campo
function tagContent(xml: string, tag: string, fallback = ""): string {
  const selfClosingRe = new RegExp(`<${tag}(?:\\s[^>]*)?\\/>`, "i");
  const openRe = new RegExp(`<${tag}(?:[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");

  const selfMatch = selfClosingRe.exec(xml);
  const openMatch = openRe.exec(xml);

  if (selfMatch && (!openMatch || selfMatch.index <= openMatch.index)) {
    return fallback;
  }
  return openMatch ? openMatch[1].trim() : fallback;
}

// Busca tag sin cierre (self-closing o con valor inmediato en atributo)
function tagSelfClosing(xml: string, tag: string, fallback = ""): string {
  const re = new RegExp(`<${tag}(?:[^>]*)?\\/>`, "i");
  const m = xml.match(re);
  return m ? (fallback !== "" ? fallback : m[0]) : fallback;
}

// Lee atributo desde tag completo
function tagHasAttr(xml: string, tag: string, attr: string): boolean {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=`, "i");
  return re.test(xml);
}

function tagAttrWithText(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}([^>]*)>([^<]*)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return fallback;
  const attrRe = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  const attrMatch = m[1].match(attrRe);
  return attrMatch ? m[2].trim() : fallback;
}

function tagAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["']`, "i");
  const m = xml.match(re);
  return m ? m[1] : fallback;
}

function tagContentAfterAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}(?:=[^>]*)?>([^<]*)`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : fallback;
}

function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:[\\s\\S]*?)<\\/${tag}>|<${tag}(?:\\s[^>]*)?\\/>`,
    "gi",
  );
  const matches: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[0]);
  }
  re.lastIndex = 0;
  return matches;
}

function allNonEmpty(...calls: string[][]): string[] {
  for (const c of calls) if (c.length > 0) return c;
  return [];
}

function parseBool(val: string): boolean {
  return val === "true" || val === "1" || val === "on";
}

function parseBoolOrStr(val: string): boolean | undefined {
  if (!val) return undefined;
  return val === "true" || val === "1" || val === "on";
}

function parsePortFromXml(
  portXml: string,
  portIndex: number,
  inferredName: string | null,
): XmlPort | null {
  const name =
    tagContent(portXml, "name") ||
    tagAttr(portXml, "port", "name") ||
    inferredName ||
    `port${portIndex}`;

  const port: XmlPort = { name };

  const ipEl = tagContent(portXml, "ipAddress") || tagContent(portXml, "IP");
  if (ipEl && ipEl !== "0.0.0.0") port.ipAddress = ipEl;

  const maskEl =
    tagContent(portXml, "subnetMask") ||
    tagContent(portXml, "mask") ||
    tagContent(portXml, "SUBNET");
  if (maskEl) port.subnetMask = maskEl;

  const macEl =
    tagContent(portXml, "macAddress") ||
    tagContent(portXml, "address") ||
    tagContent(portXml, "MACADDRESS");
  if (macEl && macEl !== "0000.0000.0000") port.macAddress = macEl;

  const statusEl = tagContent(portXml, "status") || tagContent(portXml, "lineStatus");
  if (statusEl) port.status = statusEl;

  const protoEl = tagContent(portXml, "protocolStatus") || tagContent(portXml, "protocol");
  if (protoEl) port.protocol = protoEl;

  const vlanEl = tagContent(portXml, "vlan");
  if (vlanEl) port.vlan = parseInt(vlanEl, 10);

  const modeEl = tagContent(portXml, "mode") || tagContent(portXml, "switchportMode");
  if (modeEl) port.mode = modeEl;

  const descEl = tagContent(portXml, "description") || tagContent(portXml, "DESCRIPTION");
  if (descEl) port.description = descEl;

  const bwEl =
    tagContent(portXml, "bandwidth") ||
    tagContent(portXml, "bandwidthKbps") ||
    tagContent(portXml, "BANDWIDTH");
  if (bwEl) port.bandwidth = bwEl;

  const delayEl = tagContent(portXml, "delay") || tagContent(portXml, "DELAY");
  if (delayEl) port.delay = delayEl;

  const duplexEl = tagContent(portXml, "duplex") || tagContent(portXml, "FULLDUPLEX");
  if (duplexEl) port.duplex = duplexEl;

  const speedEl = tagContent(portXml, "speed") || tagContent(portXml, "SPEED");
  if (speedEl) port.speed = speedEl;

  const encapEl = tagContent(portXml, "encapsulation");
  if (encapEl) port.encapsulation = encapEl;

  const trunkEl = tagContent(portXml, "trunkVlan") || tagContent(portXml, "nativeVlan");
  if (trunkEl) port.trunkVlan = parseInt(trunkEl, 10);

  const typeEl = tagContent(portXml, "type") || tagContent(portXml, "TYPE");
  if (typeEl) port.type = typeEl;

  const pinsEl = tagContent(portXml, "pins") || tagContent(portXml, "PINS");
  if (pinsEl) port.pins = pinsEl;

  const powerEl = tagContent(portXml, "power") || tagContent(portXml, "POWER");
  if (powerEl) port.power = powerEl;

  const mediaEl = tagContent(portXml, "mediaType") || tagContent(portXml, "MEDIATYPE");
  if (mediaEl) port.mediaType = mediaEl;

  const autoBwEl = tagContent(portXml, "AUTONEGOTIATEBANDWIDTH");
  if (autoBwEl) port.autoNegotiateBandwidth = parseBool(autoBwEl);

  const autoSpEl = tagContent(portXml, "AUTONEGOTIATESPEED");
  if (autoSpEl) port.autoNegotiateSpeed = parseBool(autoSpEl);

  const autoDpEl = tagContent(portXml, "AUTONEGOTIATEDUPLEX");
  if (autoDpEl) port.autoNegotiateDuplex = parseBool(autoDpEl);

  const upMethodEl = tagContent(portXml, "UP_METHOD") || tagContent(portXml, "upMethod");
  if (upMethodEl) port.upMethod = upMethodEl;

  const clockEl = tagContent(portXml, "CLOCKRATE") || tagContent(portXml, "clockRate");
  if (clockEl) port.clockRate = clockEl;

  const channelEl = tagContent(portXml, "channel") || tagContent(portXml, "CHANNEL");
  if (channelEl) port.channel = channelEl;

  const vlanIdEl = tagContent(portXml, "PORT_VLAN");
  if (vlanIdEl) port.vlanId = parseInt(vlanIdEl, 10);

  return port;
}

function parseModuleFromXml(modXml: string, modulePortNames: string[]): XmlModule | null {
  const slot =
    tagContent(modXml, "slot") ||
    tagAttr(modXml, "module", "slot") ||
    tagAttr(modXml, "SLOT", "TYPE");
  if (!slot && !tagContent(modXml, "MODEL")) return null;

  const portsEl = allTags(modXml, "port");
  const ports: string[] = [];

  portsEl.forEach((p, idx) => {
    const name =
      tagContent(p, "name") || tagAttr(p, "port", "name") || modulePortNames[idx] || `port${idx}`;
    if (name) ports.push(name);
  });

  return {
    slot: slot || "unknown",
    model: tagContent(modXml, "model") || tagContent(modXml, "MODEL"),
    type: tagContent(modXml, "type") || tagContent(modXml, "TYPE"),
    ports,
  };
}

function parseVlanFromXml(vlanXml: string): XmlVlan | null {
  const idEl =
    tagContent(vlanXml, "id") ||
    tagAttr(vlanXml, "vlan", "id") ||
    tagAttr(vlanXml, "VLAN", "number");
  if (!idEl) return null;
  return {
    id: parseInt(idEl, 10),
    name: tagContent(vlanXml, "name") || tagContent(vlanXml, "NAME"),
    state: tagContent(vlanXml, "state") || tagContent(vlanXml, "STATE"),
  };
}

function parseRoutingEntry(entryXml: string): XmlRoutingEntry {
  return {
    type: tagContent(entryXml, "type") || tagContent(entryXml, "routeType") || "?",
    network: tagContent(entryXml, "network") || tagContent(entryXml, "address") || "",
    mask: tagContent(entryXml, "mask") || tagContent(entryXml, "subnetMask"),
    nextHop:
      tagContent(entryXml, "nextHop") ||
      tagContent(entryXml, "gateway") ||
      tagContent(entryXml, "via"),
    interface:
      tagContent(entryXml, "interface") ||
      tagContent(entryXml, "outInterface") ||
      tagContent(entryXml, "intf"),
    metric: tagContent(entryXml, "metric"),
    distance: tagContent(entryXml, "administrativeDistance") || tagContent(entryXml, "distance"),
    age: tagContent(entryXml, "age"),
  };
}

function parseArpEntry(entryXml: string): XmlArpEntry {
  return {
    ipAddress: tagContent(entryXml, "ipAddress") || tagContent(entryXml, "address") || "",
    macAddress: tagContent(entryXml, "macAddress") || tagContent(entryXml, "hardwareAddress") || "",
    interface: tagContent(entryXml, "interface") || tagContent(entryXml, "port") || "",
    age: tagContent(entryXml, "age"),
    type: tagContent(entryXml, "type"),
  };
}

function parseMacEntry(entryXml: string): XmlMacEntry {
  return {
    vlan: tagContent(entryXml, "vlan") || "1",
    macAddress: tagContent(entryXml, "macAddress") || tagContent(entryXml, "address") || "",
    type: tagContent(entryXml, "type") || "dynamic",
    ports: (tagContent(entryXml, "ports") || tagContent(entryXml, "interface") || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

function extractPortNamesFromRunningConfig(xml: string): string[] {
  const names: string[] = [];
  const re = /interface\s+(\S+)/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    names.push(m[1]);
  }
  return names;
}

function extractPortNamesFromDeviceXml(xml: string): string[] {
  const names: string[] = [];
  const re = /<PORT[^>]*>\s*<TYPE>([^<]+)<\/TYPE>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    names.push(m[1]);
  }
  return names;
}

export function parseDeviceXml(xml: string): ParsedDeviceXml {
  if (!xml || xml.length < 10) {
    return {
      hostname: "",
      model: "",
      typeId: undefined,
      power: undefined,
      ports: [],
      modules: [],
      vlans: [],
      routingTable: [],
      arpTable: [],
      macTable: [],
      rawXml: xml || "",
    };
  }

  let hostname =
    tagContent(xml, "hostname") || tagContent(xml, "name") || tagContent(xml, "deviceName");
  if (tagHasAttr(xml, "NAME", "translate")) {
    const translated = tagContentAfterAttr(xml, "NAME", "translate");
    if (translated) hostname = translated;
  }
  if (!hostname) hostname = tagContent(xml, "NAME");

  const model =
    tagAttr(xml, "TYPE", "model") || tagContent(xml, "model") || tagContent(xml, "MODEL");

  const typeIdStr =
    tagContent(xml, "typeId") || tagContent(xml, "deviceType") || tagContent(xml, "TYPE");

  const typeId = typeIdStr ? parseInt(typeIdStr, 10) : undefined;

  const powerStr =
    tagContent(xml, "power") || tagContent(xml, "powerState") || tagContent(xml, "POWER");
  const power = powerStr === "on" || powerStr === "true" || powerStr === "1";

  const version =
    tagContent(xml, "iosVersion") || tagContent(xml, "version") || tagContent(xml, "VERSION");

  const uptime = tagContent(xml, "uptime") || tagContent(xml, "STARTTIME");
  const serialNumber =
    tagContent(xml, "serialNumber") || tagContent(xml, "serial") || tagContent(xml, "SERIALNUMBER");
  const configRegister = tagContent(xml, "configRegister") || tagContent(xml, "CONFIG_REGISTER");

  const runningConfig =
    tagContent(xml, "runningConfig") ||
    tagContent(xml, "RUNNINGCONFIG") ||
    tagContent(xml, "config");
  const startupConfig =
    tagContent(xml, "startupConfig") ||
    tagContent(xml, "STARTUPCONFIG") ||
    tagContent(xml, "config");

  const portNamesFromConfig = extractPortNamesFromRunningConfig(xml);

  const portXmls = allTags(xml, "port");
  const ports: XmlPort[] = [];

  for (let i = 0; i < portXmls.length; i++) {
    const inferredName = portNamesFromConfig[i] || null;
    const p = parsePortFromXml(portXmls[i], i, inferredName);
    if (p) ports.push(p);
  }

  const modXmls = allTags(xml, "module");
  const modules: XmlModule[] = [];
  let modulePortIdx = 0;

  for (let mIdx = 0; mIdx < modXmls.length; mIdx++) {
    const modPorts: string[] = [];
    const modPortXmls = allTags(modXmls[mIdx], "port");
    for (let pIdx = 0; pIdx < modPortXmls.length; pIdx++) {
      const name =
        tagContent(modPortXmls[pIdx], "name") ||
        tagAttr(modPortXmls[pIdx], "port", "name") ||
        portNamesFromConfig[modulePortIdx] ||
        `port${pIdx}`;
      if (name) modPorts.push(name);
      modulePortIdx++;
    }
    if (modPorts.length > 0 || tagContent(modXmls[mIdx], "MODEL")) {
      modules.push({
        slot:
          tagContent(modXmls[mIdx], "slot") ||
          tagAttr(modXmls[mIdx], "SLOT", "TYPE") ||
          `slot${mIdx}`,
        model: tagContent(modXmls[mIdx], "model") || tagContent(modXmls[mIdx], "MODEL"),
        type: tagContent(modXmls[mIdx], "type") || tagContent(modXmls[mIdx], "TYPE"),
        ports: modPorts,
      });
    }
  }

  const vlanXmls = allTags(xml, "vlan");
  const vlans: XmlVlan[] = [];
  for (const vx of vlanXmls) {
    const v = parseVlanFromXml(vx);
    if (v) vlans.push(v);
  }

  const routingXmls = allNonEmpty(
    allTags(xml, "route"),
    allTags(xml, "routingEntry"),
    allTags(xml, "ipRoute"),
  );
  const routingTable: XmlRoutingEntry[] = routingXmls
    .map(parseRoutingEntry)
    .filter((r) => r.network);

  const arpXmls = allNonEmpty(allTags(xml, "arpEntry"), allTags(xml, "arp"));
  const arpTable: XmlArpEntry[] = arpXmls.map(parseArpEntry).filter((a) => a.ipAddress);

  const macXmls = allNonEmpty(
    allTags(xml, "macEntry"),
    allTags(xml, "macAddressEntry"),
    allTags(xml, "macTableEntry"),
  );
  const macTable: XmlMacEntry[] = macXmls.map(parseMacEntry).filter((m) => m.macAddress);

  return {
    hostname,
    model,
    typeId,
    power,
    version,
    uptime,
    serialNumber,
    configRegister,
    ports,
    modules,
    vlans,
    routingTable,
    arpTable,
    macTable,
    rawXml: xml,
    runningConfig,
    startupConfig,
  };
}

export function extractRunningConfig(xml: string): string {
  return (
    tagContent(xml, "runningConfig") ||
    tagContent(xml, "RUNNINGCONFIG") ||
    tagContent(xml, "startupConfig") ||
    tagContent(xml, "STARTUPCONFIG") ||
    tagContent(xml, "config") ||
    xml
  );
}

export function extractVlanTable(xml: string): XmlVlan[] {
  const vlanXmls = allTags(xml, "vlan");
  return vlanXmls.map(parseVlanFromXml).filter((v) => v !== null) as XmlVlan[];
}

export function extractInterfaceList(xml: string): XmlPort[] {
  const portXmls = allTags(xml, "port");
  const portNamesFromConfig = extractPortNamesFromRunningConfig(xml);
  return portXmls
    .map((p, i) => parsePortFromXml(p, i, portNamesFromConfig[i] || null))
    .filter((p) => p !== null) as XmlPort[];
}

export function extractHostname(xml: string): string {
  if (tagHasAttr(xml, "NAME", "translate")) {
    const val = tagContentAfterAttr(xml, "NAME", "translate");
    if (val) return val;
  }
  return tagContent(xml, "NAME") || tagContent(xml, "hostname") || tagContent(xml, "name") || "";
}

export function extractModel(xml: string): string {
  return (
    tagAttr(xml, "TYPE", "model") || tagContent(xml, "model") || tagContent(xml, "MODEL") || ""
  );
}

export function extractMacAddressTable(xml: string): XmlMacEntry[] {
  const macXmls = allNonEmpty(
    allTags(xml, "macEntry"),
    allTags(xml, "macAddressEntry"),
    allTags(xml, "macTableEntry"),
  );
  return macXmls.map(parseMacEntry).filter((m) => m.macAddress);
}

export function extractRoutingTable(xml: string): XmlRoutingEntry[] {
  const routingXmls = allNonEmpty(
    allTags(xml, "route"),
    allTags(xml, "routingEntry"),
    allTags(xml, "ipRoute"),
  );
  return routingXmls.map(parseRoutingEntry).filter((r) => r.network);
}

export function extractArpTable(xml: string): XmlArpEntry[] {
  const arpXmls = allNonEmpty(allTags(xml, "arpEntry"), allTags(xml, "arp"));
  return arpXmls.map(parseArpEntry).filter((a) => a.ipAddress);
}

export function siphonDevice(name: string, xml: string): string {
  const parsed = parseDeviceXml(xml);
  const parts: string[] = [`name:::${name}`];

  if (parsed.hostname) parts.push(`hostname:::${parsed.hostname}`);
  if (parsed.model) parts.push(`model:::${parsed.model}`);
  if (parsed.typeId !== undefined) parts.push(`typeId:::${parsed.typeId}`);
  if (parsed.power !== undefined) parts.push(`power:::${parsed.power}`);
  if (parsed.serialNumber) parts.push(`serial:::${parsed.serialNumber}`);
  if (parsed.runningConfig) parts.push(`config:::${parsed.runningConfig.slice(0, 200)}...`);

  for (const port of parsed.ports) {
    parts.push(
      `port::${port.name}::ip=${port.ipAddress || "none"}::mask=${port.subnetMask || "none"}::mac=${port.macAddress || "none"}::type=${port.type || "none"}::duplex=${port.duplex || "none"}::speed=${port.speed || "none"}`,
    );
  }

  for (const vlan of parsed.vlans) {
    parts.push(`vlan::${vlan.id}::${vlan.name || ""}::${vlan.state || ""}`);
  }

  for (const route of parsed.routingTable) {
    parts.push(
      `route::${route.type}::${route.network}/${route.mask || ""}::via=${route.nextHop || "none"}::intf=${route.interface || "none"}`,
    );
  }

  return parts.join("|||");
}
