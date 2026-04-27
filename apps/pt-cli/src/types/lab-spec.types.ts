export interface ParsedLabYaml {
  lab?: {
    metadata?: {
      name?: string;
      version?: string;
      author?: string;
    };
    topology?: {
      devices?: Array<{ name: string; type: string; model: string }>;
      connections?: Array<{ from: string; to: string }>;
    };
  };
}

export interface LabSpec {
  metadata: { name: string; version: string; author: string };
  devices: Array<{ name: string; type: string; model: string }>;
  connections: Array<{ from: string; to: string }>;
}

function normalizeLab(parsed: ParsedLabYaml | null | undefined): NonNullable<ParsedLabYaml["lab"]> {
  return parsed?.lab ?? {};
}

export function toLabSpec(parsed: ParsedLabYaml | null | undefined): LabSpec {
  const lab = normalizeLab(parsed);
  const topology = lab.topology ?? {};

  return {
    metadata: {
      name: lab.metadata?.name ?? "Lab",
      version: lab.metadata?.version ?? "1.0",
      author: lab.metadata?.author ?? "PT CLI",
    },
    devices: [...(topology.devices ?? [])],
    connections: [...(topology.connections ?? [])],
  };
}

export function snapshotToLabSpec(snapshot: { devices?: Record<string, any>; links?: Record<string, any> } | null | undefined): LabSpec {
  const devices = Object.values(snapshot?.devices ?? {}).map((device: any) => ({
    name: device.name ?? device.id ?? "",
    type: device.type ?? "generic",
    model: device.model ?? "",
  }));

  const connections = Object.values(snapshot?.links ?? {}).map((link: any) => ({
    from: `${link.sourceDeviceId ?? link.device1 ?? ""}:${link.sourcePort ?? link.port1 ?? ""}`,
    to: `${link.targetDeviceId ?? link.device2 ?? ""}:${link.targetPort ?? link.port2 ?? ""}`,
  }));

  return {
    metadata: {
      name: "Canvas Topology",
      version: "1.0",
      author: "PT CLI",
    },
    devices,
    connections,
  };
}
