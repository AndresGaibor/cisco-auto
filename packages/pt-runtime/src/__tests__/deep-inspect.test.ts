import { expect, test, describe } from "bun:test";
import { handleDeepInspect } from "../handlers/deep-inspect.js";

describe("Deep Inspect Logic Test", () => {
  // Simulación de la API de Packet Tracer (Mock)
  const mockIpc = {
    network: () => ({
      getDevice: (name: string) => ({
        getName: () => name,
        getClassName: () => "Router",
        getPortAt: (index: number) => ({
          getName: () => `GigabitEthernet0/${index}`,
          getLightStatus: () => 1,
          getClassName: () => "RouterPort",
        }),
      }),
      getClassName: () => "Network",
    }),
    simulation: () => ({
      isSimulationMode: () => true,
      setSimulationMode: (val: boolean) => val,
      getClassName: () => "Simulation",
    }),
    getClassName: () => "IPC",
  };

  const deps = {
    getIpc: () => mockIpc as any,
    getNet: () => mockIpc.network() as any,
  } as any;

  test("debe resolver un objeto global (ipc)", () => {
    const result = handleDeepInspect({ type: "deepInspect", path: "ipc" }, deps);
    expect(result.ok).toBe(true);
    expect((result as any).className).toBe("IPC");
  });

  test("debe navegar por una ruta compleja y obtener un valor real", () => {
    const result = handleDeepInspect(
      {
        type: "deepInspect",
        path: "network().getDevice('Router0').getPortAt(0)",
        method: "getLightStatus",
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect((result as any).result).toBe(1); // Valor del mock
  });

  test("debe ejecutar un método con argumentos booleanos", () => {
    const result = handleDeepInspect(
      {
        type: "deepInspect",
        path: "simulation()",
        method: "setSimulationMode",
        args: [true],
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect((result as any).result).toBe(true);
  });

  test("debe fallar elegantemente si el path no existe", () => {
    const result = handleDeepInspect(
      {
        type: "deepInspect",
        path: "network().getUnknownDevice()",
      },
      deps,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("PATH_NOT_RESOLVED");
  });
});
