/**
 * Panel de log de eventos
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../context/SimulatorContext';

export function EventLogPanel() {
  const { getTraces, runtime } = useSimulator();
  const traces = getTraces();
  
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow"> Events </Text>
      <Text dimColor> Time: {runtime?.now ?? 0} </Text>
      
      <Box marginTop={1} flexDirection="column">
        {traces.length === 0 ? (
          <Text dimColor>No events yet</Text>
        ) : (
          traces.slice(-10).map((trace, i) => (
            <Box key={i}>
              <Text dimColor>[{trace.at.toString().padStart(6, ' ')}]</Text>
              <Text color={getEventColor(trace.type)}> {trace.type}: </Text>
              <Text>{trace.description}</Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

function getEventColor(type: string): string {
  switch (type) {
    case 'frame_tx': return 'green';
    case 'frame_rx': return 'blue';
    case 'arp_request': return 'yellow';
    case 'arp_reply': return 'cyan';
    case 'icmp_echo_request': return 'magenta';
    case 'icmp_echo_reply': return 'green';
    default: return 'white';
  }
}
