// ============================================================================
// Registro de la API PT - fuente unica de verdad para tipos nativos de Packet Tracer
// ============================================================================

export interface PTIpc {
  network(): PTNetwork;
  appWindow(): PTAppWindow;
  systemFileManager(): PTFileManager;
}

export interface PTAppWindow {
  getActiveWorkspace(): PTWorkspace;
}

export interface PTWorkspace {
  getLogicalWorkspace(): PTLogicalWorkspace;
}

export interface PTLogicalWorkspace {
  addDevice(typeId: number, model: string, x: number, y: number): string | null;
  removeDevice(name: string): boolean;
  deleteDevice(name: string): boolean;
  removeObject(name: string): boolean;
  deleteObject(name: string): boolean;
  createLink(
    device1Name: string,
    port1Name: string,
    device2Name: string,
    port2Name: string,
    cableType: number,
  ): PTLink | null;
  deleteLink(deviceName: string, portName: string): boolean;
}

export interface PTNetwork {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
}

export interface PTDevice {
  getName(): string;
  setName(name: string): void;
  getModel(): string;
  getType(): number;
  getPower(): boolean;
  setPower(on: boolean): void;
  skipBoot(): void;
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  getPort(name: string): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
  moveToLocation(x: number, y: number): boolean;
  moveToLocationCentered(x: number, y: number): boolean;
}

export interface PTCommandLine {
  enterCommand(cmd: string, prompt?: string): [number, string];
  getPrompt(): string;
  getMode(): string;
  getCommandInput(): string;
  enterChar(charCode: number, modifier: number): void;
  registerEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
  unregisterEvent(
    eventName: PTTerminalEventName,
    context: null,
    handler: (source: any, args: any) => void,
  ): void;
}

export type PTTerminalEventName =
  | "commandStarted"
  | "outputWritten"
  | "commandEnded"
  | "modeChanged"
  | "promptChanged"
  | "moreDisplayed"
  | "directiveSent"
  | "commandSelectedFromHistory"
  | "commandAutoCompleted"
  | "cursorPositionChanged";

export interface PTOutputWrittenArgs {
  newOutput: string;
  isDebug?: boolean;
}

export interface PTCommandStartedArgs {
  inputCommand: string;
  completeCommand: string;
  inputMode: string;
  processedCommand?: string;
}

export interface PTCommandEndedArgs {
  status: number;
}

export interface PTModeChangedArgs {
  newMode: string;
}

export interface PTPromptChangedArgs {
  newPrompt: string;
}

export interface PTPort {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  getDefaultGateway(): string;
  setDefaultGateway(gateway: string): void;
  getDnsServerIp(): string;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getIpv6Enabled(): boolean;
  getIpv6Address(): string;
  setIpv6AddressAutoConfig(enabled: boolean): void;
  setv6DefaultGateway(gateway: string): void;
  getv6DefaultGateway(): string;
  setv6ServerIp(dns: string): void;
  getv6ServerIp(): string;
  setIpv6Mtu(mtu: number): void;
  getIpv6Mtu(): number;
  isPortUp(): boolean;
  isProtocolUp(): boolean;
  setInboundFirewallService(state: string): void;
  getInboundFirewallService(): string;
  getInboundFirewallServiceStatus(): string;
  setInboundIpv6FirewallService(state: string): void;
  getInboundIpv6FirewallService(): string;
  getInboundIpv6FirewallServiceStatus(): string;
  setMtu(mtu: number): void;
  getMtu(): number;
  setIpMtu(mtu: number): void;
  getIpMtu(): number;
  getConnectorType?(): string;
}

export interface PTLink {}

export interface PTFileManager {
  getFileContents(path: string): string;
  writePlainTextToFile(path: string, content: string): void;
  fileExists(path: string): string | boolean;
}

export interface PTGlobalScope {
  ipc: PTIpc;
  fm: PTFileManager;
  dprint: (message: string) => void;
  DEV_DIR: string;
}

