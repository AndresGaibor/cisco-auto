import { describe, expect, test } from "bun:test";
import { PacketTracerProcessService } from "./packet-tracer-process-service.js";
import type { HostProcessPort, SpawnResult } from "../ports/host-process.port.js";

describe("PacketTracerProcessService", () => {
  test("launch construye comando open -a para macOS", async () => {
    const calls: Array<{ command: string; argv: string[] }> = [];
    const mockPort: HostProcessPort = {
      platform: () => "darwin",
      spawn: async (command, argv) => {
        calls.push({ command, argv });
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    };
    const service = new PacketTracerProcessService(mockPort);
    await service.launch("/Applications/Cisco Packet Tracer 9.0.0.app", "/tmp/lab.pkt");
    expect(calls[0].command).toBe("open");
    expect(calls[0].argv).toContain("-a");
    expect(calls[0].argv).toContain("/Applications/Cisco Packet Tracer 9.0.0.app");
  });

  test("launch construye comando start para Windows", async () => {
    const calls: Array<{ command: string; argv: string[] }> = [];
    const mockPort: HostProcessPort = {
      platform: () => "win32",
      spawn: async (command, argv) => {
        calls.push({ command, argv });
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    };
    const service = new PacketTracerProcessService(mockPort);
    await service.launch("C:\\Program Files\\PT\\PacketTracer.exe", "D:\\labs\\lab.pkt");
    expect(calls[0].command).toBe("powershell");
    expect(calls[0].argv.join(" ")).toContain("Start-Process");
  });

  test("close graceful usa osascript en macOS", async () => {
    const calls: Array<{ command: string; argv: string[] }> = [];
    const mockPort: HostProcessPort = {
      platform: () => "darwin",
      spawn: async (command, argv) => {
        calls.push({ command, argv });
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    };
    const service = new PacketTracerProcessService(mockPort);
    await service.closeGraceful("Cisco Packet Tracer");
    expect(calls[0].command).toBe("osascript");
    expect(calls[0].argv.join(" ")).toContain('tell application');
  });

  test("close force usa pkill en macOS", async () => {
    const calls: Array<{ command: string; argv: string[] }> = [];
    const mockPort: HostProcessPort = {
      platform: () => "darwin",
      spawn: async (command, argv) => {
        calls.push({ command, argv });
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    };
    const service = new PacketTracerProcessService(mockPort);
    await service.closeForce("Cisco Packet Tracer");
    expect(calls[0].command).toBe("pkill");
    expect(calls[0].argv).toContain("-9");
    expect(calls[0].argv).toContain("-f");
  });

  test("close force usa Stop-Process en Windows", async () => {
    const calls: Array<{ command: string; argv: string[] }> = [];
    const mockPort: HostProcessPort = {
      platform: () => "win32",
      spawn: async (command, argv) => {
        calls.push({ command, argv });
        return { ok: true, stdout: "", stderr: "", exitCode: 0 };
      },
    };
    const service = new PacketTracerProcessService(mockPort);
    await service.closeForce("PacketTracer");
    expect(calls[0].command).toBe("powershell");
    expect(calls[0].argv.join(" ")).toContain("Stop-Process");
  });
});