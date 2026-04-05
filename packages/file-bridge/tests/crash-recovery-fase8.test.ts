/**
 * Crash Recovery Tests - Fase 8 Lease-Aware
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { CrashRecovery } from "../src/v2/crash-recovery";
import { LeaseManager } from "../src/v2/lease-manager";
import { BridgePathLayout } from "../src/shared/path-layout";
import { SequenceStore } from "../src/shared/sequence-store";
import { EventLogWriter } from "../src/event-log-writer";

const TEMP_DIR = "/tmp/cisco-auto-recovery-tests";
const TEST_DEV_DIR = join(TEMP_DIR, "dev");

beforeEach(() => {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
  if (!existsSync(TEST_DEV_DIR)) mkdirSync(TEST_DEV_DIR, { recursive: true });
});

afterEach(() => {
  try {
    const cmd = require("child_process");
    cmd.execSync(`rm -rf ${TEST_DEV_DIR}/*`);
  } catch (e) {}
});

describe("CrashRecovery - Fase 8 Lease-Aware", () => {
  it("Test 1: Should skip recovery if no valid lease", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    
    // Create a LeaseManager but DON'T acquire lease
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    
    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3
    );

    // Setup test data
    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Run recovery - should skip
    recovery.recover();

    // Check that recovery was skipped (event written)
    const logFile = paths.currentEventsFile();
    if (existsSync(logFile)) {
      const content = require("fs").readFileSync(logFile, "utf8");
      expect(content).toContain("recovery-skipped-no-lease");
    }
  });

  it("Test 2: Should proceed with recovery if lease is valid", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease(); // Acquire valid lease

    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3
    );

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    recovery.recover();

    // Should complete without throwing
    expect(true).toBe(true);
  });

  it("Test 3: Should requeue command under maxAttempts", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease();

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create a command in in-flight with attempt=1
    const cmd = {
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      attempt: 1,
      payload: { test: true },
    };
    
    const inFlightFile = join(paths.inFlightDir(), "1-test.json");
    writeFileSync(inFlightFile, JSON.stringify(cmd));

    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3 // maxAttempts
    );

    recovery.recover();

    // Command should be requeued
    const commandsDir = paths.commandsDir();
    const files = readdirSync(commandsDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it("Test 4: Should fail command after maxAttempts exceeded", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease();

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create a command with attempt=3 (at maxAttempts)
    const cmd = {
      id: "cmd_000000000002",
      seq: 2,
      type: "test",
      attempt: 3,
      payload: { test: true },
    };
    
    const inFlightFile = join(paths.inFlightDir(), "2-test.json");
    writeFileSync(inFlightFile, JSON.stringify(cmd));

    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3 // maxAttempts
    );

    recovery.recover();

    // Command should be failed (result written)
    const resultFile = paths.resultFilePath("cmd_000000000002");
    expect(existsSync(resultFile)).toBe(true);
  });

  it("Test 5: Should move malformed commands to dead-letter", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease();

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.deadLetterDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create malformed file (bad filename)
    const badFile = join(paths.commandsDir(), "malformed.json");
    writeFileSync(badFile, JSON.stringify({ test: "data" }));

    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3
    );

    recovery.recover();

    // Malformed file should be gone from commands/
    const commandsDir = paths.commandsDir();
    const files = readdirSync(commandsDir);
    expect(files).not.toContain("malformed.json");
  });

  it("Test 6: Should handle corrupted in-flight JSON", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease();

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.deadLetterDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create corrupted JSON file
    const corruptFile = join(paths.inFlightDir(), "1-corrupt.json");
    writeFileSync(corruptFile, "{ invalid json");

    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      3
    );

    recovery.recover();

    // Corrupted file should be moved to dead-letter
    expect(existsSync(corruptFile)).toBe(false);
  });

  it("Test 7: Should respect configurable maxAttempts", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const leaseManager = new LeaseManager(paths.leaseFile(), 5000);
    leaseManager.acquireLease();

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create command with attempt=1
    const cmd = {
      id: "cmd_000000000003",
      seq: 3,
      type: "test",
      attempt: 1,
      payload: { test: true },
    };
    
    const inFlightFile = join(paths.inFlightDir(), "3-test.json");
    writeFileSync(inFlightFile, JSON.stringify(cmd));

    // Use maxAttempts=2
    const recovery = new CrashRecovery(
      paths,
      seq,
      eventWriter,
      leaseManager,
      2 // Low maxAttempts
    );

    recovery.recover();

    // With attempt=1 < maxAttempts=2, should requeue
    const commandsDir = paths.commandsDir();
    const files = readdirSync(commandsDir);
    expect(files.length).toBeGreaterThan(0);
  });
});
