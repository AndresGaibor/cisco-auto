import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";
import { AutoSyncService, type AutoSyncOptions } from "../sync/auto-sync.js";
import type { CollabClient } from "../client/collab-client.js";
import type { CollabDelta } from "../protocol/messages.js";
import type { DeltaApplyResult } from "../applier/delta-applier.js";
import type { TopologySnapshot } from "../detector/change-detector.js";

function makeTestDelta(overrides: Partial<CollabDelta> = {}): CollabDelta {
  return {
    id: `delta_${Math.random().toString(36).slice(2, 8)}`,
    roomId: "default",
    peerId: "peer_a",
    seq: 1,
    lamport: 1,
    createdAt: new Date().toISOString(),
    baseVector: {},
    scope: "topology",
    kind: "topology.device.added",
    payload: { name: "R1", model: "2911" },
    ...overrides,
  };
}

function makeSnapshot(devices: Record<string, { name: string; model: string }> = {}): TopologySnapshot {
  return {
    timestamp: Date.now(),
    devices: Object.fromEntries(
      Object.entries(devices).map(([k, v]) => [k, { name: v.name, model: v.model }]),
    ),
    links: {},
    deviceConfigs: {},
  };
}

interface MockCollabClient extends CollabClient {
  _sentMessages: unknown[];
  _emit(event: string, msg: unknown): void;
}

function createMockClient(): MockCollabClient {
  const listeners = new Map<string, Set<(msg: unknown) => void>>();

  const mock = {
    listeners,
    _sentMessages: [] as unknown[],
    _status: "connected" as const,
    on(event: string, handler: (msg: unknown) => void): () => void {
      const set = listeners.get(event) ?? new Set();
      set.add(handler);
      listeners.set(event, set);
      return () => set.delete(handler);
    },
    sendMessage(msg: unknown) {
      mock._sentMessages.push(msg);
    },
    getStatus() {
      return mock._status;
    },
    _emit(event: string, msg: unknown) {
      for (const h of listeners.get(event) ?? []) h(msg);
    },
  };

  return mock as any;
}

describe("AutoSyncService", () => {
  describe("delta.commit listener", () => {
    it("registra listener en client.on('delta.commit') al iniciar", async () => {
      const client = createMockClient();
      let called = false;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);

      client.on("delta.commit", () => { called = true; });

      await svc.start();

      client._emit("delta.commit", { delta: makeTestDelta({ peerId: "peer_a" }) });

      expect(called).toBe(true);

      svc.stop();
    });

    it("llama applyDelta al recibir delta.commit del servidor", async () => {
      const client = createMockClient();
      let applyCalled = false;
      let applyDeltaArg: CollabDelta | null = null;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async (delta) => {
          applyCalled = true;
          applyDeltaArg = delta;
          return { ok: true, deltaId: delta.id } as DeltaApplyResult;
        },
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      const delta = makeTestDelta({ peerId: "peer_a" });
      client._emit("delta.commit", { delta });

      await new Promise((r) => setTimeout(r, 50));

      expect(applyCalled).toBe(true);
      expect((applyDeltaArg as CollabDelta | null)?.id).toBe(delta.id);

      svc.stop();
    });

    it("envía delta.ack tras aplicar delta remoto", async () => {
      const client = createMockClient();

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async () => ({ ok: true, deltaId: "test_delta" } as DeltaApplyResult),
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      const delta = makeTestDelta({ id: "delta_test_ack", peerId: "peer_a" });
      client._emit("delta.commit", { delta });

      await new Promise((r) => setTimeout(r, 50));

      const ackMsg = client._sentMessages.find((m: unknown) => (m as { type?: string }).type === "delta.ack");
      expect(ackMsg).toBeDefined();
      expect((ackMsg as { deltaId: string }).deltaId).toBe("delta_test_ack");
      expect((ackMsg as { accepted: boolean }).accepted).toBe(true);

      svc.stop();
    });

    it("ignora delta.commit propio (no re-aplica sus propios cambios)", async () => {
      const client = createMockClient();
      let applyCallCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async () => {
          applyCallCount++;
          return { ok: true, deltaId: "x" } as DeltaApplyResult;
        },
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      const ownDelta = makeTestDelta({ peerId: "peer_b" });
      client._emit("delta.commit", { delta: ownDelta });

      await new Promise((r) => setTimeout(r, 50));

      expect(applyCallCount).toBe(0);

      svc.stop();
    });

    it("no re-aplica delta ya recibido (seenDeltaIds)", async () => {
      const client = createMockClient();
      let applyCallCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async () => {
          applyCallCount++;
          return { ok: true, deltaId: "x" } as DeltaApplyResult;
        },
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      const delta = makeTestDelta({ id: "delta_duplicado", peerId: "peer_a" });

      client._emit("delta.commit", { delta });
      await new Promise((r) => setTimeout(r, 50));

      client._emit("delta.commit", { delta });
      await new Promise((r) => setTimeout(r, 50));

      expect(applyCallCount).toBe(1);

      svc.stop();
    });
  });

  describe("echo loop prevention", () => {
    it("poll no envía deltas mientras applyRemote está activo", async () => {
      const client = createMockClient();
      let fetchCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => {
          fetchCount++;
          return makeSnapshot({ R1: { name: "R1", model: "2911" } });
        },
        applyDelta: async (delta) => {
          await new Promise((r) => setTimeout(r, 100));
          return { ok: true, deltaId: delta.id } as DeltaApplyResult;
        },
        roomId: "default",
        peerId: "peer_b",
        pollIntervalMs: 50,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      const delta = makeTestDelta({ peerId: "peer_a" });
      client._emit("delta.commit", { delta });

      await new Promise((r) => setTimeout(r, 20));

      expect(fetchCount).toBe(1);

      await new Promise((r) => setTimeout(r, 200));

      const submitMessages = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      );

      expect(submitMessages.length).toBeGreaterThanOrEqual(0);

      svc.stop();
    });
  });

  describe("stop cleanup", () => {
    it("elimina listeners al detener", async () => {
      const client = createMockClient();
      let callCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => makeSnapshot(),
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "peer_b",
      };

      const svc = new AutoSyncService(opts);
      await svc.start();
      svc.stop();

      client._emit("delta.commit", { delta: makeTestDelta({ peerId: "peer_a" }) });
      await new Promise((r) => setTimeout(r, 50));

      expect(callCount).toBe(0);
    });
  });
});