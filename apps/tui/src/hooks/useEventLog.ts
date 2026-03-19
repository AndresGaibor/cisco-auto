/**
 * @cisco-auto/tui
 * 
 * Hook para obtener y formatear eventos del simulador.
 */

import { useMemo, useCallback } from 'react';
import { useSimulator } from './useSimulator';
import type { TraceEntry } from '@cisco-auto/sim-runtime';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tipos de eventos para filtrado
 */
export type EventCategory = 
  | 'frame'
  | 'packet'
  | 'arp'
  | 'icmp'
  | 'control'
  | 'error'
  | 'all';

/**
 * Opciones de filtrado para eventos
 */
export interface EventFilterOptions {
  /** Categoría de eventos */
  category?: EventCategory;
  
  /** Filtrar por dispositivo origen */
  sourceDevice?: string;
  
  /** Filtrar por dispositivo destino */
  targetDevice?: string;
  
  /** Filtrar por tipo específico */
  type?: string;
  
  /** Tiempo mínimo */
  fromTime?: number;
  
  /** Tiempo máximo */
  toTime?: number;
  
  /** Máximo número de eventos a retornar */
  limit?: number;
  
  /** Incluir eventos en reverso (más recientes primero) */
  reverse?: boolean;
}

/**
 * Evento formateado para visualización
 */
export interface FormattedEvent {
  /** ID del evento */
  id: string;
  
  /** Tiempo del evento */
  time: number;
  
  /** Timestamp formateado */
  timestamp: string;
  
  /** Tipo de evento */
  type: string;
  
  /** Categoría del evento */
  category: EventCategory;
  
  /** Dispositivo origen */
  sourceDevice?: string;
  
  /** Dispositivo destino */
  targetDevice?: string;
  
  /** Descripción corta */
  shortDescription: string;
  
  /** Descripción detallada */
  fullDescription: string;
  
  /** Severidad para colorear */
  severity: 'info' | 'warning' | 'error' | 'success';
  
  /** Payload crudo */
  payload?: unknown;
}

/**
 * Retorno del hook useEventLog
 */
export interface UseEventLogReturn {
  /** Lista completa de eventos formateados */
  events: FormattedEvent[];
  
  /** Eventos filtrados según opciones */
  filteredEvents: FormattedEvent[];
  
  /** Últimos N eventos */
  recentEvents: FormattedEvent[];
  
  /** Conteo por categoría */
  countByCategory: Record<EventCategory, number>;
  
  /** Total de eventos */
  total: number;
  
  /** Limpiar log de eventos */
  clearLog: () => void;
  
  /** Obtener eventos formateados como texto */
  getAsText: (limit?: number) => string;
  
