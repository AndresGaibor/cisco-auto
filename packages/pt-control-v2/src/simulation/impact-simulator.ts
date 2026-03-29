import type { NetworkTwin } from "../contracts/twin-types.js";
import type { Diagnostic } from "../validation/diagnostic.js";
import { SandboxTwin, type SandboxMutation, type TwinDiff } from "./sandbox-twin.js";

export class ImpactSimulator {
  constructor(private twin: NetworkTwin) {}

  /**
   * Simulate a mutation and return an ImpactReport.
   * The report shows what would change, what issues would arise, and risk level.
   */
  simulate(mutation: SandboxMutation): ImpactReport {
    const sandbox = new SandboxTwin(this.twin);
    sandbox.applyMutation(mutation);
    const diff = sandbox.getDiff();

    // Compute affected devices (the mutated device + any devices sharing the same subnet)
    const affectedDevices = this.findAffectedDevices(mutation, diff);

    // Check for potential issues (simplified)
    const potentialIssues = this.detectPotentialIssues(mutation, diff);

    // Calculate risk
    const risk = this.calculateRisk(mutation, affectedDevices, potentialIssues);

    return {
      mutation,
      affectedDevices,
      changedDevices: diff.changedDevices,
      potentialIssues,
      risk,
      beforeTwin: diff.before,
      afterTwin: diff.after,
    };
  }

  private findAffectedDevices(mutation: SandboxMutation, diff: TwinDiff): string[] {
    const affected = new Set<string>();

    // The device being modified is always affected
    affected.add(mutation.device);

    // For IP assignments, find devices in the same subnet
    if (mutation.type === "assign-ip" && mutation.ip) {
      for (const [name, device] of Object.entries(this.twin.devices)) {
        if (name === mutation.device) continue;
        for (const [, port] of Object.entries(device.ports)) {
          if (port.ipAddress && mutation.mask) {
            // Very simplified — in reality would use proper subnet math
            if (port.ipAddress.split(".").slice(0, 3).join(".") ===
                mutation.ip.split(".").slice(0, 3).join(".")) {
              affected.add(name);
            }
          }
        }
      }
    }

    return Array.from(affected);
  }

  private detectPotentialIssues(mutation: SandboxMutation, diff: TwinDiff): Diagnostic[] {
    const issues: Diagnostic[] = [];

    if (mutation.type === "assign-ip") {
      // Check for duplicate IP
      if (mutation.ip) {
        for (const [, device] of Object.entries(diff.after.devices)) {
          for (const [, port] of Object.entries(device.ports)) {
            if (port.ipAddress === mutation.ip && mutation.device !== device.name) {
              issues.push({
                code: "DUPLICATE_IP",
                severity: "error",
                blocking: true,
                message: `Duplicate IP ${mutation.ip} would be assigned`,
                target: { device: mutation.device },
              });
            }
          }
        }
      }
    }

    if (mutation.type === "set-port-down") {
      issues.push({
        code: "PORT_GOING_DOWN",
        severity: "warning",
        blocking: false,
        message: `Port ${mutation.port} on ${mutation.device} would go down`,
        target: { device: mutation.device, interface: mutation.port },
      });
    }

    return issues;
  }

  private calculateRisk(
    mutation: SandboxMutation,
    affectedDevices: string[],
    potentialIssues: Diagnostic[]
  ): "low" | "medium" | "high" {
    if (potentialIssues.some((i) => i.severity === "error")) return "high";
    if (potentialIssues.some((i) => i.severity === "warning")) return "medium";
    if (affectedDevices.length > 3) return "medium";
    return "low";
  }
}

export interface ImpactReport {
  mutation: SandboxMutation;
  affectedDevices: string[];
  changedDevices: string[];
  potentialIssues: Diagnostic[];
  risk: "low" | "medium" | "high";
  beforeTwin: NetworkTwin;
  afterTwin: NetworkTwin;
}
