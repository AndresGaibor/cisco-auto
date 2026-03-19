/**
 * Barra de estado
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../context/SimulatorContext';

export function StatusBar() {
  const { 
    mode, 
    isRunning, 
    speed
  } = useSimulator();
  
  return (
    <Box flexDirection="row" paddingX={1}>
      {/* Mode selector */}
      <Box width={30}>
        <Text bold>Mode: </Text>
        {(['edit', 'realtime', 'simulation'] as const).map((m) => (
          <Text 
            key={m}
            color={mode === m ? 'cyan' : 'gray'}
            bold={mode === m}
          >
            {` [${m.charAt(0).toUpperCase()}]${m.slice(1)} `}
          </Text>
        ))}
      </Box>
      
      {/* Simulation controls */}
      {mode === 'simulation' && (
        <Box width={25}>
          <Text bold>Sim: </Text>
          <Text color="green">[Space]Step </Text>
          <Text color="yellow">
            {isRunning ? '[P]ause ' : '[R]un '}
          </Text>
          <Text color="red">[X]Reset</Text>
        </Box>
      )}
      
      {/* Speed control */}
      <Box width={15}>
        <Text bold>Speed: </Text>
        <Text>{speed}x</Text>
      </Box>
      
      {/* Help */}
      <Box flexGrow={1} justifyContent="flex-end">
        <Text dimColor>[?]Help [q]Quit</Text>
      </Box>
    </Box>
  );
}