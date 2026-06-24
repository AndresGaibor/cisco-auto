import { describe, expect, test } from "bun:test";
import { shouldSkipCheckpointBootstrap, type ConnectSimpleSessionOptions } from "../cli-mode/connect-simple-session.js";

function makeController(statusResult: {
  ok?: boolean;
  project?: {
    hasActiveFile?: boolean;
    activeFile?: string | null;
  };
}): ConnectSimpleSessionOptions["controller"] {
  return {
    project: {
      status: async () => statusResult,
    },
  } as ConnectSimpleSessionOptions["controller"];
}

describe("connectSimpleSession bootstrap guard", () => {
  test("omite bootstrap cuando ya hay proyecto activo y coincide la URL", async () => {
    const result = await shouldSkipCheckpointBootstrap({
      controller: makeController({
        ok: true,
        project: {
          hasActiveFile: true,
          activeFile: "C:/Users/UserPC/Documents/lab.pkt",
        },
      }),
      url: "https://host.ts.net/collab/s/abc123",
      clientConfig: { schemaVersion: 1, lastUrl: "https://host.ts.net/collab/s/abc123" },
      sessionInfo: { schemaVersion: 1, mode: "client", publicUrl: "https://host.ts.net/collab/s/abc123", startedAt: new Date().toISOString(), pid: 1234 },
    });

    expect(result).toBe(true);
  });

  test("no omite bootstrap si no hay proyecto activo", async () => {
    const result = await shouldSkipCheckpointBootstrap({
      controller: makeController({
        ok: true,
        project: {
          hasActiveFile: false,
          activeFile: null,
        },
      }),
      url: "https://host.ts.net/collab/s/abc123",
      clientConfig: { schemaVersion: 1, lastUrl: "https://host.ts.net/collab/s/abc123" },
      sessionInfo: { schemaVersion: 1, mode: "client", publicUrl: "https://host.ts.net/collab/s/abc123", startedAt: new Date().toISOString(), pid: 1234 },
    });

    expect(result).toBe(false);
  });

  test("no omite bootstrap si la URL no coincide", async () => {
    const result = await shouldSkipCheckpointBootstrap({
      controller: makeController({
        ok: true,
        project: {
          hasActiveFile: true,
          activeFile: "C:/Users/UserPC/Documents/lab.pkt",
        },
      }),
      url: "https://host.ts.net/collab/s/xyz999",
      clientConfig: { schemaVersion: 1, lastUrl: "https://host.ts.net/collab/s/abc123" },
      sessionInfo: { schemaVersion: 1, mode: "client", publicUrl: "https://host.ts.net/collab/s/abc123", startedAt: new Date().toISOString(), pid: 1234 },
    });

    expect(result).toBe(false);
  });
});
