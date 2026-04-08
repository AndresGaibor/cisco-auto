/**
 * Command Processor Tests - Fase 8 Deduplication & Race Conditions
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { CommandProcessor } from "../src/v2/command-processor";
import { BridgePathLayout } from "../src/shared/path-layout";
import { SequenceStore } from "../src/shared/sequence-store";
import { EventLogWriter } from "../src/event-log-writer";
import { BRIDGE_PROTOCOL_VERSION } from "@cisco-auto/types";

const TEMP_DIR = "/tmp/cisco-auto-cmdproc-tests";
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

describe("CommandProcessor - Fase 8 Deduplication", () => {
  it("Test 1: Should pick next command from queue", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create a command file
    const cmd = {
      id: "cmd_000000000001",
      seq: 1,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      checksum: "sha256:abc123",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    const cmdFile = join(paths.commandsDir(), "000000000001-test-command.json");
    writeFileSync(cmdFile, JSON.stringify(cmd));

    const picked = processor.pickNextCommand();
    expect(picked).toBeTruthy();
    expect(picked?.id).toBe("cmd_000000000001");
    expect(picked?.type).toBe("test-command");
  });

  it("Test 2: Should move command to in-flight atomically", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const cmd = {
      id: "cmd_000000000002",
      seq: 2,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      checksum: "sha256:xyz789",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    const cmdFile = join(paths.commandsDir(), "000000000002-test-command.json");
    writeFileSync(cmdFile, JSON.stringify(cmd));

    processor.pickNextCommand();

    // Command file should be moved to in-flight
    expect(existsSync(cmdFile)).toBe(false);
    expect(existsSync(join(paths.inFlightDir(), "000000000002-test-command.json"))).toBe(true);
  });

  it("Test 3: Should skip duplicate commands (result already exists)", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const cmd = {
      id: "cmd_000000000003",
      seq: 3,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      checksum: "sha256:def456",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    const cmdFile = join(paths.commandsDir(), "000000000003-test-command.json");
    writeFileSync(cmdFile, JSON.stringify(cmd));

    // Create result file first
    const resultFile = join(paths.resultsDir(), "cmd_000000000003.json");
    mkdirSync(paths.resultsDir(), { recursive: true });
    writeFileSync(resultFile, JSON.stringify({ ok: true }));

    const picked = processor.pickNextCommand();
    expect(picked).toBeNull();

    // Command file should be deleted (duplicate)
    expect(existsSync(cmdFile)).toBe(false);
  });

  it("Test 4: Should handle expired commands", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const now = Date.now();
    const cmd = {
      id: "cmd_000000000004",
      seq: 4,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      checksum: "sha256:ghi789",
      expiresAt: now - 1000, // Expired 1 second ago
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    const cmdFile = join(paths.commandsDir(), "000000000004-test-command.json");
    writeFileSync(cmdFile, JSON.stringify(cmd));

    const picked = processor.pickNextCommand();
    expect(picked).toBeNull();

    // Result should be written (timeout status)
    const resultFile = join(paths.resultsDir(), "cmd_000000000004.json");
    expect(existsSync(resultFile)).toBe(true);
  });

  it("Test 5: Should verify checksum before returning command", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const cmd = {
      id: "cmd_000000000005",
      seq: 5,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      checksum: "sha256:wrongchecksum",
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    const cmdFile = join(paths.commandsDir(), "000000000005-test-command.json");
    writeFileSync(cmdFile, JSON.stringify(cmd));

    const picked = processor.pickNextCommand();
    expect(picked).toBeNull();

    // Result should be written (checksum error)
    const resultFile = join(paths.resultsDir(), "cmd_000000000005.json");
    expect(existsSync(resultFile)).toBe(true);
  });

  it("Test 6: Should publish result atomically", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.inFlightDir(), { recursive: true });
    mkdirSync(paths.resultsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const cmd = {
      id: "cmd_000000000006",
      seq: 6,
      type: "test-command",
      attempt: 1,
      payload: { test: true },
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      createdAt: Date.now(),
    };

    processor.publishResult(cmd, {
      startedAt: Date.now(),
      status: "completed",
      ok: true,
      value: { result: "success" },
    });

    const resultFile = join(paths.resultsDir(), "cmd_000000000006.json");
    expect(existsSync(resultFile)).toBe(true);

    const result = JSON.parse(require("fs").readFileSync(resultFile, "utf8"));
    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
  });

  it("Test 7: Should handle malformed command files", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.deadLetterDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    // Create malformed file (bad filename)
    const badFile = join(paths.commandsDir(), "not-a-command.json");
    writeFileSync(badFile, JSON.stringify({ invalid: true }));

    const picked = processor.pickNextCommand();
    expect(picked).toBeNull();

    // Bad file should be moved to dead-letter
    expect(existsSync(badFile)).toBe(false);
    const dlDir = readdirSync(paths.deadLetterDir());
    expect(dlDir.length).toBeGreaterThan(0);
  });

  it("Test 8: Should handle empty queue gracefully", () => {
    const paths = new BridgePathLayout(TEST_DEV_DIR);
    const seq = new SequenceStore(TEST_DEV_DIR);
    const eventWriter = new EventLogWriter(paths);
    const processor = new CommandProcessor(paths, eventWriter, seq);

    mkdirSync(paths.commandsDir(), { recursive: true });
    mkdirSync(paths.logsDir(), { recursive: true });

    const picked = processor.pickNextCommand();
    expect(picked).toBeNull();
  });
});
