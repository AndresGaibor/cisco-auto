/**
 * @cisco-auto/tui
 * 
 * Hook principal para conectar el TUI con el motor de simulación.
 * Proporciona acceso al estado del simulador y funciones de control.
 * 
 * Este es un wrapper enriquecido del useSimulator del contexto que añade
 * funcionalidades adicionales como loadLab, scheduleEvent, getStats, etc.
 */

import { useCallback, useMemo } from 'react';
import { useSimulator as useSimulatorContext } from '../context/SimulatorContext';
import type { SimEngine, SimEvent } from '@cisco-auto/sim-engine';
import type { 
  RuntimeState, 
  DeviceRuntime, 
  InterfaceRuntime,
  TraceEntry 
} from '@cisco-auto/sim-runtime';
import type { DeviceSpec, ConnectionSpec } from '@cisco-auto/lab-model';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Retorno del hook useSimulator
 */
export interface UseSimulatorReturn {
  // === Estado del motor ===
  /** Instancia del motor de simulación */
  engine: SimEngine | null;
  
  /** Estado del runtime */
  runtime: RuntimeState | null;
  
  /** ¿Está corriendo la simulación? */
  isRunning: boolean;
  
  /** Tiempo virtual actual */
  currentTime: number;
  
  /** Velocidad de simulación (eventos por segundo) */
  speed: number;
  
  /** Modo de operación */
  mode: 'edit' | 'realtime' | 'simulation';
  
  /** Dispositivo seleccionado actualmente */
  selectedDevice: string | null;
  
  // === Control del motor ===
  /** Inicia la simulación */
  start: () => void;
  
  /** Pausa la simulación */
  pause: () => void;
  
  /** Alias para start (compatibilidad) */
  run: () => void;
  
  /** Ejecuta un único paso */
  step: () => void;
  
  /** Resetea la simulación */
  reset: () => void;
  
  /** Establece la velocidad de simulación */
  setSpeed: (speed: number) => void;
  
  /** Establece el modo de operación */
  setMode: (mode: 'edit' | 'realtime' | 'simulation') => void;
  
  // === Manipulación ===
  /** Inicializa la simulación con una semilla opcional */
  initSimulation: (seed?: number) => void;
  
  /** Carga un laboratorio completo */
  loadLab: (devices: DeviceSpec[], connections: ConnectionSpec[]) => void;
  
  /** Agenda un evento */
  scheduleEvent: (event: Omit<SimEvent, 'id' | 'sequence'>) => SimEvent | null;
  
  /** Agrega un dispositivo */
  addDevice: (type: string, name: string) => string | null;
  
  /** Remueve un dispositivo */
  removeDevice: (deviceId: string) => void;
  
  /** Selecciona un dispositivo */
  selectDevice: (deviceId: string | null) => void;
  
  // === Estado de dispositivos ===
  /** Obtiene el estado de un dispositivo */
  getDeviceState: (deviceId: string) => DeviceRuntime | undefined;
  
  /** Obtiene el estado de un puerto */
  getPortState: (deviceId: string, portName: string) => InterfaceRuntime | undefined;
  
  /** Obtiene lista de todos los dispositivos */
  getDevices: () => DeviceRuntime[];
  
  // === Estadísticas ===
  /** Obtiene estadísticas de la simulación */
  getStats: () => { 
    eventsProcessed: number; 
    eventsPending: number;
    devicesActive: number;
    framesSent: number;
    framesReceived: number;
    packetsDropped: number;
  };
  
  // === Trazas ===
  /** Obtiene las trazas de eventos */
  getTraces: () => TraceEntry[];
  
