#!/usr/bin/env bun
/**
 * Tipos de especificación de laboratorios
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 * Reexporta tipos desde contracts/lab-spec.ts para compatibilidad.
 */

export type {
  LabSpec,
  LabDevice,
  LabConnection,
  DeviceInterface,
  ConnectionEndpoint,
  DeviceType,
  SwitchportMode,
  CableType,
  LabMetadata,
  ParsedLabYaml,
  ParsedDevice,
  ParsedConnection,
  TopologyStats,
  LabValidationResult,
} from '../contracts/lab-spec';

export {
  toLabSpec,
  loadLabYaml,
  validateLabSafe,
  analyzeTopology,
  generateMermaidDiagram,
  visualizeTopology,
} from '../contracts/lab-spec';

/**
 * Convierte un TopologySnapshot (del canvas PT) a LabSpec (modelo canónico)
 */
export function snapshotToLabSpec(snapshot: {
  devices: Record<string, { id?: string; name?: string; type?: string; [key: string]: unknown }>;
  links: Record<string, { source?: string | { deviceId: string; port?: string }; target?: string | { deviceId: string; port?: string }; sourceDeviceId?: string; targetDeviceId?: string; sourcePort?: string; targetPort?: string; [key: string]: unknown }>;
}): import('../contracts/lab-spec').LabSpec {
  const devices = Object.values(snapshot.devices);
  const links = Object.values(snapshot.links);

  return {
    metadata: {
      name: 'Canvas Topology',
      version: '1.0',
      author: 'PT CLI',
      createdAt: new Date(),
    },
    devices: devices.map((d) => {
      const name = d.name || d.id || '';
      return {
        id: name,
        name: name,
        type: (d.type || 'router') as import('../contracts/lab-spec').DeviceType,
        hostname: name,
      };
    }),
    connections: links.map((l) => {
      const from = typeof l.source === 'object' ? l.source : { deviceId: l.sourceDeviceId || '', port: l.sourcePort || '' };
      const to = typeof l.target === 'object' ? l.target : { deviceId: l.targetDeviceId || '', port: l.targetPort || '' };
      return {
        id: `${from.deviceId}-${to.deviceId}`,
        from: { deviceId: from.deviceId, deviceName: from.deviceId, port: from.port || '' },
        to: { deviceId: to.deviceId, deviceName: to.deviceId, port: to.port || '' },
      };
    }),
  };
}
