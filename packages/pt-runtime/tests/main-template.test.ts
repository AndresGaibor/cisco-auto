/**
 * Phase 2 Tests - main.js template validation
 * Verifies: durable queue only, no legacy, lifecycle, IOS state machine
 */

import { describe, it, expect, beforeEach, afterEach, test } from "bun:test";
import { MAIN_JS_TEMPLATE } from "../src/templates/main.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

describe("Phase 2 - Main.js Template", () => {
  describe("durable queue only (no legacy)", () => {
    it("uses commands/, in-flight/, results/, dead-letter/", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain('"/commands"');
      expect(code).toContain('"/in-flight"');
      expect(code).toContain('"/results"');
      expect(code).toContain('"/dead-letter"');
    });

    it("does NOT contain command.json references", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("COMMAND_FILE");
      expect(code).not.toContain("CURRENT_COMMAND_FILE");
      expect(code).not.toContain('migrateLegacyCommand');
      expect(code).not.toContain('/command.json"');
    });

    it("does NOT contain migrateLegacyCommand", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("migrateLegacyCommand");
    });

    it("contains IOS_JOBS system", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("IOS_JOBS");
      expect(code).toContain("createIosJob");
      expect(code).toContain("pollIosJob");
      expect(code).toContain("startIosJob");
    });
  });

  describe("cleanup of stale in-flight (not full recovery)", () => {
    it("has cleanupStaleInFlightOnStartup instead of recoverInFlightOnStartup", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("cleanupStaleInFlightOnStartup");
      expect(code).not.toContain("recoverInFlightOnStartup");
    });

    it("cleanupStaleInFlightOnStartup does NOT requeue or increment attempts", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("requeue");
      expect(code).not.toMatch(/MAX_RETRIES.*recovered/);
    });
  });

  describe("lifecycle guards", () => {
    it("activateRuntimeAfterLease has idempotency guard", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("Runtime already active");
    });

    it("cleanUp clears leaseHealthInterval", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("clear-lease-health");
      expect(code).toContain("leaseHealthInterval");
    });

    it("cleanUp does NOT call invokeRuntimeCleanupHook", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("invokeRuntimeCleanupHook()");
    });

    it("cleanUp saves pending before clearing", () => {
      const code = MAIN_JS_TEMPLATE;
      const cleanUpStart = code.indexOf("function cleanUp()");
      const cleanUpEnd = code.indexOf('dprint("[PT] Stopped")', cleanUpStart);
      const cleanUpSection = code.slice(cleanUpStart, cleanUpEnd);
      const saveIdx = cleanUpSection.indexOf("savePendingCommands");
      const nullRuntimeIdx = cleanUpSection.indexOf("runtimeFn = null");
      expect(saveIdx).toBeGreaterThan(-1);
      expect(nullRuntimeIdx).toBeGreaterThan(saveIdx);
    });
  });

  describe("hot reload constraints", () => {
    it("documents runtime.js hot reload vs main.js lifecycle", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("runtime.js can be reloaded dynamically");
      expect(code).toContain("Script Engine lifecycle");
    });

    it("only reloads runtime when no pending deferred", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("runtimeDirty && !hasPendingDeferredCommands()");
    });
  });

  describe("IOS job state machine helpers", () => {
    it("has setIosJobPhase helper", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function setIosJobPhase");
      expect(code).toContain("job.phase = phase");
      expect(code).toContain("job.state = phase");
    });

    it("guards initial dialog dismissal behind prompt state", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function isNormalPrompt");
      expect(code).toContain("containsInitialDialog(raw)");
    });

    it("has buildIosSuccessResult helper", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function buildIosSuccessResult");
    });

    it("has buildIosConfigSuccessResult helper", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function buildIosConfigSuccessResult");
    });

    it("has cleanupActiveInFlight helper", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function cleanupActiveInFlight");
    });
  });

  describe("deferred command validation", () => {
    it("fails deferred command without ticket", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("INVALID_DEFERRED_RESULT");
      expect(code).toContain("Deferred command missing ticket");
    });

    it("structures failed deferred envelope", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("RUNTIME_NOT_LOADED");
    });
  });
});

describe("Phase 2 - Template Snapshot", () => {
  it("template contains key runtime functions", () => {
    const code = MAIN_JS_TEMPLATE;
    // Verify key functions exist - template is stable
    expect(code).toContain("function activateRuntimeAfterLease()");
    expect(code).toContain("function pollCommandQueue()");
    expect(code).toContain("function cleanUp()");
    expect(code).toContain("IOS_JOBS");
  });
});
