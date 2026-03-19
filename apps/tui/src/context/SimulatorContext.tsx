/**
 * Contexto del simulador para la TUI
 * 
 * Proporciona estado global del simulador y funciones de control.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import type { SimEngine, SimEvent } from '@cisco-auto/sim-engine';
import type { RuntimeState, DeviceRuntime, TraceEntry } from '@cisco-auto/sim-runtime';
import { SimEngine as SimEngineClass } from '@cisco-auto/sim-engine';
import { RuntimeFactory, registerSwitchHandlers, registerRouterHandlers } from '@cisco-auto/sim-runtime';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modo de operación del simulador
 */
export type SimulatorMode = 'edit' | 'realtime' | 'simulation';

/**
 * Estado del simulador
 */
interface SimulatorState {
  /** Motor de simulación */
  engine: SimEngine | null;
  
  /** Estado del runtime */
  runtime: RuntimeState | null;
  
  /** Modo actual */
  mode: SimulatorMode;
  
  /** Dispositivo seleccionado */
  selectedDevice: string | null;
  
  /** ¿Está corriendo la simulación? */
  isRunning: boolean;
  
  /** Velocidad de simulación (eventos por segundo) */
  speed: number;
}

/**
 * Contexto del simulador
 */
export interface SimulatorContextType extends SimulatorState {
  /** Inicializa la simulación */
  initSimulation: (seed?: number) => void;
  
  /** Avanza un paso en la simulación */
  step: () => void;
  
  /** Inicia la simulación continua */
  start: () => void;
  
  /** Alias para start (compatibilidad) */
  run: () => void;
  
  /** Pausa la simulación */
  pause: () => void;
  
  /** Reinicia la simulación */
  reset: () => void;
  
  /** Selecciona un dispositivo */
  selectDevice: (deviceId: string | null) => void;
  
  /** Cambia el modo */
  setMode: (mode: SimulatorMode) => void;
  
  /** Cambia la velocidad */
  setSpeed: (speed: number) => void;
  
  /** Añade un dispositivo */
  addDevice: (type: string, name: string) => string | null;
  
  /** Elimina un dispositivo */
  removeDevice: (deviceId: string) => void;
  
  /** Obtiene las trazas del buffer */
  getTraces: () => TraceEntry[];
  
  /** Limpia el buffer de trazas */
  clearTraces: () => void;
  
  /** Toggle power de un dispositivo */
  toggleDevicePower?: (deviceId: string) => void;
  
