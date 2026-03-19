/**
 * Layout principal de la aplicación TUI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useSimulator } from '../context/SimulatorContext';
import { TopologyPanel } from './TopologyPanel';
import { InspectorPanel } from './InspectorPanel';
import { EventLogPanel } from './EventLogPanel';
import { CatalogPanel } from './CatalogPanel';
import { StatusBar } from './StatusBar';

export function AppLayout() {
  const { mode } = useSimulator();
  
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Main Content Area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: Catalog Panel */}
        <Box width={20} borderStyle="single" borderColor="gray">
          <CatalogPanel />
        </Box>
        
        {/* Center: Topology View */}
        <Box flexGrow={1} flexDirection="column" borderStyle="single" borderColor="cyan">
          <Box borderStyle="single" borderColor="cyan">
            <Text bold color="cyan"> Topology </Text>
            <Text dimColor> (Mode: {mode}) </Text>
          </Box>
          <TopologyPanel />
        </Box>
        
        {/* Right: Inspector Panel */}
        <Box width={30} borderStyle="single" borderColor="green">
          <InspectorPanel />
        </Box>
      </Box>
      
      {/* Bottom: Event Log */}
      <Box height={8} borderStyle="single" borderColor="yellow">
        <EventLogPanel />
      </Box>
      
      {/* Status Bar */}
      <StatusBar />
    </Box>
  );
}
