/**
 * DeviceList Component
 * 
 * Muestra lista de dispositivos del laboratorio con estado y selección por teclado.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSimulator } from '../hooks/useSimulator';
import type { DeviceRuntime, InterfaceRuntime } from '@cisco-auto/sim-runtime';

/**
 * Iconos ASCII para tipos de dispositivos
 */
const DEVICE_ICONS: Record<string, string> = {
  router: '◈',
  switch: '◆',
  'multilayer-switch': '◇',
  pc: '□',
  server: '▣',
  'access-point': '△',
  firewall: '▧',
  cloud: '☁',
  phone: '☏',
  generic: '○'
};

/**
 * Obtiene el icono del dispositivo
 */
function getDeviceIcon(type: string): string {
  return DEVICE_ICONS[type] || DEVICE_ICONS.generic;
}

/**
 * Obtiene el color del dispositivo según su estado
 */
function getDeviceColor(device: DeviceRuntime): string {
  if (!device.powerOn) return 'gray';
  
  // Verificar si tiene interfaces activas
  const activeInterfaces = Array.from(device.interfaces.values())
    .filter(iface => iface.linkStatus === 'up').length;
  
  if (activeInterfaces > 0) return 'green';
  return 'yellow';
}

/**
 * Cuenta interfaces activas
 */
function countActiveInterfaces(device: DeviceRuntime): number {
  return Array.from(device.interfaces.values())
    .filter(iface => iface.linkStatus === 'up').length;
}

/**
 * Cuenta interfaces totales
 */
function countTotalInterfaces(device: DeviceRuntime): number {
  return device.interfaces.size;
}

export function DeviceList() {
  const { runtime, selectedDevice, selectDevice, mode } = useSimulator();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Obtener lista de dispositivos ordenados
  const devices = useMemo(() => {
    if (!runtime) return [];
    return Array.from(runtime.devices.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [runtime?.devices]);
  
  // Navegación por teclado
  useInput((input, key) => {
    if (devices.length === 0) return;
    
    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      setSelectedIndex(newIndex);
      selectDevice(devices[newIndex]?.id ?? null);
    } else if (key.downArrow) {
      const newIndex = Math.min(devices.length - 1, selectedIndex + 1);
      setSelectedIndex(newIndex);
      selectDevice(devices[newIndex]?.id ?? null);
    } else if (input === 'd' && selectedDevice) {
      // Toggle power (future: handleDevicePower(selectedDevice))
    }
  });
  
  if (!runtime) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="gray"> Devices </Text>
        <Box marginTop={1}>
          <Text dimColor>No simulation loaded</Text>
        </Box>
      </Box>
    );
  }
  
  if (devices.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="gray"> Devices </Text>
        <Text dimColor> (0 devices) </Text>
        <Box marginTop={1}>
          <Text dimColor>Add devices from catalog</Text>
        </Box>
        <Box>
          <Text dimColor>Press [a] to add</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between">
        <Text bold color="gray"> Devices </Text>
        <Text dimColor> ({devices.length}) </Text>
      </Box>
      <Text dimColor> [↑↓] Navigate </Text>
      
      <Box marginTop={1} flexDirection="column">
        {devices.map((device, index) => {
          const isSelected = index === selectedIndex;
          const color = getDeviceColor(device);
          const icon = getDeviceIcon(device.type);
          const activeIfaces = countActiveInterfaces(device);
          const totalIfaces = countTotalInterfaces(device);
          
          return (
            <Box key={device.id}>
              {/* Indicador de selección */}
              <Text color={isSelected ? 'cyan' : 'black'}>
                {isSelected ? '▶' : ' '}
              </Text>
              
              {/* Icono del dispositivo */}
              <Text color={color}> {icon} </Text>
              
              {/* Nombre del dispositivo */}
              <Text
                color={isSelected ? 'cyan' : color}
                bold={isSelected}
                inverse={isSelected}
              >
                {` ${device.name} `}
              </Text>
              
              {/* Estado de power */}
              <Text color={device.powerOn ? 'green' : 'red'}>
                {device.powerOn ? ' ●' : ' ○'}
              </Text>
              
              {/* Contador de interfaces */}
              <Text dimColor>
                {` [${activeIfaces}/${totalIfaces}]`}
              </Text>
            </Box>
          );
        })}
      </Box>
      
      {/* Leyenda */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>─── Legend ───</Text>
        <Box>
          <Text color="green">●</Text>
          <Text dimColor> Power ON, </Text>
          <Text color="red">○</Text>
          <Text dimColor> Power OFF</Text>
        </Box>
        <Box>
          <Text dimColor>[#/#] Active/Total interfaces</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default DeviceList;
