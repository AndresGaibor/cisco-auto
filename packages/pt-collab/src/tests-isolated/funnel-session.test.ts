import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

beforeEach(() => {
  mock.module("../tailscale/tailscale-status.js", () => ({
    checkTailscaleStatus: mock(() =>
      Promise.resolve({
        available: true,
        loggedIn: true,
        hostname: "test-host",
        tailscaleIp: "100.1.2.3",
        magicDnsDomain: "test-host.ts.net",
      })
    ),
  }));

  mock.module("../tailscale/resolve-public-url.js", () => ({
    resolvePublicUrl: mock(() => Promise.resolve("https://test-host.ts.net")),
  }));
});

afterEach(() => {
  mock.restore();
});

describe("funnel-session", () => {
  test("lanza error si Tailscale no disponible", async () => {
    mock.module("../tailscale/tailscale-status.js", () => ({
      checkTailscaleStatus: mock(() =>
        Promise.resolve({ available: false, loggedIn: false })
      ),
    }));

    const { startFunnelSession } = await import("../tailscale/funnel-session.js");
    expect(startFunnelSession({ localPort: 3937 })).rejects.toThrow(
      "Tailscale no está instalado"
    );
  });

  test("lanza error si no autenticado", async () => {
    mock.module("../tailscale/tailscale-status.js", () => ({
      checkTailscaleStatus: mock(() =>
        Promise.resolve({ available: true, loggedIn: false })
      ),
    }));

    const { startFunnelSession } = await import("../tailscale/funnel-session.js");
    expect(startFunnelSession({ localPort: 3937 })).rejects.toThrow(
      "Tailscale no está autenticado"
    );
  });
});
