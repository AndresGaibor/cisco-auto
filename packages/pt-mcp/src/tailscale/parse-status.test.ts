import { describe, expect, test } from "bun:test";

import { extractPublicUrl } from "./parse-status.js";

describe("extractPublicUrl", () => {
  test("usa el DNSName de Tailscale para construir la URL pública", () => {
    const tailscaleStatus = {
      Self: {
        DNSName: "andress-macbook-air.tail4a8b59.ts.net.",
      },
    };

    const funnelStatus = {
      TCP: {
        "443": { HTTPS: true },
      },
      Web: {
        "andress-macbook-air.tail4a8b59.ts.net:443": {
          Handlers: {
            "/": {
              Proxy: "http://127.0.0.1:3927",
            },
          },
        },
      },
    };

    expect(extractPublicUrl(tailscaleStatus, funnelStatus, "/mcp")).toBe(
      "https://andress-macbook-air.tail4a8b59.ts.net/mcp",
    );
  });
});
