import { describe, expect, test } from "bun:test";
import { pollCommandQueue } from "../../../pt/kernel/queue-poller";

// Mock para Date.now
let mockNow = 1000;
const _originalNow = Date.now;

function setupDateMock() {
  mockNow = 1000;
  Date.now = () => mockNow;
}

function advanceTime(ms: number) {
  mockNow += ms;
}

// Helpers para trackear llamadas
function createCallTracker() {
  const calls: any[] = [];
  const fn = (...args: any[]) => {
    calls.push({ args });
    return null;
  };
  return { fn, calls };
}

function createBaseSubsystems() {
  const pollTracker = createCallTracker();
  const pollAllowedTracker = createCallTracker();

  return {
    queue: {
      poll: pollTracker.fn,
      pollAllowedTypes: pollAllowedTracker.fn,
      count: () => 1,
    },
    runtimeLoader: {
      reloadIfNeeded: () => {},
      getRuntimeFn: () => null,
    },
    executionEngine: {
      getActiveJobs: () => [],
      reapStaleJobs: () => {},
    },
    terminal: {
      isAnyBusy: () => true,
    },
    heartbeat: {
      setQueuedCount: () => {},
      setActiveCommand: () => {},
    },
    config: {
      resultsDir: "/tmp/results",
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      deadLetterDir: "/tmp/dead-letter",
      logsDir: "/tmp/logs",
      commandsTraceDir: "/tmp/trace",
    },
    kernelLog: () => {},
    kernelLogSubsystem: (...args: any[]) => {},
    _pollTracker: pollTracker,
    _pollAllowedTracker: pollAllowedTracker,
  } as any;
}

function createState() {
  return {
    isRunning: true,
    isShuttingDown: false,
    activeCommand: null,
    activeCommandFilename: null,
  } as any;
}

describe("queue-poller stale terminalBusy handling", () => {
  test("durante grace usa pollAllowedTypes si terminalBusy=true", () => {
    setupDateMock();
    const subsystems = createBaseSubsystems();
    const state = createState();

    pollCommandQueue(subsystems, state);

    expect(subsystems._pollAllowedTracker.calls.length).toBeGreaterThan(0);
    expect(subsystems._pollTracker.calls.length).toBe(0);
  });

  test("si terminalBusy queda stale y no hay activeJobs, permite poll normal", () => {
    setupDateMock();
    const subsystems = createBaseSubsystems();
    const state = createState();

    // Primer poll - debe usar pollAllowedTypes
    pollCommandQueue(subsystems, state);
    const firstPollAllowedCount = subsystems._pollAllowedTracker.calls.length;
    expect(firstPollAllowedCount).toBeGreaterThan(0);

    // Avanzar tiempo más allá del grace period (1500ms)
    advanceTime(3000);

    // Crear nuevos trackers para el segundo poll
    const pollTracker2 = createCallTracker();
    subsystems.queue.poll = pollTracker2.fn;
    subsystems._pollTracker2 = pollTracker2;

    // Mock kernelLogSubsystem para capturar mensajes
    const logMessages: string[] = [];
    subsystems.kernelLogSubsystem = (name: string, msg: string) => {
      logMessages.push(msg);
    };

    pollCommandQueue(subsystems, state);

    // Verificar que se llamó a poll (no pollAllowedTypes)
    expect(subsystems._pollTracker2.calls.length).toBeGreaterThan(0);
    // Verificar que se registró el mensaje de stale ignored
    const hasStaleMessage = logMessages.some(m => m.includes("terminalBusy stale ignored"));
    expect(hasStaleMessage).toBe(true);
  });

  test("si hay activeJobs, no ignora busy aunque pase el grace", () => {
    setupDateMock();
    const subsystems = createBaseSubsystems();
    const state = createState();

    // Forzar que hay active jobs
    subsystems.executionEngine.getActiveJobs = () => [{ id: "job-1" }];

    pollCommandQueue(subsystems, state);
    const firstPollAllowedCount = subsystems._pollAllowedTracker.calls.length;
    expect(firstPollAllowedCount).toBeGreaterThan(0);

    // Avanzar tiempo
    advanceTime(5000);

    // Crear nuevos trackers para el segundo poll
    const pollAllowedTracker2 = createCallTracker();
    subsystems.queue.pollAllowedTypes = pollAllowedTracker2.fn;
    subsystems._pollAllowedTracker2 = pollAllowedTracker2;

    pollCommandQueue(subsystems, state);

    expect(subsystems._pollAllowedTracker2.calls.length).toBeGreaterThan(0);
    expect(subsystems._pollTracker.calls.length).toBe(0);
  });
});
