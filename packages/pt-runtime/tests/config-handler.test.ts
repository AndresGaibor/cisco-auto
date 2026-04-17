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

    it("returns NO_TERMINAL when device has no CLI", () => {
      const noTermDevice = { ...mockDevice, getCommandLine: () => null };
      const noTermDeps = { ...deps, getNet: () => ({ getDevice: () => noTermDevice, getDeviceCount: () => 1, getDeviceAt: () => noTermDevice }) as any };
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: ["show version"] }, noTermDeps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("NO_TERMINAL");
    });

    it("returns skipped for empty commands", () => {
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: [] }, deps);
      expect(result.ok).toBe(true);
      expect((result as any).skipped).toBe(true);
    });

    it("returns deferred: true with ticket for valid config", () => {
      const result = handleConfigIos({ type: "configIos", device: "R1", commands: ["hostname R1"] }, deps);
      expect(result).toHaveProperty("deferred", true);
      expect(result).toHaveProperty("ticket");
      expect(result).toHaveProperty("kind", "ios");
    });
  });

  describe("handleExecIos", () => {
    it("returns DEVICE_NOT_FOUND for unknown device", () => {
      const result = handleExecIos({ type: "execIos", device: "R99", command: "show version" }, deps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("DEVICE_NOT_FOUND");
    });

    it("returns NO_TERMINAL when device has no CLI", () => {
      const noTermDevice = { ...mockDevice, getCommandLine: () => null };
      const noTermDeps = { ...deps, getNet: () => ({ getDevice: () => noTermDevice, getDeviceCount: () => 1, getDeviceAt: () => noTermDevice }) as any };
      const result = handleExecIos({ type: "execIos", device: "R1", command: "show version" }, noTermDeps);
      expect(result.ok).toBe(false);
      expect((result as any).code).toBe("NO_TERMINAL");
    });

    it("returns deferred: true with ticket for valid exec", () => {
      const result = handleExecIos({ type: "execIos", device: "R1", command: "show version" }, deps);
      expect(result).toHaveProperty("deferred", true);
      expect(result).toHaveProperty("ticket");
      expect(result).toHaveProperty("kind", "ios");
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
      const ticket = (globalThis as any).createIosJob("execIos", { device: "R1", command: "show version" });
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
      expect(result).toHaveProperty("done", false);
      expect(result).toHaveProperty("state");
    });

    it("returns structured error for failed job", () => {
      const ticket = (globalThis as any).createIosJob("execIos", { device: "R1", command: "show version" });
      const job = (globalThis as any).IOS_JOBS[ticket];
      job.finished = true;
      job.state = "error";
      job.error = "Connection refused";
      job.errorCode = "CONNECTION_REFUSED";
      job.output = "Some output";

      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", false);
      expect((result as any).code).toBe("CONNECTION_REFUSED");
      expect((result as any).raw).toBe("Some output");
      expect((result as any).source).toBe("terminal");
    });

    it("returns structured success for completed job", () => {
      const ticket = (globalThis as any).createIosJob("execIos", { device: "R1", command: "show version" });
      const job = (globalThis as any).IOS_JOBS[ticket];
      job.finished = true;
      job.state = "done";
      job.output = "Cisco IOS Version 15.0\nSystem image file is flash:c2900-universalk9-mz.SPA.150-1.M.bin";

      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", true);
      expect((result as any).source).toBe("terminal");
      expect((result as any).raw).toBeTruthy();
    });

    it("includes parsed output for known show commands", () => {
      const ticket = (globalThis as any).createIosJob("execIos", { device: "R1", command: "show ip interface brief" });
      const job = (globalThis as any).IOS_JOBS[ticket];
      job.finished = true;
      job.state = "done";
      job.output = "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     192.168.1.1     YES manual up                    up";

      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
      expect(result).toHaveProperty("done", true);
      expect(result).toHaveProperty("ok", true);
      expect((result as any).parsed).toBeDefined();
      expect((result as any).parsed.entries).toBeDefined();
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
