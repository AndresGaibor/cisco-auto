/**
 * Phase 2 Tests - main.js template validation (kernel architecture)
 * Verifies: main.js is kernel only (no business logic), runtime handles all domain logic
 */

import { describe, it, expect } from "bun:test";
import { MAIN_JS_TEMPLATE } from "../src/templates/main-kernel.js";

describe("Phase 2 - Main.js Template (Kernel Architecture)", () => {
  describe("kernel only (no business logic)", () => {
    it("does NOT contain handler implementations", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("handleAddDevice");
      expect(code).not.toContain("handleConfigIos");
      expect(code).not.toContain("handleExecIos");
    });

    it("does NOT contain parse logic", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("parseIpInterfaceBrief");
      expect(code).not.toContain("parseVlanBrief");
    });
  });

  describe("durable queue (commands/, in-flight/, results/)", () => {
    it("uses commands/, in-flight/, results/, dead-letter/", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain('"/commands"');
      expect(code).toContain('"/in-flight"');
      expect(code).toContain('"/results"');
      expect(code).toContain('"/dead-letter"');
    });

    it("does NOT contain legacy command.json references", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("COMMAND_FILE");
      expect(code).not.toContain("CURRENT_COMMAND_FILE");
      expect(code).not.toContain('/command.json"');
    });
  });

  describe("kernel functions (lifecycle/orchestration)", () => {
    it("contains function main", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function main()");
    });

    it("contains loadRuntime and reloadRuntimeIfNeeded", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("loadRuntime");
      expect(code).toContain("reloadRuntimeIfNeeded");
    });

    it("contains pollCommandQueue", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("pollCommandQueue");
    });

    it("contains cleanUp", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function cleanUp");
    });
  });

  describe("job kernel (minimal step interpreter)", () => {
    it("contains ACTIVE_JOBS and DEVICE_SESSIONS state", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("ACTIVE_JOBS");
      expect(code).toContain("DEVICE_SESSIONS");
    });

    it("contains createJob and getJobState", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("function createJob");
      expect(code).toContain("function getJobState");
    });

    it("contains step handlers (minimal interpreter)", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("handleEnsureModeStep");
      expect(code).toContain("handleCommandStep");
      expect(code).toContain("handleConfirmStep");
      expect(code).toContain("handleSaveConfigStep");
    });
  });

  describe("hot reload support", () => {
    it("contains runtimeDirty flag", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("runtimeDirty");
    });

    it("contains runtimeLastMtime for file watching", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("runtimeLastMtime");
    });

    it("contains createRuntimeApi (injects api into runtime)", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).toContain("createRuntimeApi");
    });
  });

  describe("does NOT contain legacy IOS patterns", () => {
    it("does NOT contain IOS_JOBS (old global jobs object)", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("var IOS_JOBS");
    });

    it("does NOT contain createIosJob (old function)", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("function createIosJob");
    });

    it("does NOT contain setIosJobPhase", () => {
      const code = MAIN_JS_TEMPLATE;
      expect(code).not.toContain("setIosJobPhase");
    });
  });
});