import type { BackpressureManager } from "../backpressure-manager.js";
import type { BridgeLifecycle } from "./bridge-lifecycle.js";
import type { BridgeDiagnostics } from "./diagnostics.js";
import type { LeaseManager } from "./lease-manager.js";

export interface BridgeStatusSnapshot {
  ready: boolean;
  state: string;
  leaseValid?: boolean;
  queuedCount?: number;
  inFlightCount?: number;
  queueIndexDrift?: boolean;
  claimMode?: "atomic-move" | "copy-delete" | "unknown" | string;
  warnings?: string[];
}

export interface BridgeStatusServiceDeps {
  lifecycle: BridgeLifecycle;
  leaseManager: LeaseManager;
  backpressure: BackpressureManager;
  diagnostics: BridgeDiagnostics;
  isReady: () => boolean;
}

export class BridgeStatusService {
  constructor(private readonly deps: BridgeStatusServiceDeps) {}

  getBridgeStatus(): BridgeStatusSnapshot {
    const warnings: string[] = [];
    const ready = this.deps.isReady();

    if (!this.deps.leaseManager.hasValidLease()) {
      warnings.push("No valid lease held");
    }

    if (this.deps.lifecycle.state !== "running") {
      warnings.push(`Lifecycle state is ${this.deps.lifecycle.state}, not running`);
    }

    let queuedCount = 0;
    let inFlightCount = 0;

    try {
      const stats = this.deps.backpressure.getDetailedStats();
      queuedCount = stats.queuedCount;
      inFlightCount = stats.inFlightCount;
    } catch {
      warnings.push("No se pudo leer el estado de la cola");
    }

    let queueIndexDrift = false;

    try {
      const health = this.deps.diagnostics.collectHealth();
      queueIndexDrift = health.queues.queueIndexDrift;

      if (queueIndexDrift) {
        warnings.push(
          `Queue index drift detected (missing=${health.queues.queueIndexMissingEntries}, extra=${health.queues.queueIndexExtraEntries})`,
        );
      }
    } catch {
      warnings.push("No se pudo leer el estado de cola index");
    }

    return {
      ready,
      state: this.deps.lifecycle.state,
      leaseValid: this.deps.leaseManager.isLeaseValid(),
      queuedCount,
      inFlightCount,
      queueIndexDrift,
      claimMode: "unknown",
      warnings,
    };
  }
}