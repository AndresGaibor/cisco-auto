// ============================================================================
// Registry Builder - Core registry Map and query API
// ============================================================================

import type { CapabilitySpec, CapabilityDomain, CapabilityKind, CapabilityRisk } from "./capability-types.js";

const CAPABILITY_REGISTRY: Map<string, CapabilitySpec> = new Map();

export function register(spec: CapabilitySpec): void {
  if (CAPABILITY_REGISTRY.has(spec.id)) {
    throw new Error(`Capability ID duplicado: ${spec.id}`);
  }
  CAPABILITY_REGISTRY.set(spec.id, spec);
}

export function getCapability(id: string): CapabilitySpec | undefined {
  return CAPABILITY_REGISTRY.get(id);
}

export function listCapabilities(): CapabilitySpec[] {
  return Array.from(CAPABILITY_REGISTRY.values());
}

export function filterCapabilities(options: {
  domain?: CapabilityDomain;
  kind?: CapabilityKind;
  risk?: CapabilityRisk;
}): CapabilitySpec[] {
  let result = Array.from(CAPABILITY_REGISTRY.values());

  if (options.domain) {
    result = result.filter((c) => c.domain === options.domain);
  }
  if (options.kind) {
    result = result.filter((c) => c.kind === options.kind);
  }
  if (options.risk) {
    result = result.filter((c) => c.risk === options.risk);
  }

  return result;
}

export function capabilityExists(id: string): boolean {
  return CAPABILITY_REGISTRY.has(id);
}

export function getRegistrySize(): number {
  return CAPABILITY_REGISTRY.size;
}