/**
 * TOPOLOGY VISUALIZER
 * Genera representaciones visuales de topologías de red
 */

import type { LabSpec, DeviceSpec, ConnectionSpec } from '@cisco-auto/lab-model';

export interface VisualizationOptions {
  showIPs?: boolean;
  showPorts?: boolean;
  showCables?: boolean;
  maxWidth?: number;
}

const DEVICE_ICONS: Record<string, string> = {
  'router': '⬡',
  'switch': '▣',
  'multilayer-switch': '◈',
  'pc': '💻',
  'server': '🖧',
  'wireless-router': '📡',
  'access-point': '📶',
  'cloud': '☁️',
  'firewall': '🛡️'
};

const CABLE_SYMBOLS: Record<string, string> = {
  'eStraightThrough': '══',
  'eCrossOver': '╳╳',
  'eSerialDCE': '▬▬',
  'eSerialDTE': '▬▬',
  'eFiber': '◦◦',
  'ePhone': '¤¤',
  'eWireless': '~~'
};

/**
 * Genera una visualización ASCII de la topología
 */
export function visualizeTopology(lab: LabSpec, options: VisualizationOptions = {}): string {
  const { showIPs = true, showPorts = false, showCables = false } = options;
  
  const lines: string[] = [];
  
  // Header
  lines.push('');
  lines.push('╔' + '═'.repeat(58) + '╗');
  lines.push(`║  TOPOLOGY: ${(lab.metadata.name || 'Lab').padEnd(44)}║`);
  lines.push('╠' + '═'.repeat(58) + '╣');
  
  // Devices section
  lines.push('║  DEVICES:                                              ║');
  lines.push('║' + '─'.repeat(58) + '║');
  
  // Group devices by type
  const devicesByType = new Map<string, DeviceSpec[]>();
  for (const device of lab.devices) {
    const type = device.type || 'unknown';
    if (!devicesByType.has(type)) {
      devicesByType.set(type, []);
    }
    devicesByType.get(type)!.push(device);
  }
  
  for (const [type, devices] of devicesByType) {
    const icon = DEVICE_ICONS[type] || '■';
    for (const device of devices) {
      let line = `║  ${icon} ${device.name}`;
      
      if (showIPs && device.managementIp) {
        line += ` [${device.managementIp}]`;
      }
      
      // Pad to align right border
      const paddedLine = line.padEnd(57) + '║';
      lines.push(paddedLine);
    }
  }
  
  // Connections section
  lines.push('║                                                        ║');
  lines.push('║  CONNECTIONS:                                          ║');
  lines.push('║' + '─'.repeat(58) + '║');
  
  for (const conn of lab.connections) {
    const cableSymbol = showCables ? (CABLE_SYMBOLS[conn.cableType] || '──') : '──';
    
    let fromStr = conn.from.deviceName;
    let toStr = conn.to.deviceName;
    
    if (showPorts) {
      fromStr += `:${conn.from.port}`;
      toStr += `:${conn.to.port}`;
    }
    
    const line = `║  ${fromStr} ${cableSymbol} ${toStr}`;
    const paddedLine = line.padEnd(57) + '║';
    lines.push(paddedLine);
  }
  
  lines.push('╚' + '═'.repeat(58) + '╝');
  
  return lines.join('\n');
}

/**
 * Genera un diagrama en formato Mermaid
 */
