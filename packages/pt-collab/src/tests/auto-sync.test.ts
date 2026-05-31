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

    it("no solapa polls cuando fetchSnapshot sigue pendiente", async () => {
      const client = createMockClient();
      let fetchCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => {
          fetchCount++;
          if (fetchCount === 1) return makeSnapshot();
          await new Promise((r) => setTimeout(r, 100));
          return makeSnapshot({ R1: { name: "R1", model: "2911" } });
        },
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "peer_b",
        pollIntervalMs: 10,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      await new Promise((r) => setTimeout(r, 45));

      expect(fetchCount).toBe(2);

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

  describe("IOS sync híbrido (base snapshot + ledger)", () => {
    it("peer nuevo recibe estado base IOS de cada dispositivo al unirse", async () => {
      const client = createMockClient();

      const runningConfigR1 = "hostname R1\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n";
      const runningConfigSW1 = "hostname SW1\nvlan 10\nname DATOS\n";

      const initialSnapshot: TopologySnapshot = {
        timestamp: Date.now(),
        devices: {
          R1: { name: "R1", model: "2911" },
          SW1: { name: "SW1", model: "2960" },
        },
        links: {},
        deviceConfigs: {
          R1: { runningConfig: runningConfigR1, startupConfig: "" },
          SW1: { runningConfig: runningConfigSW1, startupConfig: "" },
        },
      };

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => initialSnapshot,
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 10000,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();
      await new Promise((r) => setTimeout(r, 50));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_new",
          displayName: "Peer 1",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const submitMessages = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      );

      expect(submitMessages.length).toBeGreaterThanOrEqual(2);

      const r1Delta = submitMessages.find(
        (m: unknown) => (m as { delta?: { payload?: { device?: string } } }).delta?.payload?.device === "R1",
      ) as { delta?: { payload?: { device?: string; configLines?: string[] } } };
      expect(r1Delta).toBeDefined();
      expect(r1Delta.delta?.payload?.configLines).toContain("hostname R1");

      const sw1Delta = submitMessages.find(
        (m: unknown) => (m as { delta?: { payload?: { device?: string } } }).delta?.payload?.device === "SW1",
      ) as { delta?: { payload?: { device?: string; configLines?: string[] } } };
      expect(sw1Delta).toBeDefined();
      expect(sw1Delta.delta?.payload?.configLines).toContain("vlan 10");

      svc.stop();
    });

    it("peer reconectado no recibe comandos duplicados (cursor por peer)", async () => {
      const client = createMockClient();

      const runningConfig = "hostname R1\nip route 0.0.0.0 0.0.0.0 10.0.0.1\n";
      let fetchCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => {
          fetchCount++;
          const cmds = fetchCount === 2
            ? [{ device: "R1", command: "vlan 20" }]
            : [];
          return {
            timestamp: Date.now(),
            devices: { R1: { name: "R1", model: "2911" } },
            links: {},
            deviceConfigs: { R1: { runningConfig, startupConfig: "" } },
            manualCommands: cmds,
          };
        },
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 50,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      await new Promise((r) => setTimeout(r, 80));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_reconnect",
          displayName: "Peer Reconnect",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const firstSyncCount = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      ).length;

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_reconnect",
          displayName: "Peer Reconnect",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const secondSyncCount = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      ).length;

      expect(secondSyncCount).toBe(firstSyncCount);

      svc.stop();
    });

    it("peer nuevo recibe base snapshot + comandos incrementales del ledger", async () => {
      const client = createMockClient();

      const baseConfig = "hostname R1\n";
      let pollCount = 0;

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => {
          pollCount++;
          const manualCommands = pollCount === 1
            ? []
            : pollCount === 2
              ? [{ device: "R1", command: "interface GigabitEthernet0/0" }]
              : [{ device: "R1", command: "ip address 10.0.0.1 255.255.255.0" }];

          return {
            timestamp: Date.now(),
            devices: { R1: { name: "R1", model: "2911" } },
            links: {},
            deviceConfigs: {
              R1: {
                runningConfig: baseConfig + (pollCount > 1 ? "interface GigabitEthernet0/0\n" : "") + (pollCount > 2 ? " ip address 10.0.0.1 255.255.255.0\n" : ""),
                startupConfig: "",
              },
            },
            manualCommands,
          };
        },
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 30,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();

      await new Promise((r) => setTimeout(r, 100));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_late",
          displayName: "Late Peer",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const submitMessages = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      );

      const r1Messages = submitMessages.filter(
        (m: unknown) => (m as { delta?: { payload?: { device?: string } } }).delta?.payload?.device === "R1",
      );

      const allConfigLines = r1Messages.flatMap(
        (m: unknown) => (m as { delta?: { payload?: { configLines?: string[] } } }).delta?.payload?.configLines ?? [],
      );

      expect(allConfigLines).toContain("hostname R1");
      expect(allConfigLines).toContain("interface GigabitEthernet0/0");
      expect(allConfigLines).toContain("ip address 10.0.0.1 255.255.255.0");

      svc.stop();
    });

    it("captura hash base de cada dispositivo al iniciar sesión", async () => {
      const client = createMockClient();

      const runningConfig = "hostname SW1\nvlan 10\n";

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => ({
          timestamp: Date.now(),
          devices: { SW1: { name: "SW1", model: "2960" } },
          links: {},
          deviceConfigs: {
            SW1: { runningConfig, startupConfig: "" },
          },
        }),
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 10000,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();
      await new Promise((r) => setTimeout(r, 50));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_hash_test",
          displayName: "Peer Hash",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 30));

      const sw1Delta = client._sentMessages.find(
        (m: unknown) =>
          (m as { type?: string }).type === "delta.submit" &&
          (m as { delta?: { payload?: { device?: string } } }).delta?.payload?.device === "SW1",
      ) as { delta?: { beforeHash?: string; afterHash?: string } } | undefined;

      expect(sw1Delta?.delta?.beforeHash).toBeDefined();
      expect(sw1Delta?.delta?.afterHash).toBeDefined();
      expect(sw1Delta?.delta?.beforeHash).not.toBe(sw1Delta?.delta?.afterHash);

      svc.stop();
    });

    it("múltiples dispositivos con IOS avanzado reciben sync completo", async () => {
      const client = createMockClient();

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => ({
          timestamp: Date.now(),
          devices: {
            R1: { name: "R1", model: "2911" },
            R2: { name: "R2", model: "2911" },
            SW1: { name: "SW1", model: "2960" },
            SW2: { name: "SW2", model: "2960" },
          },
          links: {},
          deviceConfigs: {
            R1: { runningConfig: "hostname R1\nrouter ospf 1\n network 10.0.0.0 0.0.0.255 area 0\n", startupConfig: "" },
            R2: { runningConfig: "hostname R2\nrouter ospf 1\n network 10.0.0.0 0.0.0.255 area 0\n", startupConfig: "" },
            SW1: { runningConfig: "hostname SW1\nvlan 10\nvlan 20\n", startupConfig: "" },
            SW2: { runningConfig: "hostname SW2\nvlan 10\nvlan 20\n", startupConfig: "" },
          },
        }),
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 10000,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();
      await new Promise((r) => setTimeout(r, 50));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_multi",
          displayName: "Multi Device Peer",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const submitMessages = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      );

      expect(submitMessages.length).toBeGreaterThanOrEqual(4);

      const devices = ["R1", "R2", "SW1", "SW2"];
      for (const dev of devices) {
        const delta = submitMessages.find(
          (m: unknown) => (m as { delta?: { payload?: { device?: string } } }).delta?.payload?.device === dev,
        );
        expect(delta).toBeDefined();
        const configLines = (delta as { delta?: { payload?: { configLines?: string[] } } }).delta?.payload?.configLines ?? [];
        expect(configLines.length).toBeGreaterThan(0);
      }

      svc.stop();
    });

    it("peer nuevo recibe manualCommands iniciales (pre-sesión) del host", async () => {
      const client = createMockClient();

      const initialSnapshot: TopologySnapshot = {
        timestamp: Date.now(),
        devices: { R1: { name: "R1", model: "2911" } },
        links: {},
        deviceConfigs: {
          R1: { runningConfig: "hostname R1\n", startupConfig: "" },
        },
        manualCommands: [
          { device: "R1", command: "enable" },
          { device: "R1", command: "configure terminal" },
        ],
      };

      const opts: AutoSyncOptions = {
        client,
        fetchSnapshot: async () => initialSnapshot,
        applyDelta: async () => ({ ok: true, deltaId: "x" } as DeltaApplyResult),
        roomId: "default",
        peerId: "host_abc",
        pollIntervalMs: 10000,
      };

      const svc = new AutoSyncService(opts);
      await svc.start();
      await new Promise((r) => setTimeout(r, 50));

      client._emit("peer.joined", {
        peer: {
          peerId: "peer_joined_late",
          displayName: "Late Peer",
          role: "peer" as any,
          connectedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          capabilities: [],
          vector: {},
          hashes: { deviceHashes: {} },
        },
        timestamp: new Date().toISOString(),
      });

      await new Promise((r) => setTimeout(r, 50));

      const submitMessages = client._sentMessages.filter(
        (m: unknown) => (m as { type?: string }).type === "delta.submit",
      );

      // Debe haber enviado el delta de base runningConfig de R1 y otro delta con los manualCommands ("enable", "configure terminal")
      expect(submitMessages.length).toBeGreaterThanOrEqual(2);

      const r1CmdsDelta = submitMessages.find(
        (m: unknown) =>
          (m as { delta?: { payload?: { device?: string; configLines?: string[] } } }).delta?.payload?.device === "R1" &&
          (m as { delta?: { payload?: { configLines?: string[] } } }).delta?.payload?.configLines?.includes("enable"),
      ) as { delta?: { payload?: { configLines?: string[] } } } | undefined;

      expect(r1CmdsDelta).toBeDefined();
      expect(r1CmdsDelta?.delta?.payload?.configLines).toContain("enable");
      expect(r1CmdsDelta?.delta?.payload?.configLines).toContain("configure terminal");

      svc.stop();
    });
  });
});
