export type MultiuserAcceptMode = "always" | "never" | "manual";

export interface MultiuserServerConfig {
  port: number;
  password: string;
  acceptMode: MultiuserAcceptMode;
  localName?: string;
}

export interface MultiuserConnection {
  peerId: string;
  peerName: string;
  remoteAddress: string;
  remotePort: number;
  connectedAt: string;
  bytesSent: number;
  bytesReceived: number;
}

export interface MultiuserStatus {
  serverRunning: boolean;
  listenPort?: number;
  localName: string;
  enabled: boolean;
  clientCount: number;
  connections: MultiuserConnection[];
}

export interface MultiuserConnectOptions {
  host: string;
  port: number;
  password: string;
  name?: string;
}

export interface MultiuserPeerEvent {
  type: "connected" | "disconnected";
  peerId: string;
  peerName: string;
  timestamp: string;
}

export interface MultiuserIPCResponse {
  enabled: boolean;
  port: number;
  clients: number;
  name: string;
}

export function createEmptyMultiuserStatus(localName?: string): MultiuserStatus {
  return {
    serverRunning: false,
    localName: localName ?? "local",
    enabled: false,
    clientCount: 0,
    connections: [],
  };
}
