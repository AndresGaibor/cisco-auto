import { describe, test, expect } from "bun:test";
import { handleConfigHost, handleExecIos, handleConfigIos, handleDeferredPoll } from "../../handlers/config";
import type { HandlerDeps } from "../../utils/helpers";
import { generateIosConfigHandlersTemplate } from "../../templates/ios-config-handlers-template";
import { generateIosExecHandlersTemplate } from "../../templates/ios-exec-handlers-template";

describe("handleConfigHost", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigHost({ type: "configHost", device: "NOEXISTE" }, deps as HandlerDeps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna ok cuando device existe sin ip", () => {
    const deps = {
      getNet: () => ({ getDevice: () => ({ getPortAt: () => null }) }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigHost({ type: "configHost", device: "PC1" }, deps as HandlerDeps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("No ports");
  });
});

describe("handleExecIos", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleExecIos(
      { type: "execIos", device: "NOEXISTE", command: "show version" },
      deps as HandlerDeps
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna resultado cuando device existe", () => {
    const previousCreateIosJob = (globalThis as any).createIosJob;
    (globalThis as any).createIosJob = () => "ticket-1";

    try {
      const deps = {
        getNet: () => ({
          getDevice: () => ({
            getCommandLine: () => ({
              enterCommand: () => [0, "some output"],
            }),
          }),
        }) as any,
        getLW: () => ({}) as any,
        dprint: () => {},
      };

      const result = handleExecIos(
        { type: "execIos", device: "R1", command: "show version", parse: false },
        deps as HandlerDeps
      ) as any;

      expect(result.deferred).toBe(true);
      expect(result.ticket).toBe("ticket-1");
    } finally {
      (globalThis as any).createIosJob = previousCreateIosJob;
    }
  });
});

describe("handleConfigIos", () => {
  test("retorna error cuando device no existe", () => {
    const deps = {
      getNet: () => ({ getDevice: () => null }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigIos(
      { type: "configIos", device: "NOEXISTE", commands: ["interface Gi0/0"] },
      deps as HandlerDeps
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Device not found");
  });

  test("retorna error cuando device no soporta CLI", () => {
    const deps = {
      getNet: () => ({
        getDevice: () => ({
          getCommandLine: () => null,
          skipBoot: () => {},
        }),
      }) as any,
      getLW: () => ({}) as any,
      dprint: () => {},
    };

    const result = handleConfigIos(
      { type: "configIos", device: "PC1", commands: ["ip address 192.168.1.1 255.255.255.0"] },
      deps as HandlerDeps
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.error).toContain("CLI");
  });
});

describe("ios config handlers template", () => {
  test("incluye normalizacion del dialogo inicial y autoinstall", () => {
    const source = generateIosConfigHandlersTemplate();

    expect(source).toContain("dismissInitialDialogIfNeeded");
    expect(source).toContain("initial configuration dialog");
    expect(source).toContain("terminate autoinstall");
    expect(source).toContain("syncEngineModeFromTerminal");
    expect(source).toContain("var inferred = inferModeFromPrompt(prompt);");
  });
});

describe("ios exec handlers template", () => {
  test("guards setup dialog dismissal behind a normal prompt check", () => {
    const source = generateIosExecHandlersTemplate();

    expect(source).toContain("isNormalPrompt");
    expect(source).toContain("function isNormalPrompt");
    expect(source).toContain("Would you like to enter the initial configuration dialog?");
  });
});

describe("handleDeferredPoll", () => {
  test("returns job-not-found when the ticket is unknown", () => {
    const previousJobs = (globalThis as any).IOS_JOBS;
    (globalThis as any).IOS_JOBS = {};
    try {
      const deps = { dprint: () => {} } as HandlerDeps;
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "missing-ticket" } as any, deps);

      expect(result.done).toBe(true);
      expect((result as any).ok).toBe(false);
      expect((result as any).code).toBe("JOB_NOT_FOUND");
    } finally {
      (globalThis as any).IOS_JOBS = previousJobs;
    }
  });

  test("returns in-progress state when the job is still running", () => {
    const previousJobs = (globalThis as any).IOS_JOBS;
    (globalThis as any).IOS_JOBS = {
      "ticket-1": {
        finished: false,
        state: "run-exec",
      },
    };

    try {
      const deps = { dprint: () => {} } as HandlerDeps;
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "ticket-1" } as any, deps);

      expect(result.done).toBe(false);
      expect((result as any).state).toBe("run-exec");
    } finally {
      (globalThis as any).IOS_JOBS = previousJobs;
    }
  });

  test("returns a completed success payload for finished jobs", () => {
    const previousJobs = (globalThis as any).IOS_JOBS;
    (globalThis as any).IOS_JOBS = {
      "ticket-2": {
        finished: true,
        state: "done",
        output: "show version\nR1#",
        status: 0,
        lastMode: "priv-exec",
        lastPrompt: "R1#",
        autoConfirmed: true,
        payload: { command: "show version" },
      },
    };

    try {
      const deps = { dprint: () => {} } as HandlerDeps;
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "ticket-2" } as any, deps);

      expect(result.done).toBe(true);
      expect((result as any).ok).toBe(true);
      expect((result as any).source).toBe("terminal");
      expect((result as any).raw).toContain("show version");
      expect((result as any).session.autoDismissedInitialDialog).toBe(true);
    } finally {
      (globalThis as any).IOS_JOBS = previousJobs;
    }
  });

  test("returns a completed error payload for failed jobs", () => {
    const previousJobs = (globalThis as any).IOS_JOBS;
    (globalThis as any).IOS_JOBS = {
      "ticket-3": {
        finished: true,
        state: "error",
        output: "% Invalid input detected at '^' marker.\n",
        error: "Command failed",
        errorCode: "COMMAND_FAILED",
        lastMode: "priv-exec",
        lastPrompt: "R1#",
      },
    };

    try {
      const deps = { dprint: () => {} } as HandlerDeps;
      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "ticket-3" } as any, deps);

      expect(result.done).toBe(true);
      expect((result as any).ok).toBe(false);
      expect((result as any).code).toBe("COMMAND_FAILED");
      expect((result as any).error).toContain("Command failed");
      expect((result as any).source).toBe("terminal");
    } finally {
      (globalThis as any).IOS_JOBS = previousJobs;
    }
  });
});
