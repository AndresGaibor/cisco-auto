// ============================================================================
// Registry Index - Import and register all capabilities
// ============================================================================

import { register, getCapability, listCapabilities, filterCapabilities, capabilityExists } from "./registry-builder.js";
import { registerPhysicalCapabilities } from "./physical-capabilities.js";
import { registerLogicalCapabilities } from "./logical-capabilities.js";
import { registerTerminalCapabilities } from "./terminal-capabilities.js";
import { registerWorkflowCapabilities } from "./workflow-capabilities.js";
import { registerOmniCapabilities } from "./omni-capabilities.js";
import type { CapabilitySpec, CapabilityDomain, CapabilityKind, CapabilityRisk } from "./capability-types.js";

// Register all capabilities
registerPhysicalCapabilities(register);
registerLogicalCapabilities(register);
registerTerminalCapabilities(register);
registerWorkflowCapabilities(register);
registerOmniCapabilities(register);

// Re-export types
export type { CapabilitySpec, CapabilityDomain, CapabilityKind, CapabilityRisk } from "./capability-types.js";
export type { Prerequisite, ExpectedEvidence, SupportPolicy, CapabilityAction } from "./capability-types.js";

// Re-export query API
export { getCapability, listCapabilities, filterCapabilities, capabilityExists };