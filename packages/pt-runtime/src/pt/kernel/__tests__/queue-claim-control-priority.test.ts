import { afterEach, describe, expect, test, vi } from "bun:test";

import { createQueueClaim } from "../queue-claim";

afterEach(() => {
  delete (globalThis as any).fm;
  vi.restoreAllMocks();
});

describe("queue-claim control priority", () => {
  test("pollAllowedTypes prioriza candidatos permitidos por filename antes de leer normales", () => {
    const files = new Map<string, string>();

    const commandsDir = "/tmp/commands";
    const inFlightDir = "/tmp/in-flight";

    const normalFilename = "000000000001-terminal.plan.run.json";
    const controlFilename = "000000000002-__pollDeferred.json";

    const normalPath = `${commandsDir}/${normalFilename}`;
    const controlPath = `${commandsDir}/${controlFilename}`;
    const controlInFlightPath = `${inFlightDir}/${controlFilename}`;

    files.set(
      normalPath,
      JSON.stringify({
        id: "cmd-normal",
        seq: 1,
        type: "terminal.plan.run",
        payload: { type: "terminal.plan.run" },
      }),
    );

    files.set(
      controlPath,
      JSON.stringify({
        id: "cmd-control",
        seq: 2,
        type: "__pollDeferred",
        payload: { type: "__pollDeferred", ticket: "job-1" },
      }),
    );

    const readOrder: string[] = [];

    (globalThis as any).fm = {
      fileExists: vi.fn((path: string) => files.has(path)),
      getFileContents: vi.fn((path: string) => {
        readOrder.push(path);
        return files.get(path) ?? "";
      }),
      moveSrcFileToDestFile: vi.fn((src: string, dst: string) => {
        const content = files.get(src);
        if (!content) throw new Error(`missing ${src}`);
        files.delete(src);
        files.set(dst, content);
      }),
    };

    const queueDiscovery = {
      scan: vi.fn(() => [normalFilename, controlFilename]),
    };

    const queueIndex = {
      read: vi.fn(() => []),
      remove: vi.fn(),
      add: vi.fn(),
      rebuildFromFiles: vi.fn(),
    };

    const deadLetter = {
      move: vi.fn(),
    };

    const claim = createQueueClaim(
      commandsDir,
      inFlightDir,
      queueIndex as never,
      queueDiscovery as never,
      deadLetter as never,
    );

    const result = claim.pollAllowedTypes(["__pollDeferred"]);

    expect(result?.id).toBe("cmd-control");
    expect(result?.type).toBe("__pollDeferred");
    expect(files.has(controlInFlightPath)).toBe(true);

    expect(readOrder[0]).toBe(controlPath);
    expect(readOrder).not.toContain(normalPath);
  });
});