export const PT_API_METHOD_INDEX: Record<string, string[]> = {
  PTIpc: ["network", "appWindow", "systemFileManager"],
  PTAppWindow: ["getActiveWorkspace"],
  PTWorkspace: ["getLogicalWorkspace"],
  PTLogicalWorkspace: [
    "addDevice",
    "removeDevice",
    "deleteDevice",
    "removeObject",
    "deleteObject",
    "createLink",
    "deleteLink",
  ],
  PTNetwork: ["getDevice", "getDeviceAt", "getDeviceCount"],
  PTDevice: [
    "getName",
    "setName",
    "getModel",
    "getType",
    "getPower",
    "setPower",
    "skipBoot",
    "getCommandLine",
    "getPortCount",
    "getPortAt",
    "getPort",
    "addModule",
    "removeModule",
    "setDhcpFlag",
    "getDhcpFlag",
    "moveToLocation",
    "moveToLocationCentered",
  ],
  PTCommandLine: [
    "enterCommand",
    "getPrompt",
    "getMode",
    "getCommandInput",
    "enterChar",
    "registerEvent",
    "unregisterEvent",
  ],
  PTPort: [
    "getName",
    "getIpAddress",
    "getSubnetMask",
    "setIpSubnetMask",
    "getDefaultGateway",
    "setDefaultGateway",
    "getDnsServerIp",
    "setDnsServerIp",
    "setDhcpEnabled",
    "setDhcpClientFlag",
    "isDhcpClientOn",
    "setIpv6Enabled",
    "getIpv6Enabled",
    "getIpv6Address",
    "setIpv6AddressAutoConfig",
    "setv6DefaultGateway",
    "getv6DefaultGateway",
    "setv6ServerIp",
    "getv6ServerIp",
    "setIpv6Mtu",
    "getIpv6Mtu",
    "isPortUp",
    "isProtocolUp",
    "setInboundFirewallService",
    "getInboundFirewallService",
    "getInboundFirewallServiceStatus",
    "setInboundIpv6FirewallService",
    "getInboundIpv6FirewallService",
    "getInboundIpv6FirewallServiceStatus",
    "setMtu",
    "getMtu",
    "setIpMtu",
    "getIpMtu",
  ],
  PTFileManager: ["getFileContents", "writePlainTextToFile", "fileExists"],
  ipc: ["network", "appWindow", "systemFileManager"],
  "ipc.network()": ["getDevice", "getDeviceAt", "getDeviceCount"],
  "ipc.appWindow()": ["getActiveWorkspace"],
  "ipc.appWindow().getActiveWorkspace()": ["getLogicalWorkspace"],
  "ipc.appWindow().getActiveWorkspace().getLogicalWorkspace()": [
    "addDevice",
    "removeDevice",
    "deleteDevice",
    "removeObject",
    "deleteObject",
    "createLink",
    "deleteLink",
  ],
  "ipc.systemFileManager()": ["getFileContents", "writePlainTextToFile", "fileExists"],
};

export const PT_DEVICE_TYPE_CONSTANTS: Record<string, number> = {
  router: 0,
  switch: 1,
  hub: 2,
  repeater: 3,
  bridge: 4,
  wireless: 5,
  wanEmulator: 6,
  multilayerSwitch: 16,
  cloud: 7,
  pc: 8,
  server: 9,
  printer: 10,
  ipPhone: 11,
  laptop: 12,
  tablet: 13,
  smartphone: 14,
  wirelessEndDevice: 15,
  wiredEndDevice: 17,
  tv: 18,
  homeVoip: 19,
  analogPhone: 20,
  iot: 21,
  sniffer: 22,
  mcu: 23,
  sbc: 24,
};

export const PT_CABLE_TYPE_CONSTANTS: Record<string, number> = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  cable: 6,
  roll: 7,
  wireless: 8,
  coaxial: 9,
  custom: 10,
  octal: 11,
  cellular: 12,
  usb: 13,
};
