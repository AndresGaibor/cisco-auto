/**
 * Session Metrics - Telemetría en tiempo real para sesiones de PT Collab.
 * Permite diagnosticar problemas y exportar a sistemas de monitoreo.
 */

export interface SessionMetrics {
  sessionId: string;
  startedAt: number;
  uptimeMs: number;

  // Conectividad
  reconnectAttempts: number;
  reconnectSuccesses: number;
  reconnectFailures: number;
  lastReconnectAt: number | null;
  averageReconnectDelayMs: number;

  // Sincronización
  deltasSubmitted: number;
  deltasReceived: number;
  deltasAccepted: number;
  deltasRejected: number;
  deltaThroughputPerMinute: number;

  // Bridge IPC
  bridgePolls: number;
  bridgePollFailures: number;
  bridgeAverageLatencyMs: number;
  bridgeMaxLatencyMs: number;
  bridgeStuckEvents: number;

  // Checkpoints
  checkpointsPublished: number;
  checkpointsDownloaded: number;
  checkpointIntegrityFailures: number;

  // Conflictos
  conflictsDetected: number;
  conflictsResolved: number;

  // Errores
  errors: number;
  warnings: number;
}

export interface MetricsSnapshot {
  timestamp: number;
  metrics: SessionMetrics;
}

export class SessionMetricsCollector {
  private readonly metrics: SessionMetrics;
  private readonly latencySamples: number[] = [];
  private readonly reconnectDelays: number[] = [];
  private readonly deltaTimestamps: number[] = [];
  private readonly maxSamples = 1000;

  constructor(sessionId: string) {
    this.metrics = {
      sessionId,
      startedAt: Date.now(),
      uptimeMs: 0,

      reconnectAttempts: 0,
      reconnectSuccesses: 0,
      reconnectFailures: 0,
      lastReconnectAt: null,
      averageReconnectDelayMs: 0,

      deltasSubmitted: 0,
      deltasReceived: 0,
      deltasAccepted: 0,
      deltasRejected: 0,
      deltaThroughputPerMinute: 0,

      bridgePolls: 0,
      bridgePollFailures: 0,
      bridgeAverageLatencyMs: 0,
      bridgeMaxLatencyMs: 0,
      bridgeStuckEvents: 0,

      checkpointsPublished: 0,
      checkpointsDownloaded: 0,
      checkpointIntegrityFailures: 0,

      conflictsDetected: 0,
      conflictsResolved: 0,

      errors: 0,
      warnings: 0,
    };
  }

  recordReconnectAttempt(delayMs: number): void {
    this.metrics.reconnectAttempts++;
    this.reconnectDelays.push(delayMs);
    if (this.reconnectDelays.length > this.maxSamples) {
      this.reconnectDelays.shift();
    }
    this.metrics.averageReconnectDelayMs = this.average(this.reconnectDelays);
  }

  recordReconnectSuccess(): void {
    this.metrics.reconnectSuccesses++;
    this.metrics.lastReconnectAt = Date.now();
  }

  recordReconnectFailure(): void {
    this.metrics.reconnectFailures++;
  }

  recordDeltaSubmitted(): void {
    this.metrics.deltasSubmitted++;
    this.recordDeltaTimestamp();
  }

  recordDeltaReceived(accepted: boolean): void {
    this.metrics.deltasReceived++;
    if (accepted) this.metrics.deltasAccepted++;
    else this.metrics.deltasRejected++;
  }

  recordBridgePoll(latencyMs: number, success: boolean): void {
    this.metrics.bridgePolls++;
    if (!success) this.metrics.bridgePollFailures++;

    this.latencySamples.push(latencyMs);
    if (this.latencySamples.length > this.maxSamples) {
      this.latencySamples.shift();
    }
    this.metrics.bridgeAverageLatencyMs = this.average(this.latencySamples);
    this.metrics.bridgeMaxLatencyMs = Math.max(this.metrics.bridgeMaxLatencyMs, latencyMs);
  }

  recordBridgeStuck(): void {
    this.metrics.bridgeStuckEvents++;
  }

  recordCheckpointPublished(): void {
    this.metrics.checkpointsPublished++;
  }

  recordCheckpointDownloaded(integrityOk: boolean): void {
    this.metrics.checkpointsDownloaded++;
    if (!integrityOk) this.metrics.checkpointIntegrityFailures++;
  }

  recordConflict(): void {
    this.metrics.conflictsDetected++;
  }

  recordConflictResolved(): void {
    this.metrics.conflictsResolved++;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  recordWarning(): void {
    this.metrics.warnings++;
  }

  getSnapshot(): MetricsSnapshot {
    this.metrics.uptimeMs = Date.now() - this.metrics.startedAt;
    this.metrics.deltaThroughputPerMinute = this.computeDeltaThroughput();

    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    };
  }

  private recordDeltaTimestamp(): void {
    const now = Date.now();
    this.deltaTimestamps.push(now);
    if (this.deltaTimestamps.length > this.maxSamples) {
      this.deltaTimestamps.shift();
    }
  }

  private computeDeltaThroughput(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const recent = this.deltaTimestamps.filter((ts) => ts >= oneMinuteAgo);
    return recent.length;
  }

  private average(samples: number[]): number {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((a, b) => a + b, 0);
    return Math.round((sum / samples.length) * 100) / 100;
  }

  reset(): void {
    this.metrics.reconnectAttempts = 0;
    this.metrics.reconnectSuccesses = 0;
    this.metrics.reconnectFailures = 0;
    this.deltaTimestamps.length = 0;
    this.reconnectDelays.length = 0;
  }
}

export function formatMetricsForHumans(snapshot: MetricsSnapshot): string {
  const m = snapshot.metrics;
  const minutes = Math.floor(m.uptimeMs / 60_000);
  const seconds = Math.floor((m.uptimeMs % 60_000) / 1000);
  const uptimeStr = `${minutes}m ${seconds}s`;

  const lines = [
    `Sesión: ${m.sessionId.slice(0, 12)}... (uptime: ${uptimeStr})`,
    ``,
    `Conectividad:`,
    `  Reintentos: ${m.reconnectAttempts} (${m.reconnectSuccesses} ok, ${m.reconnectFailures} fail)`,
    `  Delay promedio: ${m.averageReconnectDelayMs}ms`,
    ``,
    `Sincronización:`,
    `  Deltas enviados: ${m.deltasSubmitted} (${m.deltaThroughputPerMinute}/min)`,
    `  Deltas recibidos: ${m.deltasReceived} (${m.deltasAccepted} ok, ${m.deltasRejected} rechazados)`,
    ``,
    `Bridge IPC:`,
    `  Polls: ${m.bridgePolls} (${m.bridgePollFailures} fallidos)`,
    `  Latencia: avg=${m.bridgeAverageLatencyMs}ms, max=${m.bridgeMaxLatencyMs}ms`,
    `  Stuck events: ${m.bridgeStuckEvents}`,
    ``,
    `Checkpoints:`,
    `  Publicados: ${m.checkpointsPublished}`,
    `  Descargados: ${m.checkpointsDownloaded} (${m.checkpointIntegrityFailures} fallos de integridad)`,
    ``,
    `Conflictos:`,
    `  Detectados: ${m.conflictsDetected} | Resueltos: ${m.conflictsResolved}`,
    ``,
    `Errores/Warnings: ${m.errors}/${m.warnings}`,
  ];

  return lines.join("\n");
}
