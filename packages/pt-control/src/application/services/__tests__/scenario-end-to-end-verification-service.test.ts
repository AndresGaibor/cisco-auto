import { describe, expect, it } from "bun:test";
import { ScenarioEndToEndVerificationService } from "../scenario-end-to-end-verification-service.js";

function createPrimitivePort(snapshot: any) {
  return {
    async runPrimitive(id: string) {
      if (id !== "topology.snapshot") {
        return { ok: false, value: null };
      }
      return { ok: true, value: snapshot };
    },
  } as any;
}

function createExec(rawByCommand: Record<string, string>) {
  return async (_device: string, command: string) => {
    return { raw: rawByCommand[command] ?? "" };
  };
}

describe("ScenarioEndToEndVerificationService", () => {
  it("verifica links mínimos y vecinos", async () => {
    const primitivePort = createPrimitivePort({
      links: [
        {
          device1: "R1",
          port1: "GigabitEthernet0/0",
          device2: "SW1",
          port2: "GigabitEthernet0/1",
        },
      ],
    });

    const exec = createExec({
      "show cdp neighbors": `
Device ID    Local Intrfce
SW1          Gig0/0
`,
      "show running-config": `hostname R1`,
    });

    const svc = new ScenarioEndToEndVerificationService(primitivePort, exec);

    const result = await svc.run({
      name: "basic-topology",
      minimumLinks: 1,
      expectedLinks: [
        {
          deviceA: "R1",
          portA: "GigabitEthernet0/0",
          deviceB: "SW1",
          portB: "GigabitEthernet0/1",
        },
      ],
      devices: [
        {
          device: "R1",
          expectedNeighbors: [{ device: "R1", remoteDevice: "SW1" }],
        },
      ],
    });

    expect(result.executed).toBe(true);
    expect(result.verified).toBe(true);
  });
});