  /** Limpia el buffer de trazas */
  clearTraces: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook principal del simulador
 * 
 * Proporciona acceso completo al estado y control del motor de simulación.
 * Debe usarse dentro de un SimulatorProvider.
 * 
 * Este hook extiende el contexto base con funciones adicionales como
 * loadLab, scheduleEvent, getStats, getDevices, etc.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isRunning, start, pause, step, getDevices } = useSimulator();
 *   
 *   return (
 *     <Box>
 *       <Text>Running: {isRunning ? 'Yes' : 'No'}</Text>
 *     </Box>
 *   );
 * }
 * ```
 */
export function useSimulator(): UseSimulatorReturn {
  const context = useSimulatorContext();
  
  const {
    engine,
    runtime,
    isRunning,
    speed,
    mode,
    selectedDevice,
    initSimulation,
    start,
    pause,
    run,
    step,
    reset,
    setSpeed,
    setMode,
    addDevice,
    removeDevice,
    selectDevice,
    getTraces,
    clearTraces
  } = context;
  
  // === Estado derivado ===
  const currentTime = useMemo(() => runtime?.now ?? 0, [runtime?.now]);
  
  // === Funciones de manipulación ===
  
  /**
   * Carga un laboratorio completo
   */
  const loadLab = useCallback((devices: DeviceSpec[], connections: ConnectionSpec[]) => {
    if (!engine || !runtime) {
      console.warn('Simulator not initialized. Call initSimulation first.');
      return;
    }
    
    // Limpiar estado anterior
    runtime.devices.clear();
    runtime.links.clear();
    runtime.traceBuffer = [];
    runtime.now = 0;
    
    // Importar dispositivos al runtime
    for (const deviceSpec of devices) {
      const deviceRuntime = createDeviceRuntimeFromSpec(deviceSpec);
      runtime.devices.set(deviceRuntime.id, deviceRuntime);
    }
    
    // Importar conexiones
    for (const conn of connections) {
      const linkRuntime = createLinkRuntimeFromConnection(conn);
      runtime.links.set(linkRuntime.id, linkRuntime);
      
      // Actualizar estado de interfaces
      const deviceA = runtime.devices.get(conn.from.deviceId);
      const deviceB = runtime.devices.get(conn.to.deviceId);
      
      if (deviceA) {
        const ifaceA = deviceA.interfaces.get(conn.from.port);
        if (ifaceA) {
          ifaceA.linkStatus = 'up';
        }
      }
      
      if (deviceB) {
        const ifaceB = deviceB.interfaces.get(conn.to.port);
        if (ifaceB) {
          ifaceB.linkStatus = 'up';
        }
      }
    }
    
    // Forzar re-render
    if (runtime) {
      runtime.stats = { ...runtime.stats };
    }
  }, [engine, runtime]);
  
  /**
   * Agenda un evento
   */
  const scheduleEvent = useCallback((event: Omit<SimEvent, 'id' | 'sequence'>): SimEvent | null => {
    if (!engine) {
      console.warn('Engine not initialized');
      return null;
    }
    return engine.schedule(event);
  }, [engine]);
  
  // === Funciones de consulta ===
  
  /**
   * Obtiene el estado de un dispositivo
   */
  const getDeviceState = useCallback((deviceId: string): DeviceRuntime | undefined => {
    return runtime?.devices.get(deviceId);
  }, [runtime]);
  
  /**
   * Obtiene el estado de un puerto
   */
  const getPortState = useCallback((deviceId: string, portName: string): InterfaceRuntime | undefined => {
    const device = runtime?.devices.get(deviceId);
    return device?.interfaces.get(portName);
  }, [runtime]);
  
  /**
   * Obtiene lista de todos los dispositivos
   */
  const getDevices = useCallback((): DeviceRuntime[] => {
    if (!runtime) return [];
    return Array.from(runtime.devices.values());
  }, [runtime]);
  
  /**
   * Obtiene estadísticas de la simulación
   */
  const getStats = useCallback(() => {
    return {
      eventsProcessed: engine?.getEventsProcessed() ?? 0,
      eventsPending: engine?.getPendingEvents() ?? 0,
      devicesActive: runtime?.devices.size ?? 0,
      framesSent: runtime?.stats.framesSent ?? 0,
      framesReceived: runtime?.stats.framesReceived ?? 0,
      packetsDropped: runtime?.stats.packetsDropped ?? 0
    };
  }, [engine, runtime]);
  
  return {
    // Estado
    engine,
    runtime,
    isRunning,
    currentTime,
    speed,
    mode,
    selectedDevice,
    
    // Control
    start,
    pause,
    run,
    step,
    reset,
    setSpeed,
    setMode,
    
    // Manipulación
    initSimulation,
    loadLab,
    scheduleEvent,
    addDevice,
    removeDevice,
    selectDevice,
    
    // Consulta
    getDeviceState,
    getPortState,
    getDevices,
    getStats,
    
    // Trazas
    getTraces,
    clearTraces
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

import { RuntimeFactory } from '@cisco-auto/sim-runtime';
import type { DeviceType } from '@cisco-auto/lab-model';
import { getDeviceFamily } from '@cisco-auto/lab-model';

/**
 * Convierte un DeviceSpec a DeviceRuntime
 */
function createDeviceRuntimeFromSpec(spec: DeviceSpec): DeviceRuntime {
  const interfaces = new Map<string, InterfaceRuntime>();
  
  for (const ifaceSpec of spec.interfaces) {
    // Convert status to linkStatus, handling administratively-down
    let linkStatus: 'up' | 'down' = 'down';
    if (ifaceSpec.status === 'up') {
      linkStatus = 'up';
    } else if (ifaceSpec.status === 'down' || ifaceSpec.status === 'administratively-down') {
      linkStatus = 'down';
    }
    
    interfaces.set(ifaceSpec.name, RuntimeFactory.createInterface(
      ifaceSpec.name,
      ifaceSpec.mac || generateMAC(),
      {
        ip: ifaceSpec.ip,
        subnetMask: ifaceSpec.subnetMask,
        vlan: ifaceSpec.vlan ?? 1,
        switchportMode: ifaceSpec.switchportMode ?? 'access',
        adminStatus: ifaceSpec.shutdown ? 'down' : 'up',
        linkStatus: linkStatus
      }
    ));
  }
  
  // Agregar VLANs
  const vlans = new Map<number, { id: number; name: string }>();
  vlans.set(1, { id: 1, name: 'default' });
  
  if (spec.vlans) {
    for (const vlan of spec.vlans) {
      vlans.set(vlan.id, { id: vlan.id, name: vlan.name ?? `VLAN${vlan.id}` });
    }
  }
  
  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    family: getDeviceFamily(spec.type),
    powerOn: spec.powerOn ?? true,
    interfaces,
    macTable: new Map(),
    arpTable: new Map(),
    routingTable: [],
    vlans,
    activeProcesses: new Set(),
    pendingTimers: new Map(),
    commandQueue: [],
    eventLog: []
  };
}

/**
 * Convierte un ConnectionSpec a LinkRuntime
 */
function createLinkRuntimeFromConnection(conn: ConnectionSpec): any {
  // Convert linkStatus, handling 'error' case
  let linkStatus: 'up' | 'down' = 'up';
  if (conn.linkStatus === 'down' || conn.linkStatus === 'error') {
    linkStatus = 'down';
  }
  
  return RuntimeFactory.createLink(
    conn.from.deviceId,
    conn.from.port,
    conn.to.deviceId,
    conn.to.port,
    { id: conn.id, status: linkStatus }
  );
}

/**
 * Genera un MAC address aleatorio
 */
function generateMAC(): string {
  const bytes = Array.from({ length: 6 }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  );
  return bytes.join(':');
}

export default useSimulator;