  /** Exportar eventos como JSON */
  exportAsJSON: () => string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determina la categoría de un evento
 */
function getEventCategory(type: string): EventCategory {
  if (type.includes('frame') || type.includes('ethernet')) return 'frame';
  if (type.includes('packet') || type.includes('ip')) return 'packet';
  if (type.includes('arp')) return 'arp';
  if (type.includes('icmp') || type.includes('ping') || type.includes('echo')) return 'icmp';
  if (type.includes('error') || type.includes('drop') || type.includes('timeout')) return 'error';
  if (type.includes('link') || type.includes('interface') || type.includes('device')) return 'control';
  return 'all';
}

/**
 * Determina la severidad de un evento
 */
function getEventSeverity(type: string): 'info' | 'warning' | 'error' | 'success' {
  if (type.includes('error') || type.includes('drop') || type.includes('unreachable')) return 'error';
  if (type.includes('warning') || type.includes('timeout')) return 'warning';
  if (type.includes('success') || type.includes('reply') || type.includes('up')) return 'success';
  return 'info';
}

/**
 * Formatea un timestamp virtual
 */
function formatTimestamp(time: number): string {
  // Formato: HH:MM:SS.mmm
  const totalMs = time;
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  return `${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}s`;
}

/**
 * Genera descripción corta
 */
function getShortDescription(event: TraceEntry): string {
  switch (event.type) {
    case 'frame_rx':
      return `Frame RX: ${event.sourceDevice}`;
    case 'frame_tx':
      return `Frame TX: ${event.sourceDevice}`;
    case 'ip_rx':
      return `IP RX: ${event.sourceDevice}`;
    case 'ip_forward':
      return `IP Fwd: ${event.sourceDevice}`;
    case 'arp_request':
      return 'ARP Request';
    case 'arp_reply':
      return 'ARP Reply';
    case 'icmp_echo_req':
      return 'Ping Request';
    case 'icmp_reply':
      return 'Ping Reply';
    case 'link_up':
      return 'Link Up';
    case 'link_down':
      return 'Link Down';
    default:
      return event.type;
  }
}

/**
 * Formatea un evento para visualización
 */
function formatEvent(event: TraceEntry, index: number): FormattedEvent {
  return {
    id: `evt-${index}-${event.at}`,
    time: event.at,
    timestamp: formatTimestamp(event.at),
    type: event.type,
    category: getEventCategory(event.type),
    sourceDevice: event.sourceDevice,
    targetDevice: event.targetDevice,
    shortDescription: getShortDescription(event),
    fullDescription: event.description,
    severity: getEventSeverity(event.type),
    payload: event.payload
  };
}

/**
 * Aplica filtros a la lista de eventos
 */
function applyFilters(events: FormattedEvent[], filters: EventFilterOptions): FormattedEvent[] {
  let result = events;
  
  // Filtro por categoría
  if (filters.category && filters.category !== 'all') {
    result = result.filter(e => e.category === filters.category);
  }
  
  // Filtro por dispositivo origen
  if (filters.sourceDevice) {
    result = result.filter(e => e.sourceDevice === filters.sourceDevice);
  }
  
  // Filtro por dispositivo destino
  if (filters.targetDevice) {
    result = result.filter(e => e.targetDevice === filters.targetDevice);
  }
  
  // Filtro por tipo específico
  if (filters.type) {
    result = result.filter(e => e.type === filters.type);
  }
  
  // Filtro por rango de tiempo
  if (filters.fromTime !== undefined) {
    result = result.filter(e => e.time >= filters.fromTime!);
  }
  if (filters.toTime !== undefined) {
    result = result.filter(e => e.time <= filters.toTime!);
  }
  
  // Ordenar
  if (filters.reverse) {
    result = [...result].reverse();
  }
  
  // Limitar
  if (filters.limit !== undefined) {
    result = result.slice(0, filters.limit);
  }
  
  return result;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook para obtener y formatear eventos del simulador
 * 
 * @param filters - Opciones de filtrado
 * @returns Lista de eventos y utilidades de formateo
 * 
 * @example
 * ```tsx
 * function EventLog() {
 *   const { recentEvents, getAsText } = useEventLog({ limit: 10 });
 *   
 *   return (
 *     <Box flexDirection="column">
 *       {recentEvents.map(event => (
 *         <Text key={event.id} color={event.severity}>
 *           {event.timestamp} {event.shortDescription}
 *         </Text>
 *       ))}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useEventLog(filters: EventFilterOptions = {}): UseEventLogReturn {
  const { getTraces, clearTraces, selectedDevice } = useSimulator();
  
  // Obtener y formatear eventos
  const events = useMemo(() => {
    const traces = getTraces();
    return traces.map((trace, index) => formatEvent(trace, index));
  }, [getTraces]);
  
  // Aplicar filtros
  const filteredEvents = useMemo(() => {
    // Si hay un dispositivo seleccionado, filtrar por defecto
    const effectiveFilters = {
      ...filters,
      sourceDevice: filters.sourceDevice ?? selectedDevice ?? undefined
    };
    return applyFilters(events, effectiveFilters);
  }, [events, filters, selectedDevice]);
  
  // Eventos recientes (últimos 20)
  const recentEvents = useMemo(() => {
    return [...events].reverse().slice(0, 20);
  }, [events]);
  
  // Conteos por categoría
  const countByCategory = useMemo(() => {
    const counts: Record<EventCategory, number> = {
      frame: 0,
      packet: 0,
      arp: 0,
      icmp: 0,
      control: 0,
      error: 0,
      all: events.length
    };
    
    for (const event of events) {
      if (event.category !== 'all') {
        counts[event.category]++;
      }
    }
    
    return counts;
  }, [events]);
  
  // Limpiar log
  const clearLog = useCallback(() => {
    clearTraces();
  }, [clearTraces]);
  
  // Obtener como texto
  const getAsText = useCallback((limit: number = 50): string => {
    const limited = events.slice(-limit);
    return limited.map(e => 
      `[${e.timestamp}] ${e.type}: ${e.fullDescription}`
    ).join('\n');
  }, [events]);
  
  // Exportar como JSON
  const exportAsJSON = useCallback((): string => {
    return JSON.stringify(events, null, 2);
  }, [events]);
  
  return {
    events,
    filteredEvents,
    recentEvents,
    countByCategory,
    total: events.length,
    clearLog,
    getAsText,
    exportAsJSON
  };
}

export default useEventLog;
