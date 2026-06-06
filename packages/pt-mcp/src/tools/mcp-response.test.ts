import { describe, expect, test } from "bun:test";

import { instructivo } from "./mcp-response.js";

describe("instructivo", () => {
  test("agrega guía de VLAN y routing cuando hay switches y routers", () => {
    const result = instructivo("pt_device op=list", {
      action: "device.list",
      devices: [
        { name: "Switch0", type: "switch" },
        { name: "Router1", type: "router" },
      ],
      count: 2,
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("VLAN");
    expect(text).toContain("routing");
    expect(text).toContain("pt_device op=get device=\"Switch0\"");
  });

  test("recomienda doctor cuando el estado no está listo", () => {
    const result = instructivo("pt_status op=summary", {
      action: "status.summary",
      warnings: [{ code: "PT_RUNTIME_MISSING", severity: "error", message: "runtime missing", actionable: true }],
      nextActions: ["start runtime"],
      reconciled: {
        commandReady: false,
        topologyUsable: false,
        projectReady: false,
        inventoryDeviceCount: 0,
      },
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("pt_status op=doctor");
    expect(text).toContain("runtime");
  });

  test("interpreta familias de comandos en cmd.run", () => {
    const result = instructivo("pt_cmd_run", {
      action: "cmd.run",
      jobCount: 1,
      failedCount: 0,
      results: [
        {
          device: "Switch0",
          commands: ["show vlan brief", "show interfaces trunk"],
          result: {
            command: "show vlan brief",
            action: "ios.exec",
          },
        },
      ],
      queue: {},
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("show interfaces trunk");
    expect(text).toContain("show spanning-tree");
  });

  test("guía app.open y app.restart con pasos de seguridad", () => {
    const result = instructivo("pt_app", {
      action: "app.open",
      path: "/labs/rediseno.pkt",
      result: { ok: true },
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("pt_project op=status");
    expect(text).toContain("pt_status op=summary");
  });

  test("guía project.open y project.recover con validación posterior", () => {
    const result = instructivo("pt_project", {
      action: "project.open",
      path: "/labs/core.pkt",
      result: { ok: true },
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("pt_status op=summary");
    expect(text).toContain("pt_device op=list");
  });

  test("guía omni.raw con advertencia de uso avanzado", () => {
    const result = instructivo("pt_omni", {
      action: "omni.raw",
      result: { ok: true, output: "done" },
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("pt_cmd_run");
    expect(text).toContain("diagnóstico");
  });

  test("guía cmd.queue.status para limpieza de cola", () => {
    const result = instructivo("pt_cmd_queue", {
      action: "cmd.queue.status",
      queue: { pending: 1, running: 0, done: 3, failed: 0 },
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("cola");
    expect(text).toContain("pt_cmd_run");
  });

  test("reacciona a warnings concretos de cmd.run", () => {
    const result = instructivo("pt_cmd_run", {
      action: "cmd.run",
      jobCount: 1,
      failedCount: 0,
      warnings: [
        { code: "CMD_SLOW_SUCCESS", severity: "info", message: "slow", actionable: true },
        { code: "PT_TERMINAL_BRIDGE_TIMEOUT", severity: "warning", message: "bridge", actionable: true },
      ],
      results: [
        {
          device: "Switch0",
          commands: ["show vlan brief"],
          result: { command: "show vlan brief", action: "ios.exec" },
        },
      ],
      queue: {},
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("lento");
    expect(text).toContain("bridge");
    expect(text).toContain("profile=\"debug\"");
  });

  test("guía pt_cli hacia tools directas", () => {
    const result = instructivo("pt_cli", {
      action: "legacy.cli",
      argv: ["status", "--json"],
      ok: true,
    });

    const text = result.content[0]?.text ?? "";
    expect(text).toContain("pt_status");
    expect(text).toContain("legacy");
  });
});
