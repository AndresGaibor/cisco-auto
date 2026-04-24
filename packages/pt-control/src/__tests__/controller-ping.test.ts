import { describe, it, expect, vi, beforeEach } from "vitest";
import { PTController } from "../controller/index.js";

describe("PTController.sendPing", () => {
  let mockComposition: any;
  let controller: PTController;

  beforeEach(() => {
    mockComposition = {
      terminalPort: {
        runTerminalPlan: vi.fn(),
      },
      deviceService: {
        inspect: vi.fn(),
      }
    };
    controller = new PTController(mockComposition);
  });

  it("debe retornar éxito y estadísticas cuando el ping es exitoso", async () => {
    // Simular que execHost (que llama a runTerminalPlan) devuelve éxito
    // Mockeamos el método privado o la cadena de llamadas
    // Para simplificar, mockeamos runTerminalPlan ya que execHost lo usa
    mockComposition.terminalPort.runTerminalPlan.mockResolvedValue({
      ok: true,
      status: 0,
      output: `
        Pinging 192.168.1.1 with 32 bytes of data:
        Reply from 192.168.1.1: bytes=32 time<1ms TTL=255
        
        Ping statistics for 192.168.1.1:
            Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
      `,
      events: []
    });

    // Nota: sendPing llama a execHost, que internamente usa parsers/verifiers
    // En este test de integración de "caja negra" del controlador, verificamos el contrato de sendPing
    const result = await controller.sendPing("PC1", "192.168.1.1");

    expect(result.success).toBe(true);
    expect(result.raw).toContain("Ping statistics");
    expect(result.stats?.sent).toBe(4);
    expect(result.stats?.lossPercent).toBe(0);
  });

  it("debe retornar fallo cuando hay 100% de pérdida", async () => {
    mockComposition.terminalPort.runTerminalPlan.mockResolvedValue({
      ok: true,
      status: 0,
      output: `
        Pinging 10.0.0.1 with 32 bytes of data:
        Request timed out.
        
        Ping statistics for 10.0.0.1:
            Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),
      `,
      events: []
    });

    const result = await controller.sendPing("PC1", "10.0.0.1");

    expect(result.success).toBe(false);
    expect(result.stats?.lossPercent).toBe(100);
  });
});
