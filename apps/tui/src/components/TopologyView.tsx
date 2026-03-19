/**
 * TopologyView Component
 * 
 * Visualización ASCII de la topología de red:
 * - Nodos (dispositivos) con posición en grid
 * - Conexiones entre dispositivos
 * - Estado de enlaces (up/down)
 */

import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSimulator } from '../hooks/useSimulator';
import type { DeviceRuntime, LinkRuntime } from '@cisco-auto/sim-runtime';

/**
 * Iconos ASCII para dispositivos
 */
const DEVICE_ICONS: Record<string, string> = {
  router: '╔═╗\n║R║\n╚═╝',
  switch: '╔═╗\n║S║\n╚═╝',
  'multilayer-switch': '╔═╗\n║L║\n╚═╝',
  pc: '┌─┐\n│P│\n└─┘',
  server: '┌─┐\n│$│\n└─┘',
  'access-point': ' ◯\n/│\\',
  firewall: '┌─┐\n│F│\n└─┘',
  cloud: ' ☁ ',
  generic: ' ● '
};

/**
 * Icono simple para el grid
 */
function getDeviceSymbol(type: string): string {
  switch (type) {
    case 'router': return 'R';
    case 'switch': return 'S';
    case 'multilayer-switch': return 'L';
    case 'pc': return 'P';
    case 'server': return '$';
    case 'access-point': return 'A';
    case 'firewall': return 'F';
    default: return '?';
  }
}

/**
 * Punto en el grid
 */
interface GridPoint {
  deviceId: string;
  device: DeviceRuntime;
  x: number;
  y: number;
}

/**
 * Calcula posiciones de dispositivos en un grid
 */
