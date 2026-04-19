export interface DeviceGenome {
  name: string;
  model: string;
  power: boolean;
  serialNumber: string;
  physicalLocation: { x: number; y: number };
  chasis: { modules: any[] };
  ios: {
    hostname: string;
    version: string;
    runningConfig: string;
    passwords: { enable?: string; secret?: string };
  };
  ports: string[];
}

export interface PortIntelligence {
  name: string;
  status: "UP" | "DOWN" | "NEGOTIATING";
  physical: { mac: string; bia: string; bandwidth: number; duplex: string };
  logical: { ip: string; mask: string; ipv6: string[]; aclIn?: string; aclOut?: string };
  routing: { ospfHello?: number; ospfCost?: number };
  neighbor?: string;
}

export interface DeepDeviceContext {
  genome: DeviceGenome;
  interfaces: PortIntelligence[];
}

export interface NetworkTopology {
  devices: string[];
  links: { id: string; from: string; to: string }[];
}

export interface AuditReport {
  score: { current: number; total: number; percentage: number };
  time: { elapsedSeconds: number; formatted: string };
  instructions: string;
  checks: any[];
}
