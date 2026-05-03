/**
 * Phase 3 Tests - Config handler purity and deferred job contracts
 */

import { describe, it, expect, beforeEach, afterEach, test, mock } from "bun:test";
import {
  handleConfigIos,
  handleExecIos,
  handleDeferredPoll,
  handleConfigHost,
} from "../src/handlers/runtime-handlers";
import type { HandlerDeps, PTDevice, PTCommandLine } from "../src/utils/helpers";

describe("Phase 3 - Config Handlers", () => {
  let mockDevice: PTDevice;
  let mockTerm: PTCommandLine;
  let deps: HandlerDeps;

  beforeEach(() => {
    mockTerm = {
      enterCommand: mock(() => [0, ""]) as unknown as PTCommandLine["enterCommand"],
      getPrompt: mock(() => "Router#") as unknown as PTCommandLine["getPrompt"],
    };

    mockDevice = {
      getName: () => "R1",
      getModel: () => "2911",
      getType: () => 0,
      getPower: () => true,
      setPower: () => {},
      setName: () => {},
      skipBoot: () => {},
      getCommandLine: () => mockTerm,
      getPortCount: () => 2,
      getPortAt: () => null,
      addModule: () => false,
      removeModule: () => false,
      enterCommand: () => [0, ""],
    } as unknown as PTDevice;

    deps = {
      getDeviceByName: (name: string) => (name === "R1" ? { ...mockDevice, hasTerminal: true, getTerminal: () => mockTerm } as any : null),
      listDevices: () => ["R1"],
      getActiveJobs: () => [],
      startDeferredJob: () => "ticket",
      getDeferredJob: () => null,
      dprint: () => {},
      createJob: (plan: any) => plan.id || `deferred_${Date.now()}`,
      getJobState: (_ticket: string) => null,
    } as any;

    // Setup global IOS_JOBS (shared scope in PT)
    (globalThis as any).IOS_JOBS = {};
    (globalThis as any).createIosJob = (type: string, payload: object) => {
      const ticket = `ios_job_${Date.now()}`;
      (globalThis as any).IOS_JOBS[ticket] = {
        ticket,
        type,
        payload,
        device: (payload as any).device,
        state: "queued",
        finished: false,
        output: "",
        lastMode: "",
        lastPrompt: "",
        paged: false,
        autoConfirmed: false,
        status: null,
        error: null,
        errorCode: null,
      };
      return ticket;
    };
  });

  afterEach(() => {
    delete (globalThis as any).IOS_JOBS;
    delete (globalThis as any).createIosJob;
  });

  describe("handleConfigIos", () => {
    it("returns DEVICE_NOT_FOUND for unknown device", () => {
      const result = handleConfigIos({ type: "configIos", device: "R99", commands: ["show version"] }, deps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("DEVICE_NOT_FOUND");
    });

    it("returns RUNTIME_API_MISSING_CREATE_JOB when createJob is unavailable", () => {
      const noCreateJobDeps = { ...deps, createJob: undefined };
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: ["show version"] }, noCreateJobDeps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("RUNTIME_API_MISSING_CREATE_JOB");
    });

    it("returns EMPTY_COMMANDS for empty commands", () => {
      const noCreateJobDeps = { ...deps, createJob: undefined };
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: [] }, noCreateJobDeps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("EMPTY_COMMANDS");
    });

    it("returns deferred: true with ticket for valid config", () => {
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: ["hostname R1"] }, deps);
      expect(result).toHaveProperty("deferred", true);
      expect(result).toHaveProperty("ticket");
      expect(result).toHaveProperty("job");
    });
  });

  describe("handleExecIos", () => {
    it("returns DEVICE_NOT_FOUND for unknown device", () => {
      const result = handleExecIos({ type: "execIos", device: "R99", command: "show version" }, deps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("DEVICE_NOT_FOUND");
    });

    it("returns RUNTIME_API_MISSING_CREATE_JOB when createJob is unavailable", () => {
      const noCreateJobDeps = { ...deps, createJob: undefined };
      const result = handleExecIos({ type: "execIos", device: "R1", command: "show version" }, noCreateJobDeps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("RUNTIME_API_MISSING_CREATE_JOB");
    });

    it("returns deferred: true with ticket for valid exec", () => {
      const result = handleExecIos({ type: "execIos", device: "R1", command: "show version" }, deps);
      expect(result).toHaveProperty("deferred", true);
      expect(result).toHaveProperty("ticket");
      expect(result).toHaveProperty("job");
    });
  });

  describe("handleDeferredPoll", () => {
    it("returns JOB_NOT_FOUND for unknown ticket", () => {
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "nonexistent" }, deps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", false);
      expect((result as any).code).toBe("JOB_NOT_FOUND");
    });

    it("returns done: false for in-progress job", () => {
      const jobId = "test_job_123";
      const inProgressJob = {
        id: jobId,
        device: "R1",
        done: false,
        finished: false,
        state: "pending",
        output: "",
        currentStep: 0,
        updatedAt: Date.now(),
        waitingForCommandEnd: false,
        lastPrompt: "Router#",
        lastMode: "user-exec",
      };
      const pollDeps = { ...deps, getJobState: (_ticket: string) => inProgressJob };
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: jobId }, pollDeps);
      expect(result).toHaveProperty("done", false);
      expect(result).toHaveProperty("state", "pending");
    });

    it("returns structured error for failed job", () => {
      const jobId = "test_job_err";
      const failedJob = {
        id: jobId,
        device: "R1",
        done: true,
        finished: true,
        state: "error",
        output: "Some output",
        error: "Connection refused",
        errorCode: "CONNECTION_REFUSED",
        lastPrompt: "Router#",
        lastMode: "user-exec",
      };
      const pollDeps = { ...deps, getJobState: (_ticket: string) => failedJob };
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: jobId }, pollDeps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", false);
      expect((result as any).code).toBe("CONNECTION_REFUSED");
      expect((result as any).raw).toBe("Some output");
      expect((result as any).source).toBe("terminal");
    });

    it("returns structured success for completed job", () => {
      const jobId = "test_job_ok";
      const completedJob = {
        id: jobId,
        device: "R1",
        done: true,
        finished: true,
        state: "completed",
        output: "Cisco IOS Version 15.0\nSystem image file is flash:c2900-universalk9-mz.SPA.150-1.M.bin",
        lastPrompt: "Router#",
        lastMode: "user-exec",
      };
      const pollDeps = { ...deps, getJobState: (_ticket: string) => completedJob };
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: jobId }, pollDeps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", true);
      expect((result as any).source).toBe("terminal");
      expect((result as any).raw).toBeTruthy();
    });

    it("includes output for completed show commands", () => {
      const jobId = "test_job_parse";
      const parsedJob = {
        id: jobId,
        device: "R1",
        done: true,
        finished: true,
        state: "completed",
        output: "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     192.168.1.1     YES manual up                    up",
        lastPrompt: "Router#",
        lastMode: "user-exec",
      };
      const pollDeps = { ...deps, getJobState: (_ticket: string) => parsedJob };
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: jobId }, pollDeps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", true);
      expect((result as any).raw).toBeTruthy();
    });
  });

  describe("handleConfigHost", () => {
    it("returns DEVICE_NOT_FOUND for unknown device", () => {
      const result = handleConfigHost({ type: "configHost", device: "R99" }, deps);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Device not found");
    });
  });
});
