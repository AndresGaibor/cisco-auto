/**
 * Tests for SharedResultWatcher.
 * Verifies single watcher can handle multiple listeners.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SharedResultWatcher } from "../src/shared-result-watcher.js";

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

  test("starts watching when first listener registers", () => {
    const stats1 = watcher.getStats();
    expect(stats1.watching).toBe(false);

    let called = false;
    watcher.watch("cmd_001", () => {
      called = true;
    });

    const stats2 = watcher.getStats();
    expect(stats2.watching).toBe(true);
    expect(stats2.listenersCount).toBe(1);
    expect(stats2.commandsWatched).toBe(1);
  });

  test("notifies listener when file appears", async () => {
    let notified = false;
    
    watcher.watch("cmd_001", () => {
      notified = true;
    });

    // Wait a bit for watcher to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create the result file
    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    // Wait for notification
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(notified).toBe(true);
  });

  test("supports multiple listeners for same command", async () => {
    let count = 0;

    const callback1 = () => count++;
    const callback2 = () => count++;
    const callback3 = () => count++;

    watcher.watch("cmd_001", callback1);
    watcher.watch("cmd_001", callback2);
    watcher.watch("cmd_001", callback3);

    await new Promise((resolve) => setTimeout(resolve, 100));

    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(count).toBe(3);
  });

  test("supports listeners for different commands", async () => {
    let cmd1Called = false;
    let cmd2Called = false;

    watcher.watch("cmd_001", () => {
      cmd1Called = true;
    });
    watcher.watch("cmd_002", () => {
      cmd2Called = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create only cmd_001
    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(cmd1Called).toBe(true);
    expect(cmd2Called).toBe(false);
  });

  test("unregistering listener decreases count", () => {
    const callback = () => {};
    
    watcher.watch("cmd_001", callback);
    expect(watcher.getStats().listenersCount).toBe(1);

    watcher.unwatch("cmd_001", callback);
    expect(watcher.getStats().listenersCount).toBe(0);
  });

  test("stops watching when all listeners removed", () => {
    const callback1 = () => {};
    const callback2 = () => {};

    watcher.watch("cmd_001", callback1);
    watcher.watch("cmd_002", callback2);

    expect(watcher.getStats().watching).toBe(true);

    watcher.unwatch("cmd_001", callback1);
    expect(watcher.getStats().watching).toBe(true); // Still has cmd_002

    watcher.unwatch("cmd_002", callback2);
    expect(watcher.getStats().watching).toBe(false); // Now stopped
  });

  test("destroy cleans up all resources", () => {
    watcher.watch("cmd_001", () => {});
    watcher.watch("cmd_002", () => {});
    watcher.watch("cmd_003", () => {});

    expect(watcher.getStats().listenersCount).toBe(3);

    watcher.destroy();

    const stats = watcher.getStats();
    expect(stats.listenersCount).toBe(0);
    expect(stats.watching).toBe(false);
    expect(stats.commandsWatched).toBe(0);
  });

  test("handles callback errors gracefully", async () => {
    let errorEmitted = false;
    let goodCallbackRan = false;

    watcher.on("error", () => {
      errorEmitted = true;
    });

    watcher.watch("cmd_001", () => {
      throw new Error("Callback error");
    });
    watcher.watch("cmd_001", () => {
      goodCallbackRan = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    writeFileSync(join(resultsDir, "cmd_001.json"), JSON.stringify({ ok: true }));

    await new Promise((resolve) => setTimeout(resolve, 200));

    // Both conditions should be true despite the error
    expect(errorEmitted).toBe(true);
    expect(goodCallbackRan).toBe(true);
  });
});
