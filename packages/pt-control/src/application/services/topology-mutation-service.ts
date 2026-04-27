import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { CableType, DeviceState, LinkState, TopologySnapshot } from "@cisco-auto/types";
import { validatePTModel } from "../../shared/utils/helpers.js";

export class TopologyMutationService {
  constructor(
    private primitivePort: RuntimePrimitivePort,
    private generateId: () => string,
    private getDeviceState: (deviceName: string) => DeviceState | undefined,
  ) {}

  async addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<DeviceState> {
    const validatedModel = validatePTModel(model);
    const result = await this.primitivePort.runPrimitive("device.add", {
      name,
      model: validatedModel,
      x: options?.x ?? 100,
      y: options?.y ?? 100,
    });

    if (!result.ok) {
      throw new Error(result.error ?? `Failed to add device '${name}'`);
    }

    const value = result.value as {
      name: string;
      model: string;
      type: string;
      power: boolean;
      x: number;
      y: number;
      ports: unknown[];
    };

    return {
      name: value.name,
      model: value.model,
      type: value.type as DeviceState["type"],
      power: value.power,
      x: value.x,
      y: value.y,
      ports: value.ports as DeviceState["ports"],
    };
  }

  async removeDevice(name: string): Promise<void> {
    const result = await this.primitivePort.runPrimitive("device.remove", { name });
    if (!result.ok) {
      throw new Error(result.error ?? `Failed to remove device '${name}'`);
    }
  }

  async renameDevice(oldName: string, newName: string): Promise<void> {
    const result = await this.primitivePort.runPrimitive("device.rename", {
      oldName,
      newName,
    });
    if (!result.ok) {
      throw new Error(result.error ?? `Failed to rename device from '${oldName}' to '${newName}'`);
    }
  }

  async moveDevice(
    name: string,
    x: number,
    y: number,
  ): Promise<
    { ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }
  > {
    const result = await this.primitivePort.runPrimitive("device.move", { name, x, y });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Unknown error", code: result.code ?? "UNKNOWN" };
    }
    const value = result.value as { name: string; x: number; y: number };
    return { ok: true, name: value.name, x: value.x, y: value.y };
  }

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: CableType = "auto",
  ): Promise<LinkState> {
    // Las validaciones de puerto aquí pueden ser demasiado estrictas si el catálogo no está al día.
    // Dejamos que el motor de Packet Tracer (runtime) maneje la validación real.

    const result = await this.primitivePort.runPrimitive("link.add", {
      type: "addLink",
      device1,
      port1,
      device2,
      port2,
      linkType,
      cableType: linkType,
      strictPorts: true,
      allowAutoFallback: false,
      replaceExisting: false,
    });

    if (!result.ok) {
      throw new Error(
        result.error ?? `Failed to add link between ${device1}:${port1} and ${device2}:${port2}`,
      );
    }

    const value = result.value as {
      id: string;
      device1: string;
      port1: string;
      device2: string;
      port2: string;
      cableType: string;
    };

    return {
      id: value.id,
      device1: value.device1,
      port1: value.port1,
      device2: value.device2,
      port2: value.port2,
      cableType: value.cableType as LinkState["cableType"],
    };
  }

  async removeLink(device: string, port: string): Promise<void> {
    const result = await this.primitivePort.runPrimitive("link.remove", { device, port });
    if (!result.ok) {
      throw new Error(result.error ?? `Failed to remove link from ${device}:${port}`);
    }
  }

  async clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }> {
    let removedDevices = 0;
    let removedLinks = 0;

    for (let pass = 0; pass < 5; pass++) {
      const snapshotResult = await this.primitivePort.runPrimitive("topology.snapshot", {});
      const snapshot = snapshotResult.value as TopologySnapshot | undefined;
      const linkEntries = Object.values(snapshot?.links ?? {}) as LinkState[];
      const deviceEntries = Object.values(snapshot?.devices ?? {}) as DeviceState[];
      const deviceNames = deviceEntries.map((d) => d.name).filter(Boolean) as string[];

      if (linkEntries.length === 0 && deviceNames.length === 0) {
        return { removedDevices, removedLinks, remainingDevices: 0, remainingLinks: 0 };
      }

      for (const link of linkEntries) {
        try {
          await this.removeLink(link.device1, link.port1);
          removedLinks += 1;
        } catch {
          try {
            await this.removeLink(link.device2, link.port2);
            removedLinks += 1;
          } catch {
            // Enlace no se pudo remover, puede haber sido eliminado en pase anterior
          }
        }
      }

      for (const name of deviceNames) {
        try {
          await this.removeDevice(name);
          removedDevices += 1;
        } catch {
          // Dispositivo no se pudo remover, puede haber sido eliminado en pase anterior
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

      const afterResult = await this.primitivePort.runPrimitive("topology.snapshot", {});
      const afterSnapshot = afterResult.value as TopologySnapshot | undefined;
      const remainingDevices = Object.keys(afterSnapshot?.devices ?? {}).length;
      const remainingLinks = Object.keys(afterSnapshot?.links ?? {}).length;

      if (remainingDevices === 0 && remainingLinks === 0) {
        return { removedDevices, removedLinks, remainingDevices: 0, remainingLinks: 0 };
      }
    }

    const finalResult = await this.primitivePort.runPrimitive("topology.snapshot", {});
    const finalSnapshot = finalResult.value as TopologySnapshot | undefined;
    const remainingDevices = Object.keys(finalSnapshot?.devices ?? {}).length;
    const remainingLinks = Object.keys(finalSnapshot?.links ?? {}).length;

    return {
      removedDevices,
      removedLinks,
      remainingDevices,
      remainingLinks,
    };
  }
}
