import { describe, expect, test } from "bun:test";
import { SessionMetricsCollector, formatMetricsForHumans } from "../telemetry/session-metrics.js";

describe("SessionMetricsCollector", () => {
  test("inicializa con valores en cero", () => {
    const collector = new SessionMetricsCollector("session-123");
    const snapshot = collector.getSnapshot();

    expect(snapshot.metrics.sessionId).toBe("session-123");
    expect(snapshot.metrics.deltasSubmitted).toBe(0);
    expect(snapshot.metrics.errors).toBe(0);
    expect(snapshot.metrics.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  test("registra reconexiones correctamente", () => {
    const collector = new SessionMetricsCollector("session-1");
    collector.recordReconnectAttempt(2000);
    collector.recordReconnectAttempt(4000);
    collector.recordReconnectSuccess();
    collector.recordReconnectFailure();

    const snap = collector.getSnapshot();
    expect(snap.metrics.reconnectAttempts).toBe(2);
    expect(snap.metrics.reconnectSuccesses).toBe(1);
    expect(snap.metrics.reconnectFailures).toBe(1);
    expect(snap.metrics.averageReconnectDelayMs).toBe(3000);
    expect(snap.metrics.lastReconnectAt).not.toBeNull();
  });

  test("calcula delta throughput por minuto", async () => {
    const collector = new SessionMetricsCollector("session-1");
    collector.recordDeltaSubmitted();
    collector.recordDeltaSubmitted();
    collector.recordDeltaSubmitted();
    collector.recordDeltaSubmitted();
    collector.recordDeltaSubmitted();

    const snap = collector.getSnapshot();
    expect(snap.metrics.deltasSubmitted).toBe(5);
    expect(snap.metrics.deltaThroughputPerMinute).toBeGreaterThanOrEqual(4);
  });

  test("registra latencia del bridge y calcula promedio", () => {
    const collector = new SessionMetricsCollector("session-1");
    collector.recordBridgePoll(50, true);
    collector.recordBridgePoll(100, true);
    collector.recordBridgePoll(200, true);
    collector.recordBridgePoll(1000, false);

    const snap = collector.getSnapshot();
    expect(snap.metrics.bridgePolls).toBe(4);
    expect(snap.metrics.bridgePollFailures).toBe(1);
    expect(snap.metrics.bridgeAverageLatencyMs).toBe(337.5);
    expect(snap.metrics.bridgeMaxLatencyMs).toBe(1000);
  });

  test("registra checkpoints y conflictos", () => {
    const collector = new SessionMetricsCollector("session-1");
    collector.recordCheckpointPublished();
    collector.recordCheckpointPublished();
    collector.recordCheckpointDownloaded(true);
    collector.recordCheckpointDownloaded(false);
    collector.recordConflict();
    collector.recordConflictResolved();

    const snap = collector.getSnapshot();
    expect(snap.metrics.checkpointsPublished).toBe(2);
    expect(snap.metrics.checkpointsDownloaded).toBe(2);
    expect(snap.metrics.checkpointIntegrityFailures).toBe(1);
    expect(snap.metrics.conflictsDetected).toBe(1);
    expect(snap.metrics.conflictsResolved).toBe(1);
  });

  test("resetea contadores selectivos", () => {
    const collector = new SessionMetricsCollector("session-1");
    collector.recordReconnectAttempt(1000);
    collector.recordReconnectFailure();
    collector.recordDeltaSubmitted();
    collector.recordError();

    collector.reset();
    const snap = collector.getSnapshot();

    expect(snap.metrics.reconnectAttempts).toBe(0);
    expect(snap.metrics.reconnectFailures).toBe(0);
    expect(snap.metrics.deltasSubmitted).toBe(1);
    expect(snap.metrics.errors).toBe(1);
  });

  test("formatMetricsForHumans produce salida legible", () => {
    const collector = new SessionMetricsCollector("session-1234567890");
    collector.recordReconnectAttempt(2000);
    collector.recordReconnectSuccess();
    collector.recordBridgePoll(150, true);
    collector.recordCheckpointPublished();

    const output = formatMetricsForHumans(collector.getSnapshot());
    expect(output).toContain("Conectividad:");
    expect(output).toContain("Bridge IPC:");
    expect(output).toContain("Checkpoints:");
    expect(output).toContain("Delay promedio: 2000ms");
  });
});
