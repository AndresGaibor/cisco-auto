/**
 * EventLog Component
 * 
 * Muestra eventos del simulador en tiempo real con:
 * - Timestamps relativos
 * - Coloreado por tipo de evento
 * - Scroll automático al último evento
 */

import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useSimulator } from '../hooks/useSimulator';
import type { TraceEntry } from '@cisco-auto/sim-runtime';

/**
 * Formatea timestamp relativo
 */
function formatRelativeTimestamp(eventTime: number, currentTime: number): string {
  const diff = currentTime - eventTime;
  
  if (diff < 0) return 'future';
  if (diff === 0) return 'now';
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

/**
 * Obtiene el color según el tipo de evento
 */
function getEventColor(type: string): string {
  const colorMap: Record<string, string> = {
    // Frame events
    'frame_tx': 'green',
    'frame_rx': 'blue',
    'frame_forward': 'cyan',
    
    // IP events
    'ip_tx': 'green',
    'ip_rx': 'blue',
    'ip_forward': 'cyan',
    'ip_local': 'magenta',
    
    // ARP events
    'arp_request': 'yellow',
    'arp_reply': 'cyan',
    'arp_request_sent': 'yellow',
    
    // ICMP events
    'icmp_echo_req': 'magenta',
    'icmp_echo_reply': 'green',
    'icmp_time_exceeded': 'red',
    'icmp_dest_unreach': 'red',
    
    // Device events
    'device_add': 'green',
    'device_remove': 'red',
    'device_power_on': 'green',
    'device_power_off': 'red',
    'interface_up': 'green',
    'interface_down': 'red',
    
    // Errors
    'error': 'red',
    'drop': 'red',
    'collision': 'yellow'
  };
  
  return colorMap[type] || 'white';
}

/**
 * Obtiene el icono del evento
 */
function getEventIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'frame_tx': '→',
    'frame_rx': '←',
    'frame_forward': '⤳',
    'ip_tx': '→',
    'ip_rx': '←',
    'ip_forward': '⤳',
    'ip_local': '◎',
    'arp_request': '?',
    'arp_reply': '!',
    'arp_request_sent': '?',
    'icmp_echo_req': '◉',
    'icmp_echo_reply': '○',
    'icmp_time_exceeded': '⚠',
    'icmp_dest_unreach': '✕',
    'device_add': '+',
    'device_remove': '-',
    'device_power_on': '▶',
    'device_power_off': '⏸',
    'interface_up': '▲',
    'interface_down': '▼',
    'error': '✗',
    'drop': '↓',
    'collision': '⚡'
  };
  
  return iconMap[type] || '•';
}

/**
 * Trunca descripción
 */
function truncateDescription(desc: string, maxLength: number = 50): string {
  if (desc.length <= maxLength) return desc;
  return desc.substring(0, maxLength - 3) + '...';
}

/**
 * Componente para un evento individual
 */
function EventRow({ event, now }: { event: TraceEntry; now: number }) {
  const color = getEventColor(event.type);
  const icon = getEventIcon(event.type);
  const time = formatRelativeTimestamp(event.at, now);
  const desc = truncateDescription(event.description, 60);
  
  return (
    <Box>
      <Box width={10}>
        <Text dimColor>[{time.padStart(6, ' ')}]</Text>
      </Box>
      <Box width={3}>
        <Text color={color} bold>{` ${icon} `}</Text>
      </Box>
      <Box width={14}>
        <Text color={color} bold>{event.type.substring(0, 12)}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>{desc}</Text>
      </Box>
    </Box>
  );
}

export function EventLog() {
  const { runtime, getTraces } = useSimulator();
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  const traces = useMemo(() => getTraces(), [runtime?.traceBuffer]);
  const now = runtime?.now ?? 0;
  
  // Calcular cuántos eventos caben en la pantalla
  const maxVisibleEvents = 8;
  const totalEvents = traces.length;
  
  const visibleEvents = useMemo(() => {
    if (autoScroll) {
      return traces.slice(-maxVisibleEvents);
    }
    return traces.slice(scrollOffset, scrollOffset + maxVisibleEvents);
  }, [traces, autoScroll, scrollOffset]);
  
  // Navegación con teclado
  useInput((input, key) => {
    if (input === 'l') {
      // Toggle auto-scroll
      setAutoScroll(!autoScroll);
      if (!autoScroll) {
        setScrollOffset(Math.max(0, totalEvents - maxVisibleEvents));
      }
    }
    
    if (!autoScroll) {
      if (key.upArrow) {
        setScrollOffset(Math.max(0, scrollOffset - 1));
      } else if (key.downArrow) {
        setScrollOffset(Math.min(Math.max(0, totalEvents - maxVisibleEvents), scrollOffset + 1));
      }
    }
    
    // Ir al final
    if (input === 'L') {
      setAutoScroll(true);
      setScrollOffset(Math.max(0, totalEvents - maxVisibleEvents));
    }
  });
  
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color="yellow"> Events </Text>
        <Text dimColor>
          {`[${totalEvents}] Sim: ${now}ms `}
          {autoScroll ? '(auto)' : `(${scrollOffset + 1}-${Math.min(scrollOffset + maxVisibleEvents, totalEvents)})`}
        </Text>
      </Box>
      
      {/* Controles */}
      <Text dimColor> [l] Auto-scroll [↑↓] Scroll [L] End </Text>
      
      {/* Lista de eventos */}
      <Box marginTop={1} flexDirection="column">
        {visibleEvents.length === 0 ? (
          <Text dimColor>No events yet. Start simulation to see events.</Text>
        ) : (
          visibleEvents.map((event, i) => (
            <EventRow
              key={`${event.at}-${i}`}
              event={event}
              now={now}
            />
          ))
        )}
      </Box>
      
      {/* Indicador de scroll */}
      {totalEvents > maxVisibleEvents && (
        <Box justifyContent="flex-end">
          <Text dimColor>
            {autoScroll ? '▼ Following' : `▼ ${totalEvents - scrollOffset - maxVisibleEvents} more`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default EventLog;