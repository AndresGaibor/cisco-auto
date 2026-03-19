/**
 * Contexto del simulador para la TUI
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SimEngine, SimEvent, Snapshot } from '@cisco-auto/sim-engine';
import type { RuntimeState, DeviceRuntime, TraceEntry } from '@cisco-auto/sim-runtime';
import { SimEngine as SimEngineClass } from '@cisco-auto/sim-engine';
import { RuntimeFactory, registerSwitchHandlers } from '@cisco-auto/sim-runtime';

/**
 * Estado del simulador
 */
interface SimulatorState {
  engine: SimEngine | null;
  runtime: RuntimeState | null;
  mode: 'edit' | 'realtime' | 'simulation';
  selectedDevice: string | null;
  isRunning: boolean;
  speed: number;
}

/**
 * Contexto
 */
interface SimulatorContextType extends SimulatorState {
  initSimulation: (seed?: number) => void;
  step: () => void;
  run: () => void;
  pause: () => void;
  reset: () => void;
  selectDevice: (deviceId: string | null) => void;
  setMode: (mode: 'edit' | 'realtime' | 'simulation') => void;
  setSpeed: (speed: number) => void;
  addDevice: (type: string, name: string) => void;
  removeDevice: (deviceId: string) => void;
  getTraces: () => TraceEntry[];
}

const SimulatorContext = createContext<SimulatorContextType | null>(null);

export function useSimulator(): SimulatorContextType {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within SimulatorProvider');
  }
  return context;
}

interface SimulatorProviderProps {
  children: ReactNode;
}

export function SimulatorProvider({ children }: SimulatorProviderProps) {
  const [engine, setEngine] = useState<SimEngine | null>(null);
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [mode, setMode] = useState<'edit' | 'realtime' | 'simulation'>('edit');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const initSimulation = useCallback((seed?: number) => {
    const newEngine = new SimEngineClass({ seed, maxTime: 1000000 });
    const newRuntime = RuntimeFactory.createEmptyState(seed);
    
    // Registrar handlers
    registerSwitchHandlers(newEngine, newRuntime);
    
    setEngine(newEngine);
    setRuntime(newRuntime);
  }, []);
  
  const step = useCallback(() => {
    if (!engine || !runtime) return;
    
    const result = engine.step();
    if (result.event) {
      runtime.now = result.now;
      // Force re-render
      setRuntime({ ...runtime });
    }
  }, [engine, runtime]);
  
  const run = useCallback(() => {
    if (!engine || !runtime) return;
    setIsRunning(true);
    
    const runLoop = () => {
      if (!isRunning) return;
      
      const result = engine.step();
      if (result.event) {
        runtime.now = result.now;
        setRuntime({ ...runtime });
      }
      
      if (!result.finished) {
        setTimeout(runLoop, 1000 / speed);
      } else {
        setIsRunning(false);
      }
    };
    
    runLoop();
  }, [engine, runtime, isRunning, speed]);
  
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);
  
  const reset = useCallback(() => {
    if (engine && runtime) {
      engine.reset(runtime.seed);
      runtime.now = 0;
      runtime.devices.clear();
      runtime.links.clear();
      runtime.traceBuffer = [];
      setRuntime({ ...runtime });
    }
    setIsRunning(false);
  }, [engine, runtime]);
  
  const selectDevice = useCallback((deviceId: string | null) => {
    setSelectedDevice(deviceId);
  }, []);
  
  const addDevice = useCallback((type: string, name: string) => {
    if (!runtime) return;
    
    const id = `device-${Date.now()}`;
    const device = RuntimeFactory.createDevice(id, name, type as any);
    runtime.devices.set(id, device);
    setRuntime({ ...runtime });
  }, [runtime]);
  
  const removeDevice = useCallback((deviceId: string) => {
    if (!runtime) return;
    
    runtime.devices.delete(deviceId);
    // Remove associated links
    for (const [linkId, link] of runtime.links) {
      if (link.deviceA === deviceId || link.deviceB === deviceId) {
        runtime.links.delete(linkId);
      }
    }
    setRuntime({ ...runtime });
    
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
    }
  }, [runtime, selectedDevice]);
  
  const getTraces = useCallback(() => {
    return runtime?.traceBuffer ?? [];
  }, [runtime]);
  
  const value: SimulatorContextType = {
    engine,
    runtime,
    mode,
    selectedDevice,
    isRunning,
    speed,
    initSimulation,
    step,
    run,
    pause,
    reset,
    selectDevice,
    setMode,
    setSpeed,
    addDevice,
    removeDevice,
    getTraces
  };
  
  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}