function calculateGridPositions(devices: DeviceRuntime[]): GridPoint[] {
  const positions: GridPoint[] = [];
  
  // Ordenar dispositivos por tipo para mejor visualización
  const sortedDevices = [...devices].sort((a, b) => {
    const order = ['router', 'multilayer-switch', 'switch', 'firewall', 'server', 'pc', 'access-point'];
    const aIndex = order.indexOf(a.type);
    const bIndex = order.indexOf(b.type);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  
  // Calcular dimensiones del grid
  const cols = Math.ceil(Math.sqrt(devices.length));
  
  sortedDevices.forEach((device, index) => {
    const x = (index % cols) * 10 + 2;
    const y = Math.floor(index / cols) * 5 + 2;
    
    positions.push({
      deviceId: device.id,
      device,
      x,
      y
    });
  });
  
  return positions;
}

/**
 * Dibuja una conexión en el canvas ASCII
 */
function drawConnection(
  canvas: string[][],
  from: GridPoint,
  to: GridPoint,
  link: LinkRuntime
): void {
  const maxWidth = canvas[0]?.length ?? 60;
  const maxHeight = canvas.length;
  
  // Línea simple (horizontal o vertical primero, luego el resto)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const xStep = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const yStep = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  
  // Dibujar línea desde from hasta to
  let x = from.x + 2; // offset desde el centro del dispositivo
  let y = from.y + 1;
  
  // Primero ir horizontalmente
  const midX = Math.floor((from.x + to.x) / 2);
  while (x !== midX && x >= 0 && x < maxWidth) {
    if (canvas[y]?.[x] === ' ') {
      canvas[y][x] = '─';
    }
    x += xStep;
  }
  
  // Luego ir verticalmente
  while (y !== to.y + 1 && y >= 0 && y < maxHeight) {
    if (canvas[y]?.[x] === ' ') {
      canvas[y][x] = '│';
    }
    y += yStep;
  }
  
  // Finalmente ir al destino
  while (x !== to.x + 2 && x >= 0 && x < maxWidth) {
    if (canvas[y]?.[x] === ' ') {
      canvas[y][x] = '─';
    }
    x += xStep;
  }
}

/**
 * Estado del link
 */
function getLinkStatusColor(link: LinkRuntime): string {
  return link.status === 'up' ? 'green' : 'red';
}

export function TopologyView() {
  const { runtime, selectedDevice, selectDevice, mode } = useSimulator();
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  
  const devices = useMemo(() => {
    if (!runtime) return [];
    return Array.from(runtime.devices.values());
  }, [runtime?.devices]);
  
  const links = useMemo(() => {
    if (!runtime) return [];
    return Array.from(runtime.links.values());
  }, [runtime?.links]);
  
  // Calcular posiciones del grid
  const gridPositions = useMemo(() => calculateGridPositions(devices), [devices]);
  
  // Navegación
  useInput((input, key) => {
    if (key.leftArrow) {
      setViewOffset(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
    } else if (key.rightArrow) {
      setViewOffset(prev => ({ ...prev, x: prev.x + 5 }));
    } else if (key.upArrow) {
      setViewOffset(prev => ({ ...prev, y: Math.max(0, prev.y - 2) }));
    } else if (key.downArrow) {
      setViewOffset(prev => ({ ...prev, y: prev.y + 2 }));
    }
  });
  
  if (!runtime) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text dimColor>No simulation loaded. Press [i] to initialize.</Text>
      </Box>
    );
  }
  
  if (devices.length === 0) {
    return (
      <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
        <Text dimColor>No devices in topology</Text>
        <Box marginTop={1}>
          <Text dimColor>Switch to [E]dit mode and use catalog to add devices</Text>
        </Box>
      </Box>
    );
  }
  
  // Renderizar topología
  return (
    <Box flexGrow={1} flexDirection="column" padding={1}>
      {/* Controles */}
      <Box justifyContent="space-between">
        <Text bold color="cyan">Topology</Text>
        <Text dimColor>
          {`[${devices.length} devices, ${links.length} links]`}
        </Text>
      </Box>
      <Text dimColor> [↑↓←→] Pan [Enter] Select </Text>
      
      {/* Grid de dispositivos */}
      <Box marginTop={1} flexDirection="column">
        {gridPositions.map(({ deviceId, device, x, y }) => {
          const isSelected = selectedDevice === deviceId;
          const color = device.powerOn ? 'green' : 'gray';
          const symbol = getDeviceSymbol(device.type);
          
          // Contar interfaces activas
          const activeIfaces = Array.from(device.interfaces.values())
            .filter(i => i.linkStatus === 'up').length;
          const totalIfaces = device.interfaces.size;
          
          return (
            <Box key={deviceId} marginBottom={1}>
              {/* Indicador de selección */}
              <Box width={1}>
                <Text color={isSelected ? 'cyan' : 'black'}>
                  {isSelected ? '▶' : ' '}
                </Text>
              </Box>
              
              {/* Dispositivo */}
              <Box 
                borderStyle={isSelected ? 'double' : 'single'}
                borderColor={isSelected ? 'cyan' : color}
                paddingX={1}
              >
                <Text color={color} bold>
                  {` ${symbol} ${device.name} `}
                </Text>
              </Box>
              
              {/* Estado */}
              <Box marginLeft={1}>
                <Text color={device.powerOn ? 'green' : 'red'}>
                  {device.powerOn ? '●' : '○'}
                </Text>
                <Text dimColor>
                  {` [${activeIfaces}/${totalIfaces}]`}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
      
      {/* Conexiones */}
      {links.length > 0 && (
        <Box marginTop={2} flexDirection="column">
          <Text bold underline color="cyan">Connections</Text>
          {links.map((link) => {
            const deviceA = runtime.devices.get(link.deviceA);
            const deviceB = runtime.devices.get(link.deviceB);
            const statusColor = getLinkStatusColor(link);
            
            return (
              <Box key={link.id}>
                <Text dimColor>  </Text>
                <Text color="white">
                  {deviceA?.name ?? link.deviceA}
                </Text>
                <Text color={statusColor}>
                  {` ${link.status === 'up' ? '═══' : ' ╳ '} `}
                </Text>
                <Text color="white">
                  {deviceB?.name ?? link.deviceB}
                </Text>
                <Text dimColor>
                  {` (${link.portA} ↔ ${link.portB})`}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
      
      {/* Leyenda */}
      <Box marginTop={2} flexDirection="column">
        <Text dimColor>─── Legend ───</Text>
        <Box>
          <Text color="green">R</Text>
          <Text dimColor> Router, </Text>
          <Text color="green">S</Text>
          <Text dimColor> Switch, </Text>
          <Text color="green">L</Text>
          <Text dimColor> L3 Switch, </Text>
          <Text color="green">P</Text>
          <Text dimColor> PC, </Text>
          <Text color="green">$</Text>
          <Text dimColor> Server</Text>
        </Box>
        <Box>
          <Text color="green">═══</Text>
          <Text dimColor> Link Up, </Text>
          <Text color="red"> ╳ </Text>
          <Text dimColor> Link Down</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default TopologyView;
