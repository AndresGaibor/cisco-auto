
import { describe, expect, test } from "bun:test";
import { registerResources, ptGuideResources } from "./register-resources.js";

describe("registerResources", () => {
  function capture() {
    const resources = new Map<string, { name: string; config: any; handler: any }>();

    registerResources({
      server: {
        registerResource(name: string, uri: string, config: any, handler: any) {
          resources.set(uri, { name, config, handler });
        },
      },
    });

    return resources;
  }

  test("registra recursos esperados", () => {
    const resources = capture();

    for (const guide of ptGuideResources) {
      expect(resources.has(guide.uri)).toBe(true);
      expect(resources.get(guide.uri)?.name).toBe(guide.name);
      expect(resources.get(guide.uri)?.config.mimeType).toBe("text/markdown");
    }

    expect(resources.has("pt://guide/agent-usage")).toBe(true);
    expect(resources.has("pt://recipes/safe-batch-show")).toBe(true);
    expect(resources.has("pt://recipes/partial-batch-recovery")).toBe(true);
    expect(resources.has("ui://pt/status-dashboard/control-panel.html")).toBe(true);
  });

  test("read_resource devuelve contenido markdown", async () => {
    const resources = capture();
    const resource = resources.get("pt://guide/agent-usage");
    expect(resource).toBeDefined();

    const result = await resource!.handler();

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe("pt://guide/agent-usage");
    expect(result.contents[0].mimeType).toBe("text/markdown");
    expect(result.contents[0].text).toContain("PT Control Agent Usage Guide");
    expect(result.contents[0].text).toContain("pt_status");
  });

  test("read_resource del UI devuelve HTML MCP Apps", async () => {
    const resources = capture();
    const resource = resources.get("ui://pt/status-dashboard/control-panel.html");
    expect(resource).toBeDefined();

    const result = await resource!.handler();

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe("ui://pt/status-dashboard/control-panel.html");
    expect(result.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect(result.contents[0].text).toContain("Packet Tracer Status Dashboard");
    expect(result.contents[0].text).toContain("@modelcontextprotocol/ext-apps");
  });
});
