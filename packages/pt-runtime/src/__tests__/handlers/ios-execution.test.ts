import { describe, test, expect, vi } from "bun:test";
import { handleExecPc, handlePing } from "../../handlers/ios-execution.js";

function createFakeCli() {
  const listeners = new Map<string, (src: unknown, args: any) => void>();

  return {
    listeners,
    registerEvent: vi.fn(
      (eventName: string, _context: null, handler: (src: unknown, args: any) => void) => {
        listeners.set(eventName, handler);
      },
    ),
    unregisterEvent: vi.fn(),
    enterCommand: vi.fn((command: string) => {
      queueMicrotask(() => {
        const output = command.startsWith("ping ")
          ? "Pinging 192.168.10.20 with 32 bytes of data:\n\nReply from 192.168.10.20: bytes=32 time<1ms TTL=255\n\nPing statistics for 192.168.10.20:\n    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),"
          : "Cisco Packet Tracer PC Command Line 1.0\n\nC:\\>";

        listeners.get("outputWritten")?.(null, { newOutput: output });
        listeners.get("commandEnded")?.(null, { status: 0 });
      });
    }),
    getPrompt: vi.fn(() => "C:\\>"),
  };
}

describe("ios execution handlers", () => {
  test("handleExecPc devuelve el output real del Command Prompt", async () => {
    const cli = createFakeCli();
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
    };

    const result = await handleExecPc({ type: "execPc", device: "PC1", command: "ipconfig" }, api);

    expect(api.getDeviceByName).toHaveBeenCalledWith("PC1");
    expect(cli.enterCommand).toHaveBeenCalledWith("ipconfig");
    expect(result.ok).toBe(true);
    expect((result as any).raw).toContain("Cisco Packet Tracer PC Command Line 1.0");
    expect((result as any).value.raw).toContain("Cisco Packet Tracer PC Command Line 1.0");
  });

  test("handlePing envía ping y devuelve el output real", async () => {
    const cli = createFakeCli();
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
    };

    const result = await handlePing({ device: "PC1", target: "192.168.10.20" }, api);

    expect(cli.enterCommand).toHaveBeenCalledWith("ping 192.168.10.20");
    expect(result.ok).toBe(true);
    expect((result as any).raw).toContain("Ping statistics for 192.168.10.20");
  });
});
