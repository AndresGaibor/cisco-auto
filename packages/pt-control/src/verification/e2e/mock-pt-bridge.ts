// ============================================================================
// Mock PT Bridge - Mock de PT para tests unitarios
// ============================================================================
// Bridge mock que simula el comportamiento de Packet Tracer para testing
// sin necesidad de tener PT instalado.

export interface MockDeviceState {
  name: string;
  model: string;
  type: string;
  x: number;
  y: number;
  ports: Array<{ name: string; status: string }>;
  ip?: string;
  mac: string;
}

export interface MockLinkState {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  type: string;
  status: string;
}

export interface MockTopologySnapshot {
  devices: MockDeviceState[];
  links: MockLinkState[];
  version: number;
  timestamp: number;
}

/**
 * Estado del mock bridge.
 */
export interface MockBridgeState {
  devices: Map<string, MockDeviceState>;
  links: MockLinkState[];
  nextX: number;
  nextY: number;
}

/**
 * Configuración para el mock bridge.
 */
export interface MockBridgeConfig {
  operationDelayMs?: number;
  failureRate?: number;
  ready?: boolean;
}

/**
 * Crea un estado inicial vacío para el mock.
 */
export function crearMockBridgeState(): MockBridgeState {
  return {
    devices: new Map(),
    links: [],
    nextX: 50,
    nextY: 50,
  };
}

/**
 * MockPTBridge que simula operaciones de Packet Tracer.
 */
export class MockPTBridge {
  private state: MockBridgeState;
  private config: Required<MockBridgeConfig>;
  private commandHistory: Array<{ device: string; command: string; output: string }> = [];

  constructor(state?: MockBridgeState, config?: MockBridgeConfig) {
    this.state = state ?? crearMockBridgeState();
    this.config = {
      operationDelayMs: config?.operationDelayMs ?? 100,
      failureRate: config?.failureRate ?? 0,
      ready: config?.ready ?? true,
    };
  }

  isReady(): boolean {
    return this.config.ready;
  }

  async addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<MockDeviceState> {
    await this.esperar();

    const x = options?.x ?? this.state.nextX;
    const y = options?.y ?? this.state.nextY;
    this.state.nextX += 50;
    this.state.nextY += 50;

    const device: MockDeviceState = {
      name,
      model,
      type: this.obtenerTipoDesdeModelo(model),
      x,
      y,
      ports: [],
      mac: `00:${this.randomHex()}:${this.randomHex()}:${this.randomHex()}:${this.randomHex()}:${this.randomHex()}`,
    };

    this.state.devices.set(name, device);
    return device;
  }

