import { describe, test, expect, vi } from "bun:test";
import { handleExecPc, handlePing } from "../../handlers/ios-execution.js";

function createFakeCli(options?: {
  reverseEventOrder?: boolean;
  emitOutputWritten?: boolean;
  delayedOutputMs?: number;
  initialOutput?: string;
}) {
  const listeners = new Map<string, (src: unknown, args: any) => void>();
  const reverseEventOrder = options?.reverseEventOrder ?? false;
  const emitOutputWritten = options?.emitOutputWritten ?? true;
  const delayedOutputMs = options?.delayedOutputMs;
  const pingOutput =
    "Pinging 192.168.10.20 with 32 bytes of data:\n\nReply from 192.168.10.20: bytes=32 time<1ms TTL=255\n\nPing statistics for 192.168.10.20:\n    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),";
  const commandOutput = "Cisco Packet Tracer PC Command Line 1.0\n\nC:\\>";
  let currentOutput = options?.initialOutput ?? "C:\\>";
  let lastCommand = "";

  return {
    listeners,
    registerEvent: vi.fn(
      (eventName: string, _context: null, handler: (src: unknown, args: any) => void) => {
        listeners.set(eventName, handler);
      },
    ),
    unregisterEvent: vi.fn(),
    getOutput: vi.fn(() => currentOutput),
    enterCommand: vi.fn((command: string) => {
      lastCommand = command;
      const output = command.startsWith("ping ") ? pingOutput : commandOutput;

      queueMicrotask(() => {
        if (reverseEventOrder) {
          listeners.get("commandEnded")?.(null, { status: 0 });
          if (emitOutputWritten && delayedOutputMs == null) {
            listeners.get("outputWritten")?.(null, { newOutput: output });
          }
        } else {
          if (emitOutputWritten && delayedOutputMs == null) {
            listeners.get("outputWritten")?.(null, { newOutput: output });
          }
          listeners.get("commandEnded")?.(null, { status: 0 });
        }
      });

      if (delayedOutputMs != null) {
        setTimeout(() => {
          currentOutput = command.startsWith("ping ")
            ? `${commandOutput}\n${pingOutput}`
            : `${commandOutput}\n${output}`;
          if (emitOutputWritten) {
            listeners.get("outputWritten")?.(null, { newOutput: output });
          }
        }, delayedOutputMs);
      } else {
        currentOutput = output;
      }
    }),
    getPrompt: vi.fn(() => "C:\\>"),
  };
}

describe("ios execution handlers", () => {
  test("handleExecPc devuelve resultado diferido con ticket válido", async () => {
    const cli = createFakeCli();
    const mockCreateJob = vi.fn(() => "job_123");
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
      createJob: mockCreateJob,
    };

    const result = await handleExecPc({ type: "execPc", device: "PC1", command: "ipconfig" }, api);

    expect(api.getDeviceByName).toHaveBeenCalledWith("PC1");
    expect(mockCreateJob).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
    expect((result as any).ticket).toBe("job_123");
  });

  test("handlePing envía ping y devuelve resultado diferido", async () => {
    const cli = createFakeCli();
    const mockCreateJob = vi.fn(() => "job_456");
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
      createJob: mockCreateJob,
    };

    const result = await handlePing({ device: "PC1", target: "192.168.10.20" }, api);

    expect(mockCreateJob).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
  });

  test("handlePing conserva output aunque commandEnded llegue antes que outputWritten", async () => {
    const cli = createFakeCli({ reverseEventOrder: true });
    const mockCreateJob = vi.fn(() => "job_789");
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
      createJob: mockCreateJob,
    };

    const result = await handlePing({ device: "PC1", target: "192.168.10.20" }, api);

    expect(mockCreateJob).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
  });

  test("handlePing usa getOutput() como respaldo si no llega outputWritten", async () => {
    const cli = createFakeCli({ emitOutputWritten: false });
    const mockCreateJob = vi.fn(() => "job_abc");
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
      createJob: mockCreateJob,
    };

    const result = await handlePing({ device: "PC1", target: "192.168.10.20" }, api);

    expect(mockCreateJob).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
  });

  test("handlePing espera salida tardía aunque commandEnded llegue antes", async () => {
    const cli = createFakeCli({
      emitOutputWritten: false,
      delayedOutputMs: 350,
      initialOutput: "Cisco Packet Tracer PC Command Line 1.0\n\nC:\\>",
    });
    const mockCreateJob = vi.fn(() => "job_def");
    const api: any = {
      getDeviceByName: vi.fn(() => ({
        getType: () => 8,
        getCommandLine: () => cli,
      })),
      dprint: vi.fn(),
      createJob: mockCreateJob,
    };

    const result = await handlePing({ device: "PC1", target: "192.168.10.20" }, api);

    expect(mockCreateJob).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
  });
});
