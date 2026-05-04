import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { ResultPathResolver } from "./shared/result-path-resolver.js";
import { ResultSubscriptionRegistry } from "./shared/result-subscription-registry.js";
import { ResultPollingFallback } from "./shared/result-polling-fallback.js";
import { isFsSidecarFile } from "./shared/bridge-file-classifier.js";

function makeTestRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("ResultPathResolver", () => {
  let root: string;
  let resolver: ResultPathResolver;

  beforeEach(() => {
    root = makeTestRoot("path-resolver-test-");
    mkdirSync(join(root, "results"), { recursive: true });
    resolver = new ResultPathResolver(join(root, "results"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("resolve returns correct path", () => {
    expect(resolver.resolve("cmd_001")).toBe(join(root, "results", "cmd_001.json"));
  });

  test("extractCommandId returns id without extension", () => {
    expect(resolver.extractCommandId("cmd_001.json")).toBe("cmd_001");
  });

  test("extractCommandId returns null for sidecars", () => {
    expect(resolver.extractCommandId(".sidecar.json")).toBeNull();
    expect(resolver.extractCommandId("cmd_001.tmp")).toBeNull();
    expect(resolver.extractCommandId("cmd_001.meta.json")).toBeNull();
    expect(resolver.extractCommandId("cmd_001.error.json")).toBeNull();
  });

  test("filterResultsForCommands only returns matching commandIds", () => {
    const files = ["cmd_001.json", "cmd_002.json", "cmd_003.json", ".hidden.json", "result.tmp"];
    const subscribed = new Set(["cmd_001", "cmd_003"]);

    const filtered = resolver.filterResultsForCommands(files, subscribed);

    expect(filtered).toEqual(["cmd_001.json", "cmd_003.json"]);
  });

  test("filterResultsForCommands ignores sidecars", () => {
    const files = ["cmd_001.json", ".hidden.json", "cmd_002.tmp", "cmd_003.meta.json"];
    const subscribed = new Set(["cmd_001", "cmd_002", "cmd_003"]);

    const filtered = resolver.filterResultsForCommands(files, subscribed);

    expect(filtered).toEqual(["cmd_001.json"]);
  });
});

describe("ResultSubscriptionRegistry", () => {
  let registry: ResultSubscriptionRegistry;

  beforeEach(() => {
    registry = new ResultSubscriptionRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  test("watch increments refCount", () => {
    registry.watch("cmd_001", () => {});
    expect(registry.getListenerCount()).toBe(1);
  });

  test("watch same callback twice is idempotent", () => {
    const cb = () => {};
    registry.watch("cmd_001", cb);
    registry.watch("cmd_001", cb);
    expect(registry.getListenerCount()).toBe(1);
  });

  test("unwatch decrements refCount", () => {
    const cb = () => {};
    registry.watch("cmd_001", cb);
    registry.unwatch("cmd_001", cb);
    expect(registry.getListenerCount()).toBe(0);
  });

  test("unwatch removes empty commandId entries", () => {
    const cb = () => {};
    registry.watch("cmd_001", cb);
    registry.unwatch("cmd_001", cb);
    expect(registry.getCommandCount()).toBe(0);
  });

  test("notify calls all callbacks for commandId", () => {
    let count = 0;
    const cb1 = () => count++;
    const cb2 = () => count++;

    registry.watch("cmd_001", cb1);
    registry.watch("cmd_001", cb2);
    registry.notify("cmd_001");

    expect(count).toBe(2);
  });

  test("notify does nothing for unknown commandId", () => {
    let called = false;
    registry.watch("cmd_001", () => { called = true; });
    registry.notify("cmd_002");
    expect(called).toBe(false);
  });

  test("getRegisteredCommandIds returns all registered ids", () => {
    registry.watch("cmd_001", () => {});
    registry.watch("cmd_002", () => {});

    const ids = registry.getRegisteredCommandIds();
    expect(ids.has("cmd_001")).toBe(true);
    expect(ids.has("cmd_002")).toBe(true);
  });

  test("clear resets everything", () => {
    registry.watch("cmd_001", () => {});
    registry.watch("cmd_002", () => {});
    registry.clear();

    expect(registry.getListenerCount()).toBe(0);
    expect(registry.getCommandCount()).toBe(0);
  });
});

describe("ResultPollingFallback", () => {
  let root: string;
  let resolver: ResultPathResolver;
  let polling: ResultPollingFallback;
  let notifiedCommandIds: string[];

  beforeEach(() => {
    root = makeTestRoot("polling-test-");
    mkdirSync(join(root, "results"), { recursive: true });
    resolver = new ResultPathResolver(join(root, "results"));
    notifiedCommandIds = [];
  });

  afterEach(() => {
    polling?.stop();
    rmSync(root, { recursive: true, force: true });
  });

  test("polls only subscribed commandIds", async () => {
    const subscribed = new Set(["cmd_001", "cmd_002"]);
    polling = new ResultPollingFallback(resolver, subscribed, (id) => {
      notifiedCommandIds.push(id);
    });

    writeFileSync(join(root, "results", "cmd_001.json"), "{}");
    writeFileSync(join(root, "results", "cmd_003.json"), "{}");

    polling.poll();

    expect(notifiedCommandIds).toEqual(["cmd_001"]);
  });

  test("marks seen files to avoid duplicates", async () => {
    const subscribed = new Set(["cmd_001"]);
    polling = new ResultPollingFallback(resolver, subscribed, (id) => {
      notifiedCommandIds.push(id);
    });

    writeFileSync(join(root, "results", "cmd_001.json"), "{}");

    polling.poll();
    polling.poll();

    expect(notifiedCommandIds).toEqual(["cmd_001"]);
  });

  test("hasSeen returns true after markSeen", () => {
    const subscribed = new Set(["cmd_001"]);
    polling = new ResultPollingFallback(resolver, subscribed, () => {});

    const path = join(root, "results", "cmd_001.json");
    polling.markSeen(path);

    expect(polling.hasSeen(path)).toBe(true);
  });

  test("resetSeen clears all seen files", () => {
    const subscribed = new Set(["cmd_001"]);
    polling = new ResultPollingFallback(resolver, subscribed, () => {});

    const path = join(root, "results", "cmd_001.json");
    polling.markSeen(path);
    polling.resetSeen();

    expect(polling.hasSeen(path)).toBe(false);
  });
});

describe("SharedResultWatcher", () => {
  let tempDir: string;
  let resultsDir: string;
  let watcher: SharedResultWatcher;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "watcher-test-"));
    resultsDir = join(tempDir, "results");
    mkdirSync(resultsDir, { recursive: true });
    watcher = new SharedResultWatcher(resultsDir);
  });

  afterEach(() => {
    watcher.destroy();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("no escanea todos los results si conoce commandId", async () => {
    watcher.watch("cmd_001", () => {});

    for (let i = 0; i < 100; i++) {
      writeFileSync(join(resultsDir, `cmd_${String(i).padStart(3, "0")}.json`), "{}");
    }

    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    let called = false;
    watcher.watch("cmd_001", () => { called = true; });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(called).toBe(true);
  });

  test("ignora sidecars", async () => {
    const sidecarFiles = [
      ".hidden.json",
      "cmd_001.tmp",
      "cmd_001.meta.json",
      "cmd_001.error.json",
      "cmd_001.json.tmp",
    ];

    for (const file of sidecarFiles) {
      writeFileSync(join(resultsDir, file), "{}");
    }

    let called = false;
    watcher.watch("cmd_001", () => { called = true; });

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(called).toBe(false);
  });

  test("no duplica callback si fs.watch y polling ven el mismo resultado", async () => {
    let calls = 0;
    watcher.watch("cmd_001", () => { calls++; });

    await new Promise((resolve) => setTimeout(resolve, 50));

    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    await new Promise((resolve) => setTimeout(resolve, 300));

    watcher.destroy();
    expect(calls).toBe(1);
  });

  test("soporta múltiples listeners del mismo commandId", async () => {
    let count = 0;
    watcher.watch("cmd_001", () => count++);
    watcher.watch("cmd_001", () => count++);
    watcher.watch("cmd_001", () => count++);

    await new Promise((resolve) => setTimeout(resolve, 50));

    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(count).toBe(3);
  });

  test("destroy limpia intervalos y watchers", () => {
    watcher.watch("cmd_001", () => {});
    watcher.watch("cmd_002", () => {});

    const statsBefore = watcher.getStats();
    expect(statsBefore.watching).toBe(true);

    watcher.destroy();

    const statsAfter = watcher.getStats();
    expect(statsAfter.watching).toBe(false);
    expect(statsAfter.listenersCount).toBe(0);
    expect(statsAfter.commandsWatched).toBe(0);
  });

  test("no llama callback para commandId no registrado", async () => {
    writeFileSync(join(resultsDir, "cmd_999.json"), JSON.stringify({ ok: true }));

    let called = false;
    watcher.watch("cmd_001", () => { called = true; });

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(called).toBe(false);
  });

  test("polling fallback observa commandIds agregados después de iniciar el watcher", async () => {
    vi.useFakeTimers();

    const watcher = new SharedResultWatcher(resultsDir);

    const first = vi.fn();
    const second = vi.fn();

    watcher.watch("cmd_000000000001", first);
    watcher.watch("cmd_000000000002", second);

    writeFileSync(
      join(resultsDir, "cmd_000000000002.json"),
      JSON.stringify({
        protocolVersion: 2,
        id: "cmd_000000000002",
        seq: 2,
        status: "completed",
        ok: true,
        completedAt: Date.now(),
        value: { ok: true },
      }),
    );

    vi.advanceTimersByTime(150);
    await Promise.resolve();

    expect(second).toHaveBeenCalled();

    watcher.destroy();
    vi.useRealTimers();
  });
});

describe("isFsSidecarFile", () => {
  test("detects hidden files", () => {
    expect(isFsSidecarFile(".hidden")).toBe(true);
    expect(isFsSidecarFile(".gitkeep")).toBe(true);
  });

  test("detects tmp files", () => {
    expect(isFsSidecarFile("file.tmp")).toBe(true);
    expect(isFsSidecarFile("file.json.tmp")).toBe(true);
  });

  test("detects meta and error sidecars", () => {
    expect(isFsSidecarFile("file.meta.json")).toBe(true);
    expect(isFsSidecarFile("file.error.json")).toBe(true);
  });

  test("allows normal result files", () => {
    expect(isFsSidecarFile("cmd_001.json")).toBe(false);
    expect(isFsSidecarFile("result-123.json")).toBe(false);
  });
});