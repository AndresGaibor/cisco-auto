import { describe, expect, test } from "bun:test";
import { handleExecIos } from "../../handlers/ios/exec-ios-handler";
import { handleConfigIos } from "../../handlers/ios/config-ios-handler";
import { handleExecPc } from "../../handlers/ios/exec-pc-handler";
import { handlePing } from "../../handlers/ios/ping-handler";

function fakeApi() {
  const jobs: unknown[] = [];

  return {
    jobs,
    api: {
      now: () => 123,
      getDeviceByName: () => ({
        getType: () => 1,
        getModel: () => "2960-24TT",
        hasTerminal: true,
        getTerminal: () => ({}),
      }),
      createJob: (job: unknown) => {
        jobs.push(job);
        return "ticket-1";
      },
    } as any,
  };
}

describe("legacy terminal wrappers are synchronous", () => {
  test("execIos returns deferred result without Promise", () => {
    const { api, jobs } = fakeApi();

    const result = handleExecIos(
      { type: "execIos", device: "SW1", command: "show version" } as any,
      api,
    ) as any;

    expect(typeof result.then).toBe("undefined");
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(jobs).toHaveLength(1);
    expect(result.ticket).toBeTruthy();
    expect(String(result.ticket)).not.toBe("");
    expect((jobs[0] as any).id).toBe(result.ticket);
  });

  test("configIos returns config deferred plan", () => {
    const { api, jobs } = fakeApi();

    const result = handleConfigIos(
      {
        type: "configIos",
        device: "SW1",
        commands: ["hostname SW1"],
      } as any,
      api,
    ) as any;

    expect(typeof result.then).toBe("undefined");
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBeTruthy();
    expect(String(result.ticket)).not.toBe("");

    const job = jobs[0] as any;
    expect(job.id).toBe(result.ticket);
    expect(job.plan.length).toBeGreaterThan(0);
  });

  test("execPc returns host deferred plan", () => {
    const { api, jobs } = fakeApi();

    const result = handleExecPc(
      { type: "execPc", device: "PC1", command: "ipconfig" } as any,
      api,
    ) as any;

    expect(typeof result.then).toBe("undefined");
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBeTruthy();
    expect(String(result.ticket)).not.toBe("");

    const job = jobs[0] as any;
    expect(job.id).toBe(result.ticket);
    expect(job.device).toBe("PC1");
    expect(job.plan.length).toBeGreaterThan(0);
  });

  test("ping returns deferred plan", () => {
    const { api, jobs } = fakeApi();

    const result = handlePing(
      { device: "SW1", target: "192.168.1.1" },
      api,
    ) as any;

    expect(typeof result.then).toBe("undefined");
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(jobs).toHaveLength(1);
  });

  test("legacy deferred wrappers generate a non-empty plan id before createJob", () => {
    const jobs: unknown[] = [];

    const api = {
      now: () => 1700000000000,
      getDeviceByName: () => ({
        getType: () => 1,
        getModel: () => "2960-24TT",
        hasTerminal: true,
        getTerminal: () => ({}),
      }),
      createJob: (job: any) => {
        jobs.push(job);
        return job.id;
      },
    } as any;

    const result = handleExecIos(
      { type: "execIos", device: "SW1", command: "show version" } as any,
      api,
    ) as any;

    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBeTruthy();
    expect(String(result.ticket)).toMatch(/^legacy-command_1700000000000_/);

    expect(jobs).toHaveLength(1);
    expect((jobs[0] as any).id).toBe(result.ticket);
    expect((result.job as any).id).toBe(result.ticket);
  });

  test("execIos legacy incluye ensure-mode cuando ensurePrivileged=true", () => {
    const { api, jobs } = fakeApi();

    const result = handleExecIos(
      {
        type: "execIos",
        device: "SW1",
        command: "show running-config",
        ensurePrivileged: true,
      } as any,
      api,
    ) as any;

    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBeTruthy();

    expect(jobs).toHaveLength(1);

    const job = jobs[0] as any;

    expect(job.id).toBe(result.ticket);
    expect(job.plan[0]).toMatchObject({
      type: "ensure-mode",
      value: "privileged-exec",
      options: { stopOnError: true },
    });
    expect(job.plan[1]).toMatchObject({
      type: "command",
      value: "show running-config",
    });
  });

  test("execIos legacy no incluye ensure-mode cuando ensurePrivileged=false", () => {
    const { api, jobs } = fakeApi();

    const result = handleExecIos(
      {
        type: "execIos",
        device: "SW1",
        command: "show version",
        ensurePrivileged: false,
      } as any,
      api,
    ) as any;

    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);

    const job = jobs[0] as any;

    expect(job.plan[0]).toMatchObject({
      type: "command",
      value: "show version",
    });
    expect(job.plan.some((step: any) => step.type === "ensure-mode")).toBe(false);
  });
});