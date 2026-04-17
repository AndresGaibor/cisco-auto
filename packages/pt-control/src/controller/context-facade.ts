import type {
  ControllerContextSummary,
  ControllerHealthSummary,
  ControllerSystemContext,
} from "./context-service.js";
import type { ControllerContextService } from "./context-service.js";

export class ContextFacade {
  constructor(private readonly contextService: ControllerContextService) {}

  getContextSummary(): ControllerContextSummary {
    return this.contextService.getContextSummary();
  }

  async getHealthSummary(): Promise<ControllerHealthSummary> {
    return this.contextService.getHealthSummary();
  }

  getHeartbeat<T>(): T | null {
    return this.contextService.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.contextService.getHeartbeatHealth();
  }

  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this.contextService.getBridgeStatus();
  }

  getSystemContext(): ControllerSystemContext {
    return this.contextService.getSystemContext();
  }
}