  /** Añade una conexión entre dispositivos */
  addLink?: (deviceA: string, portA: string, deviceB: string, portB: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

/**
 * React Context para el simulador
 */
export const SimulatorContext = createContext<SimulatorContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface SimulatorProviderProps {
  children: ReactNode;
}

export function SimulatorProvider({ children }: SimulatorProviderProps) {
  // === State ===
  const [engine, setEngine] = useState<SimEngine | null>(null);
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [mode, setMode] = useState<SimulatorMode>('edit');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(10); // 10 eventos por segundo por defecto
  
  // === Refs para el loop de simulación ===
  const runningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engineRef = useRef<SimEngine | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  
  // Mantener refs sincronizadas
  useEffect(() => {
    engineRef.current = engine;
    runtimeRef.current = runtime;
  }, [engine, runtime]);
  
  // === Inicialización ===
  
  const initSimulation = useCallback((seed?: number) => {
    // Detener simulación anterior
    runningRef.current = false;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Crear nuevo motor y runtime
    const newEngine = new SimEngineClass({ 
      seed, 
      maxTime: 10000000 // 10 segundos virtuales máximo
    });
    const newRuntime = RuntimeFactory.createEmptyState(seed);
    
    // Registrar handlers por defecto
    registerSwitchHandlers(newEngine, newRuntime);
    
    // Añadir dispositivos de demostración
    addDemoDevices(newRuntime);
    
    setEngine(newEngine);
    setRuntime(newRuntime);
    setIsRunning(false);
    setMode('edit');
    setSelectedDevice(null);
    
    console.log(`[Simulator] Initialized with seed ${seed ?? 'auto'}`);
  }, []);
  
  /**
   * Añade dispositivos de demostración al runtime
   */
  const addDemoDevices = (rt: RuntimeState) => {
    // Crear router
    const router = RuntimeFactory.createDevice('router-1', 'Router1', 'router');
    router.interfaces.set('GigabitEthernet0/0', RuntimeFactory.createInterface(
      'GigabitEthernet0/0',
      '00:01:01:01:01:01',
      { ip: '192.168.1.1', subnetMask: '255.255.255.0', vlan: 1, linkStatus: 'up' }
    ));
    router.interfaces.set('GigabitEthernet0/1', RuntimeFactory.createInterface(
      'GigabitEthernet0/1',
      '00:01:01:01:01:02',
      { ip: '10.0.0.1', subnetMask: '255.255.255.0', vlan: 1, linkStatus: 'up' }
    ));
    router.powerOn = true;
    rt.devices.set('router-1', router);
    
    // Crear switch
    const switch1 = RuntimeFactory.createDevice('switch-1', 'Switch1', 'switch');
    switch1.interfaces.set('FastEthernet0/1', RuntimeFactory.createInterface(
      'FastEthernet0/1',
      '00:02:02:02:02:01',
      { vlan: 1, linkStatus: 'up' }
    ));
    switch1.interfaces.set('FastEthernet0/2', RuntimeFactory.createInterface(
      'FastEthernet0/2',
      '00:02:02:02:02:02',
      { vlan: 1, linkStatus: 'up' }
    ));
    switch1.interfaces.set('FastEthernet0/3', RuntimeFactory.createInterface(
      'FastEthernet0/3',
      '00:02:02:02:02:03',
      { vlan: 1, linkStatus: 'down' }
    ));
    switch1.powerOn = true;
    rt.devices.set('switch-1', switch1);
    
    // Crear PC
    const pc1 = RuntimeFactory.createDevice('pc-1', 'PC1', 'pc');
    pc1.interfaces.set('FastEthernet0', RuntimeFactory.createInterface(
      'FastEthernet0',
      '00:03:03:03:03:01',
      { ip: '192.168.1.10', subnetMask: '255.255.255.0', vlan: 1, linkStatus: 'up' }
    ));
    pc1.powerOn = true;
    rt.devices.set('pc-1', pc1);
    
    // Crear servidor
    const server1 = RuntimeFactory.createDevice('server-1', 'Server1', 'server');
    server1.interfaces.set('GigabitEthernet0', RuntimeFactory.createInterface(
      'GigabitEthernet0',
      '00:04:04:04:04:01',
      { ip: '10.0.0.100', subnetMask: '255.255.255.0', vlan: 1, linkStatus: 'up' }
    ));
    server1.powerOn = true;
    rt.devices.set('server-1', server1);
    
    // Crear links
    const link1 = RuntimeFactory.createLink('router-1', 'GigabitEthernet0/0', 'switch-1', 'FastEthernet0/1');
    rt.links.set(link1.id, link1);
    
    const link2 = RuntimeFactory.createLink('pc-1', 'FastEthernet0', 'switch-1', 'FastEthernet0/2');
    rt.links.set(link2.id, link2);
    
    const link3 = RuntimeFactory.createLink('router-1', 'GigabitEthernet0/1', 'server-1', 'GigabitEthernet0');
    rt.links.set(link3.id, link3);
    
    // Añadir trazas de demostración
    rt.traceBuffer.push({
      at: 0,
      type: 'device_add',
      description: 'Router1 added to topology'
    });
    rt.traceBuffer.push({
      at: 1,
      type: 'device_add',
      description: 'Switch1 added to topology'
    });
    rt.traceBuffer.push({
      at: 2,
      type: 'device_add',
      description: 'PC1 added to topology'
    });
    rt.traceBuffer.push({
      at: 3,
      type: 'device_add',
      description: 'Server1 added to topology'
    });
  };
  
  // === Control de simulación ===
  
  /**
   * Ejecuta un único paso de simulación
   */
  const step = useCallback(() => {
    const currentEngine = engineRef.current;
    const currentRuntime = runtimeRef.current;
    
    if (!currentEngine || !currentRuntime) {
      console.warn('[Simulator] Not initialized');
      return;
    }
    
    const result = currentEngine.step();
    
    if (result.event) {
      currentRuntime.now = result.now;
      
      // Forzar re-render
      setRuntime({ ...currentRuntime });
      
      console.log(`[Simulator] Step at ${result.now}: ${result.event.type}`);
    }
    
    if (result.finished) {
      console.log('[Simulator] No more events');
    }
  }, []);
  
  /**
   * Loop de simulación usando setTimeout
   */
  const scheduleNextTick = useCallback(() => {
    if (!runningRef.current) return;
    
    const currentEngine = engineRef.current;
    const currentRuntime = runtimeRef.current;
    
    if (!currentEngine || !currentRuntime) {
      runningRef.current = false;
      setIsRunning(false);
      return;
    }
    
    // Ejecutar un paso
    const result = currentEngine.step();
    
    if (result.event) {
      currentRuntime.now = result.now;
      
      // Forzar re-render
      setRuntime({ ...currentRuntime });
    }
    
    if (result.finished) {
      console.log('[Simulator] Simulation finished');
      runningRef.current = false;
      setIsRunning(false);
      return;
    }
    
    // Programar siguiente tick
    const tickInterval = Math.round(1000 / speed);
    timeoutRef.current = setTimeout(scheduleNextTick, tickInterval);
  }, [speed]);
  
  /**
   * Inicia la simulación
   */
  const start = useCallback(() => {
    if (!engineRef.current || !runtimeRef.current) {
      console.warn('[Simulator] Cannot start: not initialized');
      return;
    }
    
    if (runningRef.current) return; // Ya está corriendo
    
    runningRef.current = true;
    setIsRunning(true);
    
    console.log(`[Simulator] Started at ${speed} events/sec`);
    
    // Iniciar loop
    const tickInterval = Math.round(1000 / speed);
    timeoutRef.current = setTimeout(scheduleNextTick, tickInterval);
  }, [scheduleNextTick, speed]);
  
  /**
   * Pausa la simulación
   */
  const pause = useCallback(() => {
    runningRef.current = false;
    
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsRunning(false);
    console.log('[Simulator] Paused');
  }, []);
  
  /**
   * Alias para start (compatibilidad)
   */
  const run = useCallback(() => {
    start();
  }, [start]);
  
  /**
   * Resetea la simulación
   */
  const reset = useCallback(() => {
    // Detener simulación
    runningRef.current = false;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const currentEngine = engineRef.current;
    const currentRuntime = runtimeRef.current;
    
    if (currentEngine && currentRuntime) {
      currentEngine.reset(currentRuntime.seed);
      currentRuntime.now = 0;
      currentRuntime.traceBuffer = [];
      currentRuntime.stats = {
        framesSent: 0,
        framesReceived: 0,
        packetsDropped: 0,
        collisions: 0
      };
      
      setRuntime({ ...currentRuntime });
    }
    
    setIsRunning(false);
    console.log('[Simulator] Reset');
  }, []);
  
  // === Manipulación de dispositivos ===
  
  const selectDevice = useCallback((deviceId: string | null) => {
    setSelectedDevice(deviceId);
  }, []);
  
  const addDevice = useCallback((type: string, name: string): string | null => {
    const currentRuntime = runtimeRef.current;
    if (!currentRuntime) {
      console.warn('[Simulator] Cannot add device: not initialized');
      return null;
    }
    
    const id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const device = RuntimeFactory.createDevice(id, name, type as any);
    
    // Añadir interfaces según el tipo
    if (type === 'router') {
      device.interfaces.set('GigabitEthernet0/0', RuntimeFactory.createInterface(
        'GigabitEthernet0/0',
        generateMAC(),
        { linkStatus: 'down' }
      ));
    } else if (type === 'switch') {
      device.interfaces.set('FastEthernet0/1', RuntimeFactory.createInterface(
        'FastEthernet0/1',
        generateMAC(),
        { linkStatus: 'down' }
      ));
      device.interfaces.set('FastEthernet0/2', RuntimeFactory.createInterface(
        'FastEthernet0/2',
        generateMAC(),
        { linkStatus: 'down' }
      ));
    } else if (type === 'pc') {
      device.interfaces.set('FastEthernet0', RuntimeFactory.createInterface(
        'FastEthernet0',
        generateMAC(),
        { linkStatus: 'down' }
      ));
    }
    
    device.powerOn = true;
    currentRuntime.devices.set(id, device);
    
    currentRuntime.traceBuffer.push({
      at: currentRuntime.now,
      type: 'device_add',
      sourceDevice: id,
      description: `${name} added to topology`
    });
    
    setRuntime({ ...currentRuntime });
    
    console.log(`[Simulator] Added device ${name} (${type})`);
    return id;
  }, []);
  
  const removeDevice = useCallback((deviceId: string) => {
    const currentRuntime = runtimeRef.current;
    if (!currentRuntime) return;
    
    const device = currentRuntime.devices.get(deviceId);
    currentRuntime.devices.delete(deviceId);
    
    // Remover links asociados
    for (const [linkId, link] of currentRuntime.links) {
      if (link.deviceA === deviceId || link.deviceB === deviceId) {
        currentRuntime.links.delete(linkId);
      }
    }
    
    if (device) {
      currentRuntime.traceBuffer.push({
        at: currentRuntime.now,
        type: 'device_remove',
        description: `${device.name} removed from topology`
      });
    }
    
    setRuntime({ ...currentRuntime });
    
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
    }
    
    console.log(`[Simulator] Removed device ${deviceId}`);
  }, [selectedDevice]);
  
  // === Trazas ===
  
  const getTraces = useCallback((): TraceEntry[] => {
    return runtimeRef.current?.traceBuffer ?? [];
  }, []);
  
  const clearTraces = useCallback(() => {
    const currentRuntime = runtimeRef.current;
    if (currentRuntime) {
      currentRuntime.traceBuffer = [];
      setRuntime({ ...currentRuntime });
    }
  }, []);
  
  // === Utilidades ===
  
  const generateMAC = (): string => {
    const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
  };
  
  // === Cleanup ===
  
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // === Context Value ===
  
  const value: SimulatorContextType = {
    engine,
    runtime,
    mode,
    selectedDevice,
    isRunning,
    speed,
    initSimulation,
    step,
    start,
    run,
    pause,
    reset,
    selectDevice,
    setMode,
    setSpeed,
    addDevice,
    removeDevice,
    getTraces,
    clearTraces
  };
  
  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

// =============================================================================
// HOOK EXPORTS
// =============================================================================

/**
 * Hook para acceder al contexto del simulador
 * 
 * Proporciona acceso directo al estado y funciones de control del simulador.
 * Debe usarse dentro de un SimulatorProvider.
 */
export function useSimulator(): SimulatorContextType {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
}

/**
 * Hook alternativo para acceder al contexto del simulador (alias)
 * 
 * @deprecated Use useSimulator instead
 */
export function useSimulatorContext(): SimulatorContextType {
  return useSimulator();
}