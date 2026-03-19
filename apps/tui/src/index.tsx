/**
 * @cisco-auto/tui
 * 
 * Terminal User Interface para Cisco Auto
 * Construida con Ink (React for CLI)
 * 
 * Layout:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ ┌──────────┐ ┌───────────────────────┐ ┌──────────────────┐ │
 * │ │ Device   │ │ Topology View         │ │ Device Inspector │ │
 * │ │ List     │ │                       │ │                  │ │
 * │ │          │ │                       │ │                  │ │
 * │ │          │ │                       │ │                  │ │
 * │ └──────────┘ └───────────────────────┘ └──────────────────┘ │
 * │ ┌──────────────────────────────────────────────────────────┐ │
 * │ │ Event Log                                                │ │
 * │ └──────────────────────────────────────────────────────────┘ │
 * │ ┌──────────────────────────────────────────────────────────┐ │
 * │ │ Control Bar                                              │ │
 * │ └──────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { SimulatorProvider } from './context/SimulatorContext';
import { useSimulator } from './hooks/useSimulator';
import { DeviceList } from './components/DeviceList';
import { DeviceInspector } from './components/DeviceInspector';
import { EventLog } from './components/EventLog';
import { TopologyView } from './components/TopologyView';
import { ControlBar } from './components/ControlBar';

/**
 * Panel de ayuda
 */
function HelpOverlay({ onClose }: { onClose: () => void }) {
  useInput((input) => {
    if (input === '?' || input === 'q' || input === '\x1b') {
      onClose();
    }
  });
  
  return (
    <Box 
      flexDirection="column" 
      borderStyle="double" 
      borderColor="cyan"
      padding={2}
    >
      <Text bold color="cyan" underline>Cisco Auto Simulator - Help</Text>
      
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Navigation</Text>
        <Text dimColor>  ↑↓      Navigate device list / Scroll events</Text>
        <Text dimColor>  ←→      Pan topology view</Text>
        <Text dimColor>  Tab     Switch mode</Text>
        <Text dimColor>  Enter   Select device</Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Mode Controls</Text>
        <Text dimColor>  [E]     Edit mode - Add/remove devices</Text>
        <Text dimColor>  [R]     Run/Pause simulation</Text>
        <Text dimColor>  [Space] Step simulation (one event)</Text>
        <Text dimColor>  [X]     Reset simulation</Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Edit Mode</Text>
        <Text dimColor>  [a]     Add selected device type</Text>
        <Text dimColor>  [d]     Delete selected device</Text>
        <Text dimColor>  [p]     Toggle device power</Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">General</Text>
        <Text dimColor>  [i]     Initialize simulation</Text>
        <Text dimColor>  [+/-]   Change simulation speed</Text>
        <Text dimColor>  [l]     Toggle auto-scroll in event log</Text>
        <Text dimColor>  [?]     Show/hide this help</Text>
        <Text dimColor>  [q/Esc] Quit application</Text>
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>Press [?] or [q] to close</Text>
      </Box>
    </Box>
  );
}

/**
 * Welcome screen cuando no hay simulación
 */
function WelcomeScreen({ onInit }: { onInit: () => void }) {
  useInput((input) => {
    if (input === 'i' || input === '\r') {
      onInit();
    }
  });
  
  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      height={20}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╔════════════════════════════════════════╗
        </Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          ║                                        ║
        </Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          ║
        </Text>
        <Text bold color="green">
          {'    Cisco Auto Network Simulator    '}
        </Text>
        <Text bold color="cyan">
          ║
        </Text>
      </Box>
      <Box>
        <Text bold color="cyan">
          ║                                        ║
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╚════════════════════════════════════════╝
        </Text>
      </Box>
      
      <Box marginTop={2} flexDirection="column" alignItems="center">
        <Text dimColor>A terminal-based network simulator</Text>
        <Text dimColor>for Cisco devices and topologies</Text>
      </Box>
      
      <Box marginTop={2}>
        <Text color="yellow" bold>
          Press [i] or [Enter] to initialize simulation
        </Text>
      </Box>
      
      <Box marginTop={2} flexDirection="column" alignItems="center">
        <Text dimColor>Features:</Text>
        <Text dimColor>• Layer 2 switching with MAC learning</Text>
        <Text dimColor>• Layer 3 routing with ARP and ICMP</Text>
        <Text dimColor>• Real-time event visualization</Text>
        <Text dimColor>• Deterministic simulation engine</Text>
      </Box>
    </Box>
  );
}

/**
 * Main App Layout
 */
function AppLayout() {
  const { runtime, initSimulation, mode } = useSimulator();
  const [showHelp, setShowHelp] = useState(false);
  
  // Toggle help
  useInput((input) => {
    if (input === '?') {
      setShowHelp(prev => !prev);
    }
  });
  
  // Si no hay runtime, mostrar welcome screen
  if (!runtime) {
    return (
      <Box flexDirection="column" height="100%">
        <WelcomeScreen onInit={() => initSimulation()} />
        <Box flexGrow={1} />
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>[i] Initialize | [?] Help | [q] Quit</Text>
        </Box>
      </Box>
    );
  }
  
  // Si se muestra ayuda
  if (showHelp) {
    return <HelpOverlay onClose={() => setShowHelp(false)} />;
  }
  
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Main Content Area - 3 panels */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: Device List */}
        <Box width={22} borderStyle="single" borderColor="gray">
          <DeviceList />
        </Box>
        
        {/* Center: Topology View */}
        <Box flexGrow={1} flexDirection="column" borderStyle="single" borderColor="cyan">
          <TopologyView />
        </Box>
        
        {/* Right: Device Inspector */}
        <Box width={35} borderStyle="single" borderColor="green">
          <DeviceInspector />
        </Box>
      </Box>
      
      {/* Bottom: Event Log */}
      <Box height={10} borderStyle="single" borderColor="yellow">
        <EventLog />
      </Box>
      
      {/* Bottom: Control Bar */}
      <ControlBar />
    </Box>
  );
}

/**
 * Main App Component
 */
function App() {
  const { exit } = useApp();
  
  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
    }
  });
  
  return (
    <SimulatorProvider>
      <AppLayout />
    </SimulatorProvider>
  );
}

/**
 * Entry point
 */
export function startTUI(): void {
  const { waitUntilExit } = render(<App />);
  waitUntilExit().then(() => {
    process.exit(0);
  });
}

export default App;
