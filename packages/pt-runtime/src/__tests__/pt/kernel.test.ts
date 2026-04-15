// packages/pt-runtime/src/__tests__/pt/kernel.test.ts
import { describe, test, expect, beforeEach, vi } from "bun:test";

const mockFm = {
  fileExists: vi.fn().mockReturnValue(false),
  getFileContents: vi.fn().mockReturnValue(""),
  writePlainTextToFile: vi.fn(),
  makeDirectory: vi.fn(),
  directoryExists: vi.fn().mockReturnValue(false),
  getFilesInDirectory: vi.fn().mockReturnValue([]),
  removeFile: vi.fn(),
  moveSrcFileToDestFile: vi.fn(),
  getFileModificationTime: vi.fn().mockReturnValue(Date.now()),
};

const mockDprint = vi.fn();
const mockIpc = {
  appWindow: vi.fn().mockReturnValue({ listDirectory: vi.fn().mockReturnValue([]) }),
};

(globalThis as typeof globalThis & { fm: typeof mockFm; dprint: typeof mockDprint }).fm = mockFm;
(globalThis as typeof globalThis & { fm: typeof mockFm; dprint: typeof mockDprint }).dprint = mockDprint;
(globalThis as typeof globalThis & { ipc: typeof mockIpc }).ipc = mockIpc;

import { createLeaseManager } from "../../pt/kernel/lease";
import { createDirectoryManager } from "../../pt/kernel/directories";
import { createCommandQueue } from "../../pt/kernel/command-queue";

describe("createLeaseManager", () => {
  beforeEach(() => {
    mockFm.fileExists.mockReturnValue(false);
    mockFm.getFileContents.mockReturnValue("");
    mockDprint.mockClear();
  });

  test("validate returns false when no lease file", () => {
    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(false);
  });

  test("validate returns false when lease expired", () => {
    mockFm.fileExists.mockReturnValue(true);
    mockFm.getFileContents.mockReturnValue(JSON.stringify({
      ownerId: "test-owner",
      expiresAt: Date.now() - 1000,
      ttlMs: 5000,
      updatedAt: Date.now(),
    }));

    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(false);
  });

  test("validate returns true when lease valid", () => {
    mockFm.fileExists.mockReturnValue(true);
    mockFm.getFileContents.mockReturnValue(JSON.stringify({
      ownerId: "test-owner",
      expiresAt: Date.now() + 60000,
      ttlMs: 5000,
      updatedAt: Date.now(),
    }));

    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(true);
  });
});

describe("createDirectoryManager", () => {
  beforeEach(() => {
    mockFm.directoryExists.mockReturnValue(false);
    mockFm.makeDirectory.mockClear();
    mockDprint.mockClear();
  });

  test("creates manager with correct directories", () => {
    const manager = createDirectoryManager({
      devDir: "/tmp/pt-dev",
      commandsDir: "/tmp/pt-dev/commands",
      inFlightDir: "/tmp/pt-dev/in-flight",
      resultsDir: "/tmp/pt-dev/results",
      deadLetterDir: "/tmp/pt-dev/dead-letter",
      logsDir: "/tmp/pt-dev/logs",
      commandsTraceDir: "/tmp/pt-dev/logs/commands",
    });

    expect(manager.directories.devDir).toBe("/tmp/pt-dev");
    expect(manager.directories.commandsDir).toBe("/tmp/pt-dev/commands");
  });
});

describe("createCommandQueue", () => {
  beforeEach(() => {
    mockFm.getFilesInDirectory.mockReturnValue([]);
    mockFm.fileExists.mockReturnValue(false);
    mockFm.getFileContents.mockReturnValue("");
    mockFm.moveSrcFileToDestFile.mockClear();
    mockFm.removeFile.mockClear();
    mockDprint.mockClear();
    mockIpc.appWindow.mockReturnValue({ listDirectory: vi.fn().mockReturnValue([]) });
  });

  test("poll returns null when no files", () => {
    const queue = createCommandQueue({
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      deadLetterDir: "/tmp/dead-letter",
    });

    expect(queue.poll()).toBeNull();
  });

  test("count returns 0 when no files", () => {
    const queue = createCommandQueue({
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      deadLetterDir: "/tmp/dead-letter",
    });

    expect(queue.count()).toBe(0);
  });

  test("poll uses appWindow listDirectory fallback when fm returns no files", () => {
    mockFm.getFilesInDirectory.mockReturnValue([]);
    mockIpc.appWindow.mockReturnValue({
      listDirectory: vi.fn().mockReturnValue(["000000000001-listDevices.json"]),
    });
    mockFm.fileExists.mockImplementation((p: string) => p.includes("commands") && !p.includes("in-flight"));
    mockFm.getFileContents.mockReturnValue(JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "listDevices",
      payload: { type: "listDevices" },
    }));

    const queue = createCommandQueue({
      commandsDir: "/tmp/commands",
      inFlightDir: "/tmp/in-flight",
      deadLetterDir: "/tmp/dead-letter",
    });

    const claimed = queue.poll();

    expect(claimed?.id).toBe("cmd_000000000001");
    expect(mockDprint).toHaveBeenCalledWith("[queue] Using appWindow.listDirectory fallback for commands");
  });
});