export function generateMermaidDiagram(lab: LabSpec): string {
  const lines: string[] = [];
  
  lines.push('```mermaid');
  lines.push('graph TB');
  
  // Define subgraphs by device type
  const routers = lab.devices.filter(d => d.type === 'router');
  const switches = lab.devices.filter(d => d.type === 'switch' || d.type === 'multilayer-switch');
  const endDevices = lab.devices.filter(d => d.type === 'pc' || d.type === 'server');
  
  if (routers.length > 0) {
    lines.push('  subgraph Routers');
    for (const r of routers) {
      lines.push(`    ${sanitizeId(r.name)}["${r.name}<br/>Router"]`);
    }
    lines.push('  end');
  }
  
  if (switches.length > 0) {
    lines.push('  subgraph Switches');
    for (const s of switches) {
      lines.push(`    ${sanitizeId(s.name)}["${s.name}<br/>Switch"]`);
    }
    lines.push('  end');
  }
  
  if (endDevices.length > 0) {
    lines.push('  subgraph End Devices');
    for (const d of endDevices) {
      lines.push(`    ${sanitizeId(d.name)}["${d.name}"]`);
    }
    lines.push('  end');
  }
  
  // Add connections
  const connectionSet = new Set<string>();
  for (const conn of lab.connections) {
    const fromId = sanitizeId(conn.from.deviceName);
    const toId = sanitizeId(conn.to.deviceName);
    const key = [fromId, toId].sort().join('-');
    
    if (!connectionSet.has(key)) {
      lines.push(`  ${fromId} --- ${toId}`);
      connectionSet.add(key);
    }
  }
  
  lines.push('```');
  
  return lines.join('\n');
}

/**
 * Genera una matriz de adyacencia
 */
export function generateAdjacencyMatrix(lab: LabSpec): string {
  const lines: string[] = [];
  const deviceNames = lab.devices.map(d => d.name);
  const n = deviceNames.length;
  
  // Build adjacency matrix
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (const conn of lab.connections) {
    const fromIdx = deviceNames.indexOf(conn.from.deviceName);
    const toIdx = deviceNames.indexOf(conn.to.deviceName);
    
    if (fromIdx >= 0 && toIdx >= 0) {
      matrix[fromIdx][toIdx] = 1;
      matrix[toIdx][fromIdx] = 1;
    }
  }
  
  // Generate output
  lines.push('\nAdjacency Matrix:');
  
  // Header
  const maxLen = Math.max(...deviceNames.map(n => n.length), 3);
  const pad = ' '.repeat(maxLen + 1);
  
  let header = pad;
  for (const name of deviceNames) {
    header += name.substring(0, 3).padEnd(4);
  }
  lines.push(header);
  
  // Rows
  for (let i = 0; i < n; i++) {
    let row = deviceNames[i].padEnd(maxLen + 1);
    for (let j = 0; j < n; j++) {
      row += `  ${matrix[i][j]} `;
    }
    lines.push(row);
  }
  
  return lines.join('\n');
}

/**
 * Analiza la topología y retorna estadísticas
 */
export function analyzeTopology(lab: LabSpec): {
  deviceCount: number;
  connectionCount: number;
  density: number;
  connectedComponents: number;
  avgConnections: number;
  deviceTypeDistribution: Record<string, number>;
} {
  const n = lab.devices.length;
  const m = lab.connections.length;
  
  // Calculate connected components using BFS
  const adjacency = new Map<string, Set<string>>();
  
  for (const device of lab.devices) {
    adjacency.set(device.name, new Set());
  }
  
  for (const conn of lab.connections) {
    adjacency.get(conn.from.deviceName)?.add(conn.to.deviceName);
    adjacency.get(conn.to.deviceName)?.add(conn.from.deviceName);
  }
  
  const visited = new Set<string>();
  let components = 0;
  
  for (const device of lab.devices) {
    if (!visited.has(device.name)) {
      components++;
      const queue = [device.name];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        
        for (const neighbor of adjacency.get(current) || []) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
  }
  
  // Device type distribution
  const typeDist: Record<string, number> = {};
  for (const device of lab.devices) {
    const type = device.type || 'unknown';
    typeDist[type] = (typeDist[type] || 0) + 1;
  }
  
  // Calculate density
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? m / maxEdges : 0;
  
  return {
    deviceCount: n,
    connectionCount: m,
    density: Math.round(density * 100) / 100,
    connectedComponents: components,
    avgConnections: n > 0 ? Math.round((m * 2 / n) * 100) / 100 : 0,
    deviceTypeDistribution: typeDist
  };
}

/**
 * Sanitiza un nombre para uso como ID en Mermaid
 */
function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
