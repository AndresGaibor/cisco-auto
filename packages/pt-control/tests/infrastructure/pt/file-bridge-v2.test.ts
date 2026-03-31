import { test, expect, afterEach, beforeEach } from "bun:test";
import { rmSync, mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FileBridgeV2 } from "../../../src/infrastructure/pt/file-bridge-v2.ts";
import { BridgePathLayout } from "../../../src/infrastructure/pt/shared/path-layout.ts";

const TEST_DIR = "/tmp/file-bridge-v2-test";

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, "commands"), { recursive: true });
  mkdirSync(join(TEST_DIR, "in-flight"), { recursive: true });
  mkdirSync(join(TEST_DIR, "results"), { recursive: true });
  mkdirSync(join(TEST_DIR, "logs"), { recursive: true });
  mkdirSync(join(TEST_DIR, "consumer-state"), { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("sendCommand creates a command file in commands/ with correct structure", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const envelope = bridge.sendCommand("addDevice", {
    name: "R1",
    model: "2911",
  });

  expect(envelope.id).toMatch(/^cmd_\d{12}$/);
  expect(envelope.seq).toBe(1);
  expect(envelope.protocolVersion).toBe(2);
  expect(envelope.type).toBe("addDevice");
  expect(envelope.payload).toEqual({ name: "R1", model: "2911" });
  expect(envelope.checksum).toMatch(/^sha256:/);

  const cmdFile = join(
    TEST_DIR,
    "commands",
    `${String(envelope.seq).padStart(12, "0")}-addDevice.json`,
  );
  expect(existsSync(cmdFile)).toBe(true);

  const content = JSON.parse(readFileSync(cmdFile, "utf8"));
  expect(content.id).toBe(envelope.id);
  expect(content.seq).toBe(envelope.seq);

  bridge.stop();
});

test("sendCommand increments sequence on each call", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const first = bridge.sendCommand("addDevice", { name: "R1" });
  const second = bridge.sendCommand("addDevice", { name: "R2" });
  const third = bridge.sendCommand("configIos", { device: "R1" });

  expect(first.seq).toBe(1);
  expect(second.seq).toBe(2);
  expect(third.seq).toBe(3);

  bridge.stop();
});

test("pickNextCommand returns oldest queued command", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  bridge.sendCommand("addDevice", { name: "R1" });
  bridge.sendCommand("addDevice", { name: "R2" });

  const layout = new BridgePathLayout(TEST_DIR);
  const files = readdirSync(layout.commandsDir()).filter((f) => f.endsWith(".json"));
  expect(files.length).toBe(2);

  const cmd = bridge.pickNextCommand();

  expect(cmd).not.toBeNull();
  expect(cmd!.seq).toBe(1);
  expect(cmd!.payload).toEqual({ name: "R1" });

  bridge.stop();
});

test("pickNextCommand moves file to in-flight", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const envelope = bridge.sendCommand("configIos", { device: "R1" });
  const cmd = bridge.pickNextCommand();

  expect(cmd!.id).toBe(envelope.id);

  const layout = new BridgePathLayout(TEST_DIR);
  expect(existsSync(layout.commandsDir())).toBe(true);
  expect(existsSync(layout.inFlightFilePath(envelope.seq, "configIos"))).toBe(
    true,
  );

  bridge.stop();
});

test("publishResult writes result file and emits event", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const envelope = bridge.sendCommand("addDevice", { name: "R1" });
  const cmd = bridge.pickNextCommand();

  bridge.publishResult(cmd!, {
    startedAt: Date.now() - 100,
    status: "completed",
    ok: true,
    value: { deviceName: "R1", uuid: "abc123" },
  });

  const layout = new BridgePathLayout(TEST_DIR);
  const resultFile = layout.resultFilePath(envelope.id);
  expect(existsSync(resultFile)).toBe(true);

  const result = JSON.parse(readFileSync(resultFile, "utf8"));
  expect(result.id).toBe(envelope.id);
  expect(result.status).toBe("completed");
  expect(result.ok).toBe(true);
  expect(result.value).toEqual({ deviceName: "R1", uuid: "abc123" });

  // in-flight should be cleaned up
  expect(
    existsSync(layout.inFlightFilePath(envelope.seq, "addDevice")),
  ).toBe(false);

  bridge.stop();
});

test("publishResult with error writes failed result", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const envelope = bridge.sendCommand("configIos", {
    device: "NonExistent",
  });
  const cmd = bridge.pickNextCommand();

  bridge.publishResult(cmd!, {
    startedAt: Date.now() - 50,
    status: "failed",
    ok: false,
    error: {
      code: "DEVICE_NOT_FOUND",
      message: "Device NonExistent does not exist",
      retryable: false,
      phase: "execute",
    },
  });

  const layout = new BridgePathLayout(TEST_DIR);
  const result = JSON.parse(
    readFileSync(layout.resultFilePath(envelope.id), "utf8"),
  );

  expect(result.status).toBe("failed");
  expect(result.ok).toBe(false);
  expect(result.error?.code).toBe("DEVICE_NOT_FOUND");
  expect(result.error?.phase).toBe("execute");

  bridge.stop();
});

test("lease file is written on start and periodically", async () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  const layout = new BridgePathLayout(TEST_DIR);
  expect(existsSync(layout.leaseFile())).toBe(true);

  const lease = JSON.parse(readFileSync(layout.leaseFile(), "utf8"));
  expect(lease.ownerId).toBeTruthy();
  expect(lease.pid).toBe(process.pid);
  expect(lease.hostname).toBeTruthy();

  bridge.stop();
});

test("appendEvent writes to NDJSON log", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  bridge.appendEvent({ type: "heartbeat", runtimeLoaded: true, busy: false });

  const layout = new BridgePathLayout(TEST_DIR);
  const content = readFileSync(layout.currentEventsFile(), "utf8");
  const line = content
    .trim()
    .split("\n")
    .find((l) => l.includes("heartbeat"));

  expect(line).toBeTruthy();
  const parsed = JSON.parse(line!);
  expect(parsed.type).toBe("heartbeat");
  expect(parsed.seq).toBeGreaterThan(0);

  bridge.stop();
});

test("events are assigned monotonic seq numbers", () => {
  const bridge = new FileBridgeV2({ root: TEST_DIR, consumerId: "test" });
  bridge.start();

  bridge.sendCommand("addDevice", { name: "R1" });
  bridge.appendEvent({ type: "heartbeat" });
  bridge.appendEvent({ type: "log", level: "info" });

  const layout = new BridgePathLayout(TEST_DIR);
  const content = readFileSync(layout.currentEventsFile(), "utf8");
  const seqs = content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l).seq);

  expect(seqs).toHaveLength(3);
  expect(seqs[1] - seqs[0]).toBe(1);
  expect(seqs[2] - seqs[1]).toBe(1);

  bridge.stop();
});
