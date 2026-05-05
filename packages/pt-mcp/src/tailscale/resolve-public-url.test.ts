import { describe, expect, test } from "bun:test";

import { resolvePublicUrl } from "./resolve-public-url.js";

describe("resolvePublicUrl", () => {
  test("reintenta hasta que Funnel expone la URL pública", async () => {
    let attempts = 0;

    const result = await resolvePublicUrl({
      path: "/mcp",
      timeoutMs: 2_000,
      intervalMs: 1,
      readTailscaleStatus: async () => JSON.stringify({ Self: { DNSName: "andress-macbook-air.tail4a8b59.ts.net." } }),
      readFunnelStatus: async () => {
        attempts += 1;
        if (attempts < 3) {
          return JSON.stringify({ Foreground: {} });
        }

        return JSON.stringify({
          Foreground: {
            abc: {
              Web: {
                "andress-macbook-air.tail4a8b59.ts.net:443": { Handlers: { "/": {} } },
              },
            },
          },
        });
      },
    });

    expect(result).toBe("https://andress-macbook-air.tail4a8b59.ts.net/mcp");
    expect(attempts).toBeGreaterThanOrEqual(3);
  });
});
