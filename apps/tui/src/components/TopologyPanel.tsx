/**
 * Panel de visualización de topología
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../context/SimulatorContext';

export function TopologyPanel() {
  const { runtime, selectedDevice, selectDevice, mode } = useSimulator();
  
  if (!runtime) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text dimColor>No simulation loaded</Text>
      </Box>
    );
  }
  
  const devices = Array.from(runtime.devices.values());
  
  if (devices.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text dimColor>No devices in topology</Text>
        <Text dimColor> Use the catalog to add devices</Text>
      </Box>
    );
  }
  
  return (
    <Box flexGrow={1} flexDirection="column" padding={1}>
      {/* ASCII Topology View */}
      <Box flexDirection="column">
        {devices.map((device) => {
          const isSelected = selectedDevice === device.id;
          const icon = getDeviceIcon(device.type);
          const color = isSelected ? 'cyan' : 'white';
          
          return (
            <Box key={device.id} marginTop={1}>
              <Text 
                color={color} 
                bold={isSelected}
                inverse={isSelected}
              >
                {` ${icon} ${device.name} `}
              </Text>
              <Text dimColor> ({device.type})</Text>
            </Box>
          );
        })}
      </Box>
      
      {/* Links visualization */}
      {runtime.links.size > 0 && (
        <Box marginTop={2} flexDirection="column">
          <Text bold underline>Connections:</Text>
          {Array.from(runtime.links.values()).map((link) => (
            <Box key={link.id}>
              <Text dimColor>
                {`  ${link.deviceA}:${link.portA} <---> ${link.deviceB}:${link.portB}`}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function getDeviceIcon(type: string): string {
  switch (type) {
    case 'router': return '◈';
    case 'switch': return '◆';
    case 'multilayer-switch': return '◇';
    case 'pc': return '□';
    case 'server': return '▣';
    case 'access-point': return '△';
    case 'firewall': return '▧';
    default: return '○';
  }
}
