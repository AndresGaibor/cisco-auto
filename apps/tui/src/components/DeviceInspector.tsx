/**
 * DeviceInspector Component
 * 
 * Muestra detalles completos del dispositivo seleccionado:
 * - Interfaces con sus estados
 * - Tabla MAC (para switches)
 * - Tabla ARP (para routers)
 * - Tabla de rutas (para routers)
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../hooks/useSimulator';
import type { DeviceRuntime, InterfaceRuntime, MACEntry, ARPEntry, RouteEntry } from '@cisco-auto/sim-runtime';

/**
 * Obtiene CIDR de una máscara de subred
 */
function getCIDR(mask?: string): number {
  if (!mask) return 0;
  const octets = mask.split('.').map(Number);
  let cidr = 0;
  for (const octet of octets) {
    let bits = octet;
    while (bits) {
      cidr += bits & 1;
      bits >>= 1;
    }
  }
  return cidr;
}

/**
 * Formatea tiempo relativo
 */
function formatRelativeTime(learnedAt: number, now: number): string {
  const diff = now - learnedAt;
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  return `${Math.floor(diff / 60000)}m`;
}

/**
 * Componente para mostrar una interfaz
 */
function InterfaceRow({ iface, now }: { iface: InterfaceRuntime; now: number }) {
  const statusColor = iface.linkStatus === 'up' ? 'green' : 'red';
  const adminIndicator = iface.adminStatus === 'up' ? '▲' : '▼';
  
  return (
    <Box flexDirection="column" marginLeft={1}>
      {/* Nombre y estado */}
      <Box>
        <Text color={statusColor} bold>
          {iface.name}
        </Text>
        <Text color={iface.adminStatus === 'up' ? 'green' : 'red'}>
          {` ${adminIndicator}`}
        </Text>
        <Text color={statusColor}>
          {` ${iface.adminStatus}/${iface.linkStatus}`}
        </Text>
      </Box>
      
      {/* Direcciones */}
      {iface.ip && (
        <Box marginLeft={2}>
          <Text dimColor>IP: </Text>
          <Text color="cyan">{iface.ip}</Text>
          <Text dimColor>/{getCIDR(iface.subnetMask)}</Text>
        </Box>
      )}
      
      <Box marginLeft={2}>
        <Text dimColor>MAC: </Text>
        <Text color="yellow">{iface.mac}</Text>
      </Box>
      
      {/* VLAN y modo */}
      <Box marginLeft={2}>
        <Text dimColor>VLAN: </Text>
        <Text>{iface.vlan}</Text>
        {iface.switchportMode !== 'none' && (
          <>
            <Text dimColor> Mode: </Text>
            <Text color="magenta">{iface.switchportMode}</Text>
          </>
        )}
      </Box>
      
      {/* Estadísticas */}
      <Box marginLeft={2}>
        <Text dimColor>
          {`TX: ${iface.txPackets}pkts/${Math.floor(iface.txBytes / 1024)}KB | RX: ${iface.rxPackets}pkts/${Math.floor(iface.rxBytes / 1024)}KB`}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Componente para tabla MAC
 */
function MACTableView({ macTable, now }: { macTable: Map<string, MACEntry>; now: number }) {
  const entries = Array.from(macTable.values()).slice(0, 8);
  
  if (entries.length === 0) {
    return (
      <Box marginLeft={1}>
        <Text dimColor>(empty)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" marginLeft={1}>
      {/* Header */}
      <Box>
        <Box width={18}><Text bold dimColor>MAC Address</Text></Box>
        <Box width={8}><Text bold dimColor>VLAN</Text></Box>
        <Box width={10}><Text bold dimColor>Port</Text></Box>
        <Box width={8}><Text bold dimColor>Age</Text></Box>
      </Box>
      
      {/* Entries */}
      {entries.map((entry, i) => (
        <Box key={i}>
          <Box width={18}><Text color="yellow">{entry.mac}</Text></Box>
          <Box width={8}><Text>{entry.vlan}</Text></Box>
          <Box width={10}><Text color="cyan">{entry.port}</Text></Box>
          <Box width={8}><Text dimColor>{formatRelativeTime(entry.learnedAt, now)}</Text></Box>
        </Box>
      ))}
      
      {macTable.size > 8 && (
        <Box>
          <Text dimColor>... and {macTable.size - 8} more</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Componente para tabla ARP
 */
function ARPTableView({ arpTable, now }: { arpTable: Map<string, ARPEntry>; now: number }) {
  const entries = Array.from(arpTable.values()).slice(0, 8);
  
  if (entries.length === 0) {
    return (
      <Box marginLeft={1}>
        <Text dimColor>(empty)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" marginLeft={1}>
      {/* Header */}
      <Box>
        <Box width={16}><Text bold dimColor>IP Address</Text></Box>
        <Box width={18}><Text bold dimColor>MAC Address</Text></Box>
        <Box width={10}><Text bold dimColor>State</Text></Box>
      </Box>
      
      {/* Entries */}
      {entries.map((entry, i) => (
        <Box key={i}>
          <Box width={16}><Text color="cyan">{entry.ip}</Text></Box>
          <Box width={18}><Text color="yellow">{entry.mac}</Text></Box>
          <Box width={10}>
            <Text 
              color={entry.state === 'reachable' ? 'green' : entry.state === 'stale' ? 'yellow' : 'red'}
            >
              {entry.state}
            </Text>
          </Box>
        </Box>
      ))}
      
      {arpTable.size > 8 && (
        <Box>
          <Text dimColor>... and {arpTable.size - 8} more</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Componente para tabla de rutas
 */
function RoutingTableView({ routes }: { routes: RouteEntry[] }) {
  const displayRoutes = routes.slice(0, 8);
  
  if (displayRoutes.length === 0) {
    return (
      <Box marginLeft={1}>
        <Text dimColor>(empty)</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" marginLeft={1}>
      {/* Header */}
      <Box>
        <Box width={20}><Text bold dimColor>Destination</Text></Box>
        <Box width={14}><Text bold dimColor>Next Hop</Text></Box>
        <Box width={4}><Text bold dimColor>AD</Text></Box>
        <Box width={10}><Text bold dimColor>Protocol</Text></Box>
      </Box>
      
      {/* Entries */}
      {displayRoutes.map((route, i) => (
        <Box key={i}>
          <Box width={20}>
            <Text color="cyan">
              {route.network}/{route.cidr}
            </Text>
          </Box>
          <Box width={14}>
            <Text color="green">
              {route.nextHop || 'connected'}
            </Text>
          </Box>
          <Box width={4}><Text>{route.administrativeDistance}</Text></Box>
          <Box width={10}><Text color="magenta">{route.protocol}</Text></Box>
        </Box>
      ))}
      
      {routes.length > 8 && (
        <Box>
          <Text dimColor>... and {routes.length - 8} more</Text>
        </Box>
      )}
    </Box>
  );
}

export function DeviceInspector() {
  const { runtime, selectedDevice } = useSimulator();
  
  // All hooks must be called before any early returns
  const device = runtime?.devices.get(selectedDevice ?? '');
  
  const interfaces = useMemo(
    () => device ? Array.from(device.interfaces.values()) : [],
    [device]
  );
  
  const isSwitch = device?.type === 'switch' || device?.type === 'multilayer-switch';
  const isRouter = device?.type === 'router' || device?.type === 'multilayer-switch';
  
  // Early returns AFTER all hooks
  if (!runtime) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green"> Inspector </Text>
        <Box marginTop={1}>
          <Text dimColor>No simulation loaded</Text>
        </Box>
      </Box>
    );
  }
  
  if (!selectedDevice) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green"> Inspector </Text>
        <Box marginTop={1}>
          <Text dimColor>No device selected</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Use ↑↓ to select a device</Text>
        </Box>
      </Box>
    );
  }
  
  if (!device) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red"> Device not found </Text>
        <Text dimColor>{selectedDevice}</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header del dispositivo */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text bold color="green">
          {` ${device.name} `}
        </Text>
        <Text dimColor>{` (${device.type}) `}</Text>
      </Box>
      
      {/* Estado general */}
      <Box marginTop={1}>
        <Text dimColor>Power: </Text>
        <Text color={device.powerOn ? 'green' : 'red'} bold>
          {device.powerOn ? 'ON ●' : 'OFF ○'}
        </Text>
      </Box>
      
      <Box>
        <Text dimColor>Family: </Text>
        <Text>{device.family}</Text>
      </Box>
      
      {/* Interfaces */}
      <Box marginTop={1} flexDirection="column">
        <Text bold underline color="cyan">Interfaces ({interfaces.length})</Text>
        {interfaces.length === 0 ? (
          <Box marginLeft={1}>
            <Text dimColor>(no interfaces)</Text>
          </Box>
        ) : (
          interfaces.map((iface) => (
            <InterfaceRow key={iface.name} iface={iface} now={runtime.now} />
          ))
        )}
      </Box>
      
      {/* Tabla MAC (solo switches) */}
      {isSwitch && device.macTable.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline color="yellow">
            {`MAC Table (${device.macTable.size})`}
          </Text>
          <MACTableView macTable={device.macTable} now={runtime.now} />
        </Box>
      )}
      
      {/* Tabla ARP (routers y L3 switches) */}
      {isRouter && device.arpTable.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline color="yellow">
            {`ARP Table (${device.arpTable.size})`}
          </Text>
          <ARPTableView arpTable={device.arpTable} now={runtime.now} />
        </Box>
      )}
      
      {/* Tabla de rutas (solo routers) */}
      {isRouter && device.routingTable.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline color="yellow">
            {`Routing Table (${device.routingTable.length})`}
          </Text>
          <RoutingTableView routes={device.routingTable} />
        </Box>
      )}
      
      {/* VLANs */}
      {device.vlans.size > 1 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline color="magenta">
            {`VLANs (${device.vlans.size})`}
          </Text>
          <Box marginLeft={1}>
            {Array.from(device.vlans.values()).map((vlan) => (
              <Text key={vlan.id}>
                <Text color="magenta">{vlan.id}</Text>
                <Text dimColor>:{vlan.name} </Text>
              </Text>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Procesos activos */}
      {device.activeProcesses.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold underline color="blue">Active Processes</Text>
          <Box marginLeft={1}>
            {Array.from(device.activeProcesses).map((proc) => (
              <Text key={proc} color="blue">
                {proc}{' '}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default DeviceInspector;