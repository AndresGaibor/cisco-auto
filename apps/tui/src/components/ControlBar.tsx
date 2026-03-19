/**
 * ControlBar Component
 * 
 * Barra de controles del simulador:
 * - Play/Pause
 * - Step (avanzar un paso)
 * - Reset
 * - Indicador de tiempo de simulación
 * - Control de velocidad (1x, 2x, 5x, 10x)
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSimulator } from '../hooks/useSimulator';

/**
 * Velocidades disponibles
 */
const SPEEDS = [1, 2, 5, 10, 20] as const;
type Speed = typeof SPEEDS[number];

/**
 * Formatea el tiempo de simulación
 */
function formatSimulationTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m${seconds}s`;
}

/**
 * Obtiene el icono del modo
 */
function getModeIcon(mode: string): string {
  switch (mode) {
    case 'edit': return '✏';
    case 'realtime': return '▶';
    case 'simulation': return '⏱';
    default: return '?';
  }
}

/**
 * Obtiene el color del modo
 */
function getModeColor(mode: string): string {
  switch (mode) {
    case 'edit': return 'yellow';
    case 'realtime': return 'green';
    case 'simulation': return 'cyan';
    default: return 'white';
  }
}

export function ControlBar() {
  const { 
    mode, 
    setMode,
    isRunning, 
    speed,
    setSpeed,
    runtime,
    engine,
    step,
    run,
    pause,
    reset,
    initSimulation
  } = useSimulator();
  
  const [speedIndex, setSpeedIndex] = useState(0);
  
  // Cambiar velocidad
  const cycleSpeed = () => {
    const newIndex = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(newIndex);
    setSpeed(SPEEDS[newIndex]);
  };
  
  // Controles de teclado
  useInput((input, key) => {
    // Cambiar modo
    if (input === 'e') {
      setMode('edit');
    } else if (input === 'r' && mode === 'simulation') {
      if (isRunning) {
        pause();
      } else {
        run();
      }
    } else if (input === ' ' && mode === 'simulation') {
      step();
    } else if (input === 'x' && mode === 'simulation') {
      reset();
    } else if (input === '+' || input === '=') {
      cycleSpeed();
    } else if (input === '-') {
      const newIndex = (speedIndex - 1 + SPEEDS.length) % SPEEDS.length;
      setSpeedIndex(newIndex);
      setSpeed(SPEEDS[newIndex]);
    } else if (input === 'i') {
      // Inicializar simulación
      initSimulation();
    } else if (key.tab) {
      // Cambiar modo cíclicamente
      const modes: Array<'edit' | 'realtime' | 'simulation'> = ['edit', 'realtime', 'simulation'];
      const currentIndex = modes.indexOf(mode);
      setMode(modes[(currentIndex + 1) % modes.length]);
    }
  });
  
  const simTime = runtime?.now ?? 0;
  const modeIcon = getModeIcon(mode);
  const modeColor = getModeColor(mode);
  
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="magenta">
      {/* Fila de modo y tiempo */}
      <Box paddingX={1} justifyContent="space-between">
        {/* Modo actual */}
        <Box>
          <Text bold color={modeColor}>
            {modeIcon} {mode.toUpperCase()}
          </Text>
        </Box>
        
        {/* Tiempo de simulación */}
        <Box>
          <Text dimColor>Time: </Text>
          <Text bold color="cyan">
            {formatSimulationTime(simTime)}
          </Text>
        </Box>
        
        {/* Velocidad */}
        <Box>
          <Text dimColor>Speed: </Text>
          <Text bold color="yellow">
            {speed}x
          </Text>
        </Box>
        
        {/* Estado del motor */}
        <Box>
          {isRunning ? (
            <Text color="green" bold>▶ RUNNING</Text>
          ) : (
            <Text color="yellow" bold>⏸ PAUSED</Text>
          )}
        </Box>
      </Box>
      
      {/* Segunda fila: Controles según el modo */}
      <Box paddingX={1}>
        {/* Controles de modo */}
        <Box width={40}>
          <Text dimColor>Mode: </Text>
          {(['edit', 'realtime', 'simulation'] as const).map((m) => (
            <Box key={m}>
              <Text 
                color={mode === m ? getModeColor(m) : 'gray'}
                bold={mode === m}
                inverse={mode === m}
              >
                {` [${m.charAt(0).toUpperCase()}]${m.slice(1)} `}
              </Text>
            </Box>
          ))}
        </Box>
        
        {/* Controles de simulación (solo en modo simulation) */}
        {mode === 'simulation' && (
          <Box width={35}>
            <Text dimColor>Sim: </Text>
            <Box borderStyle="single" borderColor="green" paddingX={1}>
              <Text color="green" bold>[Space]Step</Text>
            </Box>
            <Box borderStyle="single" borderColor="yellow" paddingX={1} marginLeft={1}>
              <Text color="yellow" bold>
                {isRunning ? '[P]ause' : '[R]un'}
              </Text>
            </Box>
            <Box borderStyle="single" borderColor="red" paddingX={1} marginLeft={1}>
              <Text color="red" bold>[X]Reset</Text>
            </Box>
          </Box>
        )}
        
        {/* Controles de velocidad */}
        <Box>
          <Text dimColor>Speed: </Text>
          {SPEEDS.map((s, i) => (
            <Text 
              key={s}
              color={speedIndex === i ? 'yellow' : 'gray'}
              bold={speedIndex === i}
            >
              {` ${s}x`}
            </Text>
          ))}
          <Text dimColor> [+/-] </Text>
        </Box>
      </Box>
      
      {/* Tercera fila: Estado y estadísticas */}
      {runtime && (
        <Box paddingX={1}>
          <Text dimColor>
            {`Devices: ${runtime.devices.size} | Links: ${runtime.links.size} | ` +
             `Frames: TX=${runtime.stats.framesSent} RX=${runtime.stats.framesReceived} | ` +
             `Dropped: ${runtime.stats.packetsDropped}`}
          </Text>
        </Box>
      )}
      
      {/* Cuarta fila: Ayuda */}
      <Box paddingX={1} justifyContent="space-between">
        <Box>
          <Text dimColor>[Tab] Switch mode </Text>
          <Text dimColor>[i] Init </Text>
          <Text dimColor>[?] Help </Text>
        </Box>
        <Box>
          <Text dimColor>[q/Esc] Quit</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default ControlBar;