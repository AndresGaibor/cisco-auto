/**
 * @cisco-auto/tui
 * 
 * Terminal User Interface para Cisco Auto
 * Construida con Ink (React for CLI)
 */

import React from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { SimulatorProvider } from './context/SimulatorContext';
import { AppLayout } from './components/AppLayout';

// Main App Component
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

// Entry point
export function startTUI(): void {
  const { waitUntilExit } = render(<App />);
  waitUntilExit().then(() => {
    process.exit(0);
  });
}

export default App;
