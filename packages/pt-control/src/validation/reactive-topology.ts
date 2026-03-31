// ============================================================================
// Reactive Topology - Automatic Validation on Topology Changes
// ============================================================================
//
// ReactiveTopology wraps VirtualTopology and automatically runs validation
// when the topology changes. This provides real-time feedback on configuration
// issues as the user builds their network.
//
// Issue #10 implementation

import { VirtualTopology } from "../vdom/index.js";
import { ValidationEngine } from "./validation-engine.js";
import type { TopologySnapshot, TopologyDelta } from "../contracts/snapshots.js";
import type { PTEvent } from "../contracts/events.js";
import type { ValidationContext, MutationKind } from "./validation-context.js";
import type { Diagnostic } from "./diagnostic.js";
import type { ValidationPolicy } from "./policies.js";
import type { Rule } from "./rule.js";

export interface ReactiveTopologyOptions {
  /** Auto-validate on every topology change (default: true) */
  autoValidate?: boolean;
  /** Validation policy to use */
  policy: ValidationPolicy;
  /** Rules to validate against */
  rules?: Rule[];
  /** Debounce time in ms for validation (default: 100ms) */
  debounceMs?: number;
}

export interface ReactiveValidationResult {
  diagnostics: Diagnostic[];
  blocked: boolean;
  timestamp: number;
  delta: TopologyDelta;
}

export type ChangeListener = (result: ReactiveValidationResult) => void;

/**
 * ReactiveTopology provides automatic validation when topology changes.
 * 
 * Usage:
 * ```typescript
 * const reactive = new ReactiveTopology(topology, {
 *   policy: strictPolicy,
 *   rules: defaultRules,
 *   autoValidate: true,
 * });
 * 
 * reactive.onChange((result) => {
 *   if (result.diagnostics.length > 0) {
 *     console.warn("Validation issues:", result.diagnostics);
 *   }
 * });
 * 
 * // Apply events - validation runs automatically
 * reactive.applyEvent(ptEvent);
 * ```
 */
export class ReactiveTopology {
  private topology: VirtualTopology;
  private engine: ValidationEngine | null = null;
  private options: Required<ReactiveTopologyOptions>;
  private listeners: Set<ChangeListener> = new Set();
  private unsubscribeTopology?: () => void;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastValidation: ReactiveValidationResult | null = null;
  private enabled: boolean = true;

  constructor(
    topology: VirtualTopology | TopologySnapshot,
    options: ReactiveTopologyOptions
  ) {
    this.topology = topology instanceof VirtualTopology 
      ? topology 
      : new VirtualTopology(topology);
    
    this.options = {
      autoValidate: options.autoValidate ?? true,
      policy: options.policy,
      debounceMs: options.debounceMs ?? 100,
      rules: options.rules ?? [],
    };

    // Initialize validation engine if rules provided
    if (this.options.rules.length > 0) {
      this.engine = new ValidationEngine(this.options.rules, this.options.policy);
    }

    // Subscribe to topology changes
    this.subscribeToTopology();
  }

  /**
   * Subscribe to VirtualTopology changes
   */
  private subscribeToTopology(): void {
    if (!(this.topology instanceof VirtualTopology)) return;

    this.unsubscribeTopology = this.topology.onChange((delta) => {
      if (!this.enabled || !this.options.autoValidate) return;
      
      // Debounce validation
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.runValidation(delta);
      }, this.options.debounceMs);
    });
  }

  /**
   * Run validation on current topology state
   */
  private runValidation(delta: TopologyDelta): void {
    if (!this.engine) {
      this.lastValidation = {
        diagnostics: [],
        blocked: false,
        timestamp: Date.now(),
        delta,
      };
      this.notifyListeners(this.lastValidation);
      return;
    }

    // Invalidate engine cache (topology changed)
    this.engine.invalidateCache();

    // Create validation context from current topology
    const snapshot = this.topology.getSnapshot();
    const twin = this.topology.toNetworkTwin() as any; // Type assertion for compatibility
    
    // Run validation for each changed device
    const allDiagnostics: Diagnostic[] = [];
    let blocked = false;

    // Validate device changes
    for (const deviceDelta of delta.devices || []) {
      if (deviceDelta.op === "add" || deviceDelta.op === "update") {
        const ctx: ValidationContext = {
          twin,
          mutation: {
            kind: "generic" as MutationKind,
            targetDevice: deviceDelta.op === "add" 
              ? deviceDelta.device.name 
              : deviceDelta.name,
            input: deviceDelta.op === "add" ? deviceDelta.device : deviceDelta.changes,
          },
          phase: "postflight",
        };

        const result = this.engine.run(ctx);
        allDiagnostics.push(...result.diagnostics);
        if (result.blocked) blocked = true;
      }
    }

    this.lastValidation = {
      diagnostics: allDiagnostics,
      blocked,
      timestamp: Date.now(),
      delta,
    };

    this.notifyListeners(this.lastValidation);
  }

  /**
   * Register a listener for validation results
   */
  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of validation result
   */
  private notifyListeners(result: ReactiveValidationResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (error) {
        console.error("[ReactiveTopology] Listener error:", error);
      }
    }
  }

  /**
   * Apply a PT event and trigger validation
   */
  applyEvent(event: PTEvent): void {
    if (!(this.topology instanceof VirtualTopology)) {
      throw new Error("Cannot applyEvent: topology is not a VirtualTopology instance");
    }
    this.topology.applyEvent(event);
  }

  /**
   * Get current validation result
   */
  getLastValidation(): ReactiveValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Get current topology snapshot
   */
  getSnapshot(): TopologySnapshot {
    return this.topology.getSnapshot();
  }

  /**
   * Get VirtualTopology instance
   */
  getTopology(): VirtualTopology {
    return this.topology;
  }

  /**
   * Add a rule dynamically
   */
  addRule(rule: Rule): void {
    if (!this.engine) {
      this.engine = new ValidationEngine([rule], this.options.policy);
    } else {
      this.engine.addRule(rule);
    }
  }

  /**
   * Remove a rule dynamically
   */
  removeRule(ruleId: string): void {
    this.engine?.removeRule(ruleId);
  }

  /**
   * Enable/disable auto-validation
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Manually trigger validation
   */
  validateNow(): ReactiveValidationResult | null {
    if (!(this.topology instanceof VirtualTopology)) return null;
    
    const snapshot = this.topology.getSnapshot();
    const twin = this.topology.toNetworkTwin();
    
    // Create a synthetic delta for full validation
    const delta: TopologyDelta = {
      from: snapshot.timestamp - 1,
      to: snapshot.timestamp,
      devices: Object.values(snapshot.devices).map(device => ({
        op: "add" as const,
        device,
      })),
      links: Object.values(snapshot.links || {}).map(link => ({
        op: "add" as const,
        link,
      })),
    };

    this.runValidation(delta);
    return this.lastValidation;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.unsubscribeTopology) {
      this.unsubscribeTopology();
      this.unsubscribeTopology = undefined;
    }
    
    this.listeners.clear();
    this.engine = null;
  }
}

/**
 * Factory function to create ReactiveTopology
 */
export function createReactiveTopology(
  topology: VirtualTopology | TopologySnapshot,
  options: ReactiveTopologyOptions
): ReactiveTopology {
  return new ReactiveTopology(topology, options);
}