  async removeDevice(name: string): Promise<void> {
    await this.esperar();
    this.state.devices.delete(name);
    this.state.links = this.state.links.filter(
      (l) => l.device1 !== name && l.device2 !== name
    );
  }

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string
  ): Promise<MockLinkState> {
    await this.esperar();

    const link: MockLinkState = {
      id: `link-${device1}-${port1}-${device2}-${port2}`,
      device1,
      port1,
      device2,
      port2,
      type: "ethernet",
      status: "up",
    };

    this.state.links.push(link);
    return link;
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.esperar();
    this.state.links = this.state.links.filter(
      (l) => !(l.device1 === device && l.port1 === port) &&
             !(l.device2 === device && l.port2 === port)
    );
  }

  async configHost(
    device: string,
    options: { ip?: string; mask?: string; gateway?: string; dns?: string; dhcp?: boolean }
  ): Promise<void> {
    await this.esperar();

    const estado = this.state.devices.get(device);
    if (!estado) {
      throw new Error(`Device ${device} not found`);
    }

    if (options.ip) {
      estado.ip = options.ip;
    }
  }

  async execIos(device: string, command: string): Promise<{ raw: string }> {
    await this.esperar();

    const estado = this.state.devices.get(device);
    if (!estado) {
      throw new Error(`Device ${device} not found`);
    }

    this.commandHistory.push({ device, command, output: this.generarOutputSimulado(command) });

    return { raw: this.generarOutputSimulado(command) };
  }

  async show(device: string, command: string): Promise<{ raw: string }> {
    await this.esperar();
    return { raw: this.generarShowOutputSimulado(command, device) };
  }

  async snapshot(): Promise<MockTopologySnapshot> {
    await this.esperar();

    return {
      devices: Array.from(this.state.devices.values()),
      links: this.state.links,
      version: Date.now(),
      timestamp: Date.now(),
    };
  }

  getState(): MockBridgeState {
    return this.state;
  }

  getCommandHistory(): Array<{ device: string; command: string; output: string }> {
    return [...this.commandHistory];
  }

  reset(state?: MockBridgeState): void {
    this.state = state ?? crearMockBridgeState();
    this.commandHistory = [];
  }

  injectFailure(): void {
    if (Math.random() < this.config.failureRate) {
      throw new Error("Simulated PT failure");
    }
  }

  private async esperar(): Promise<void> {
    if (this.config.operationDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.operationDelayMs));
    }
  }

  private obtenerTipoDesdeModelo(model: string): string {
    if (model.includes("2911") || model.includes("1941") || model.includes("4331")) {
      return "router";
    }
    if (model.includes("2960") || model.includes("2950") || model.includes("3650")) {
      return "switch";
    }
    if (model.includes("PC-PT")) {
      return "pc";
    }
    if (model.includes("SERVER")) {
      return "server";
    }
    return "generic";
  }

  private randomHex(): string {
    return Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  }

  private generarOutputSimulado(command: string): string {
    if (command === "enable") {
      return "Router#";
    }
    if (command === "configure terminal") {
      return "Enter configuration commands, one per line. End with CNTL/Z.";
    }
    if (command.startsWith("hostname")) {
      return "Router(config)#";
    }
    if (command === "exit") {
      return "Router#";
    }
    if (command === "no") {
      return "Would you like to enter initial configuration dialog? [yes/no]: no";
    }
    return "Router#";
  }

  private generarShowOutputSimulado(command: string, device: string): string {
    if (command === "show vlan") {
      return `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/1, Fa0/2, Fa0/3
10   VLAN0010                         active
20   VLAN0020                         active`;
    }
    if (command === "show mac address-table") {
      return `Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
1       00xx.xxxx.xxxx     DYNAMIC     Fa0/1
1       00yy.yyyy.yyyy     DYNAMIC     Fa0/2`;
    }
    if (command === "show interfaces trunk") {
      return `Port        Mode             Encapsulation  Status        Native vlan
Gi0/1     on              802.1q         trunking      1`;
    }
    if (command === "show running-config") {
      return `Building configuration...

Current configuration : 1024 bytes
!
version 15.1
hostname Router`;
    }
    if (command === "ip config") {
      const deviceState = this.state.devices.get(device);
      return `IP Address: ${deviceState?.ip ?? "0.0.0.0"}`;
    }
    return "";
  }
}

/**
 * Ejecuta un paso E2E usando el mock bridge.
 */
