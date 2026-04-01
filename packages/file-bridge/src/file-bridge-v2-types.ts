/**
 * File Bridge V2 Types - Type definitions for file bridge operations
 * Interfaces for bridge options, health, and reports
 */

// ============================================================================
// Bridge Options
// ============================================================================

export interface FileBridgeV2Options {
  readonly baseDir: string;
  readonly port?: number;
  readonly persistentQueue?: boolean;
  readonly highWaterMark?: number;
  readonly batchSize?: number;
  readonly flushInterval?: number;
  readonly compressionLevel?: number;
  readonly enableMetrics?: boolean;
  readonly metricsInterval?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
}

// ============================================================================
// Health & Monitoring
// ============================================================================

export interface BridgeHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  messagesProcessed: number;
  messagesFailed: number;
  lastError?: string;
  lastErrorTime?: number;
  queueDepth: number;
  avgLatency: number;
  peakLatency: number;
  cpuUsage?: number;
  memoryUsage?: number;
  timestamp: number;
}

export interface BridgeMetrics {
  startTime: number;
  messagesIn: number;
  messagesOut: number;
  messagesFailed: number;
  bytesSent: number;
  bytesReceived: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  errorRate: number;
  successRate: number;
  uptime: number;
}

// ============================================================================
// Garbage Collection Reports
// ============================================================================

export interface GCReport {
  timestamp: number;
  duration: number;
  itemsCollected: number;
  spaceFreed: number;
  oldestItemAge: number;
  itemsKept: number;
  errors: GCError[];
}

export interface GCError {
  path: string;
  reason: string;
  timestamp: number;
}

// ============================================================================
// Queue Types
// ============================================================================

export interface QueueItem<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface QueueStats {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  oldestItemAge: number;
  newestItemAge: number;
  avgItemSize: number;
  totalSize: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type BridgeEventType =
  | 'connected'
  | 'disconnected'
  | 'message'
  | 'error'
  | 'health-check'
  | 'gc-complete'
  | 'queue-full'
  | 'queue-empty'
  | 'threshold-exceeded';

export interface BridgeEvent {
  type: BridgeEventType;
  timestamp: number;
  data?: unknown;
  error?: Error;
}
