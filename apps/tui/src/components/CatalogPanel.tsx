/**
 * Panel de catálogo de dispositivos
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSimulator } from '../context/SimulatorContext';

const DEVICE_TYPES = [
  { type: 'router', label: 'Router', icon: '◈' },
  { type: 'switch', label: 'Switch', icon: '◆' },
  { type: 'multilayer-switch', label: 'L3 Switch', icon: '◇' },
  { type: 'pc', label: 'PC', icon: '□' },
  { type: 'server', label: 'Server', icon: '▣' },
  { type: 'access-point', label: 'AP', icon: '△' },
];

export function CatalogPanel() {
  const { addDevice, mode } = useSimulator();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [counter, setCounter] = useState(1);
  
  useInput((input, key) => {
    if (mode !== 'edit') return;
    
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(DEVICE_TYPES.length - 1, selectedIndex + 1));
    } else if (input === 'a' || key.return) {
      const deviceType = DEVICE_TYPES[selectedIndex];
      const name = `${deviceType.label}${counter}`;
      addDevice(deviceType.type, name);
      setCounter(counter + 1);
    }
  });
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="gray"> Catalog </Text>
      <Text dimColor> [↑↓] Select [a] Add </Text>
      
      <Box marginTop={1} flexDirection="column">
        {DEVICE_TYPES.map((device, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Box key={device.type}>
              <Text 
                color={isSelected ? 'cyan' : 'white'}
                bold={isSelected}
                inverse={isSelected}
              >
                {` ${device.icon} ${device.label} `}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