export async function ejecutarPasoE2EConMock(
  step: { id: string; type: string; payload: Record<string, unknown>; timeoutMs?: number; critical?: boolean },
  bridge: MockPTBridge
): Promise<{
  stepId: string;
  outcome: "passed" | "failed" | "skipped" | "error";
  startedAt: number;
  completedAt: number;
  durationMs: number;
  evidence: Record<string, unknown>;
  error?: string;
  warnings: string[];
}> {
  const startedAt = Date.now();

  try {
    let evidence: Record<string, unknown> = {};
    let outcome: "passed" | "failed" | "skipped" | "error" = "passed";

    switch (step.type) {
      case "add-device": {
        const payload = step.payload as { name: string; model: string; x?: number; y?: number };
        await bridge.addDevice(payload.name, payload.model, { x: payload.x, y: payload.y });
        evidence.commandSent = `addDevice(${payload.name}, ${payload.model})`;
        break;
      }

      case "remove-device": {
        const payload = step.payload as { name: string };
        await bridge.removeDevice(payload.name);
        evidence.commandSent = `removeDevice(${payload.name})`;
        break;
      }

      case "add-link": {
        const payload = step.payload as {
          device1: string;
          port1: string;
          device2: string;
          port2: string;
        };
        await bridge.addLink(payload.device1, payload.port1, payload.device2, payload.port2);
        evidence.commandSent = `addLink(${payload.device1}:${payload.port1} <-> ${payload.device2}:${payload.port2})`;
        break;
      }

      case "remove-link": {
        const payload = step.payload as { device: string; port: string };
        await bridge.removeLink(payload.device, payload.port);
        evidence.commandSent = `removeLink(${payload.device}:${payload.port})`;
        break;
      }

      case "config-host": {
        const payload = step.payload as {
          device: string;
          ip?: string;
          mask?: string;
          gateway?: string;
          dns?: string;
          dhcp?: boolean;
        };
        await bridge.configHost(payload.device, {
          ip: payload.ip,
          mask: payload.mask,
          gateway: payload.gateway,
          dns: payload.dns,
          dhcp: payload.dhcp,
        });
        evidence.commandSent = `configHost(${payload.device})`;
        break;
      }

      case "config-ios": {
        const payload = step.payload as { device: string; commands: string[] };
        for (const cmd of payload.commands) {
          await bridge.execIos(payload.device, cmd);
        }
        evidence.commandSent = `configIos(${payload.device}): ${payload.commands.join("; ")}`;
        break;
      }

      case "exec-ios": {
        const payload = step.payload as {
          device: string;
          command: string;
          expectedPattern?: string;
        };
        const result = await bridge.execIos(payload.device, payload.command);
        evidence.commandSent = payload.command;
        evidence.rawOutput = result.raw;
        break;
      }

      case "show-command": {
        const payload = step.payload as { device: string; command: string };
        const result = await bridge.show(payload.device, payload.command);
        evidence.commandSent = payload.command;
        evidence.rawOutput = result.raw;
        break;
      }

      case "wait-for": {
        const payload = step.payload as { seconds: number };
        await new Promise((resolve) => setTimeout(resolve, payload.seconds * 1000));
        evidence.commandSent = `wait(${payload.seconds}s)`;
        break;
      }

      case "snapshot": {
        const snapshot = await bridge.snapshot();
        evidence.topologySnapshot = snapshot;
        evidence.commandSent = "snapshot()";
        break;
      }

      case "assert": {
        outcome = "skipped";
        break;
      }

      default:
        outcome = "skipped";
    }

    return {
      stepId: step.id,
      outcome,
      startedAt,
      completedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      evidence,
      warnings: [],
    };
  } catch (error) {
    return {
      stepId: step.id,
      outcome: "error",
      startedAt,
      completedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      evidence: {},
      error: error instanceof Error ? error.message : String(error),
      warnings: [],
    };
  }
}

/**
 * Crea un mock bridge pre-configurado para tests.
 */
export function crearMockBridgeParaTests(): MockPTBridge {
  const state = crearMockBridgeState();

  state.devices.set("R1", {
    name: "R1",
    model: "2911",
    type: "router",
    x: 100,
    y: 100,
    ports: [{ name: "Gig0/0", status: "up" }],
    mac: "00:11:22:33:44:55",
  });

  state.devices.set("S1", {
    name: "S1",
    model: "2960",
    type: "switch",
    x: 200,
    y: 100,
    ports: [{ name: "Fast0/1", status: "up" }],
    mac: "00:22:33:44:55:66",
  });

  return new MockPTBridge(state, {
    operationDelayMs: 10,
    failureRate: 0,
    ready: true,
  });
}
