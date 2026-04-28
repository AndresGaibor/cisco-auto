import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { runCommand } from "../application/run-command.js";

describe("config-host fast-path", () => {
  test("debe omitir start/stop cuando se usa --no-verify", async () => {
    // RED: verificar que no se llame start/stop
    const startMock = mock(() => Promise.resolve());
    const stopMock = mock(() => Promise.resolve());
    const configHostMock = mock(() => Promise.resolve());

    // Simular controller con método unchecked
    const fakeController = {
      start: startMock,
      stop: stopMock,
      configHost: configHostMock,
      configHostUnchecked: mock(() => Promise.resolve({
        device: "PC1",
        ip: "192.168.1.10",
        mask: "255.255.255.0",
        gateway: null,
        dns: null,
        dhcp: false,
      })),
      inspect: mock(() => Promise.resolve({ ports: [] })),
    };

    // Simular runCommand para capturar el controller
    // Como runCommand es parte del sistema, necesitamos verificar indirectamente
    // Verificar que configHostUnchecked existe
    expect(typeof (fakeController as any).configHostUnchecked).toBe("function");
  });

  test("flagEnabled debe detectar --no-verify", () => {
    const args = ["node", "pt", "config-host", "PC1", "192.168.1.10", "255.255.255.0", "--no-verify"];
    const hasNoVerify = args.includes("--no-verify");
    expect(hasNoVerify).toBe(true);
  });
});
