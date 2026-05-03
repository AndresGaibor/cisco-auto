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

    const job = jobs[0] as any;
    expect(job.plan.some((step: any) => step.type === "ensure-mode" && step.value === "config")).toBe(true);
    expect(job.plan.some((step: any) => step.value === "hostname SW1")).toBe(true);
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

    const job = jobs[0] as any;
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
});