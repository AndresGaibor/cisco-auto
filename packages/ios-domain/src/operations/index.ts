// ============================================================================
// IOS Operations - Exports
// ============================================================================

// CommandPlan core
export {
  type CommandPlan,
  type CommandStep,
  type RollbackStep,
  CommandPlanBuilder,
  getModePrompt,
} from "./command-plan.js";

// Operations
export {
  planConfigureAccessPort,
  type ConfigureAccessPortInput,
} from "./configure-access-port.js";

export {
  planConfigureTrunkPort,
  type ConfigureTrunkPortInput,
} from "./configure-trunk-port.js";

export {
  planConfigureSvi,
  type ConfigureSviInput,
} from "./configure-svi.js";

export {
  planConfigureSubinterface,
  type ConfigureSubinterfaceInput,
} from "./configure-subinterface.js";

export {
  planConfigureStaticRoute,
  type ConfigureStaticRouteInput,
} from "./configure-static-route.js";

export {
  planConfigureDhcpRelay,
  type ConfigureDhcpRelayInput,
} from "./configure-dhcp-relay.js";

export {
  planConfigureVlan,
  type ConfigureVlanInput,
} from "./configure-vlan.js";

export {
  planConfigureDhcpPool,
  type ConfigureDhcpPoolInput,
} from "./configure-dhcp-pool.js";
