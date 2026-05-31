import { describe, expect, test } from "bun:test";
import { evaluateDeltaConflict } from "../conflicts/conflict-engine.js";
import type { CollabDelta } from "../protocol/messages.js";

function makeDelta(overrides: Partial<CollabDelta>): CollabDelta {
  return {
    id: "d1",
    roomId: "test",
    peerId: "peerA",
    seq: 1,
    lamport: 1,
    createdAt: new Date().toISOString(),
    baseVector: {},
    scope: "topology",
    kind: "topology.device.added",
    payload: {},
    ...overrides,
  };
}

describe("evaluateDeltaConflict", () => {
  test("sin cambios locales, apply", () => {
    const incoming = makeDelta({ scope: "topology" });
    const result = evaluateDeltaConflict(incoming, []);
    expect(result.action).toBe("apply");
  });

  test("scopes diferentes, apply", () => {
    const incoming = makeDelta({ scope: "device:SW1:running-config" });
    const local = [makeDelta({ scope: "device:R1:running-config" })];
    const result = evaluateDeltaConflict(incoming, local);
    expect(result.action).toBe("apply");
  });

  test("mismo running-config con comandos no solapados, autoMerge", () => {
    const incoming = makeDelta({
      scope: "device:SW1:running-config",
      kind: "device.cli.runningConfig.changed",
      payload: { commands: ["interface g0/1", "no shutdown"] },
    });
    const local = [makeDelta({
      scope: "device:SW1:running-config",
      kind: "device.cli.runningConfig.changed",
      payload: { commands: ["vlan 10", "name USERS"] },
    })];
    const result = evaluateDeltaConflict(incoming, local);
    expect(result.action).toBe("autoMerge");
  });

  test("mismo running-config en misma seccion, conflicto", () => {
    const incoming = makeDelta({
      scope: "device:SW1:running-config",
      kind: "device.cli.runningConfig.changed",
      payload: { commands: ["interface g0/1", "ip address 10.0.0.1 255.255.255.0"] },
    });
    const local = [makeDelta({
      scope: "device:SW1:running-config",
      kind: "device.cli.runningConfig.changed",
      payload: { commands: ["interface g0/1", "ip address 192.168.1.1 255.255.255.0"] },
    })];
    const result = evaluateDeltaConflict(incoming, local);
    expect(result.action).toBe("conflict");
  });

  test("mismo puerto usado por dos links, conflicto", () => {
    const incoming = makeDelta({
      scope: "topology",
      kind: "topology.link.created",
      payload: { port1: "Fa0/1" },
    });
    const local = [makeDelta({
      scope: "topology",
      kind: "topology.link.created",
      payload: { port1: "Fa0/1" },
    })];
    const result = evaluateDeltaConflict(incoming, local);
    expect(result.action).toBe("conflict");
  });

  test("XML scope detectado correctamente", () => {
    const incoming = makeDelta({
      scope: "device:WLC1:xml",
      kind: "device.xml.changed",
    });
    const local = [makeDelta({ scope: "device:WLC1:running-config" })];
    const result = evaluateDeltaConflict(incoming, local);
    expect(result.action).toBe("conflict");
  });
});
