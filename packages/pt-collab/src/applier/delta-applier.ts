import type { CollabDelta } from "../protocol/messages.js";

export interface PTControllerPort {
  addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  addDeviceUnchecked?(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
  removeDevice(name: string): Promise<void>;
  removeDeviceUnchecked?(name: string): Promise<void>;
  renameDevice(oldName: string, newName: string): Promise<void>;
  moveDevice(name: string, x: number, y: number): Promise<unknown>;
  moveDeviceUnchecked?(name: string, x: number, y: number): Promise<unknown>;
  addLink(device1: string, port1: string, device2: string, port2: string, linkType?: string): Promise<unknown>;
  removeLink(device: string, port: string): Promise<void>;
  configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void>;
  runTerminalPlan?(plan: any, options?: any): Promise<any>;
}

export interface DeltaApplyResult {
  ok: boolean;
  deltaId: string;
  error?: string;
}

export async function applyDelta(
  delta: CollabDelta,
  controller: PTControllerPort,
): Promise<DeltaApplyResult> {
  try {
    switch (delta.kind) {
      case "topology.device.added": {
        const p = delta.payload as { name: string; model: string; x?: number; y?: number };
        const addFn = controller.addDeviceUnchecked ?? controller.addDevice;
        await addFn.call(controller, p.name, p.model, { x: p.x, y: p.y });
        return { ok: true, deltaId: delta.id };
      }

      case "topology.device.removed": {
        const p = delta.payload as { name: string };
        const removeFn = controller.removeDeviceUnchecked ?? controller.removeDevice;
        await removeFn.call(controller, p.name);
        return { ok: true, deltaId: delta.id };
      }

      case "topology.device.moved": {
        const p = delta.payload as { name: string; toX?: number; toY?: number };
        if (p.toX !== undefined && p.toY !== undefined) {
          const moveFn = controller.moveDeviceUnchecked ?? controller.moveDevice;
          await moveFn.call(controller, p.name, p.toX, p.toY);
        }
        return { ok: true, deltaId: delta.id };
      }

      case "topology.device.renamed": {
        const p = delta.payload as { oldName: string; newName: string };
        await controller.renameDevice(p.oldName, p.newName);
        return { ok: true, deltaId: delta.id };
      }

      case "topology.link.created": {
        const p = delta.payload as {
          device1: string; port1: string;
          device2: string; port2: string;
          cableType?: string;
        };
        await controller.addLink(p.device1, p.port1, p.device2, p.port2, p.cableType);
        return { ok: true, deltaId: delta.id };
      }

      case "topology.link.deleted": {
        const p = delta.payload as { id: string };
        const scope = delta.scope as string;
        const linkParts = scope.replace("link:", "").split(":");
        if (linkParts.length >= 2) {
          await controller.removeLink(linkParts[0]!, linkParts[1]!);
        }
        return { ok: true, deltaId: delta.id };
      }

      case "device.cli.runningConfig.changed": {
        const p = delta.payload as { device: string; configLines?: string[] };
        if (p.configLines?.length) {
          if (typeof (controller as any).runTerminalPlan === "function") {
            const steps = p.configLines.map(cmd => ({
              kind: "command" as const,
              command: cmd,
              allowPager: true,
              allowConfirm: true,
            }));
            const plan = {
              id: "sync_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
              deviceName: p.device,
              targetMode: undefined as any,
              steps,
              timeouts: {
                commandTimeoutMs: 15000,
                stallTimeoutMs: 30000,
              },
              policies: {
                autoBreakWizard: true,
                autoAdvancePager: true,
                maxPagerAdvances: 50,
                maxConfirmations: 3,
                abortOnPromptMismatch: false,
                abortOnModeMismatch: false,
              }
            };
            await (controller as any).runTerminalPlan(plan);
          } else {
            await controller.configIos(p.device, p.configLines);
          }
        }
        return { ok: true, deltaId: delta.id };
      }

      default:
        return { ok: true, deltaId: delta.id };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, deltaId: delta.id, error: msg };
  }
}
