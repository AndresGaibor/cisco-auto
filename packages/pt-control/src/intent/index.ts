// ============================================================================
// Intent - Natural Language to Configuration Pipeline
// ============================================================================

// Intent Parser
export {
  IntentParser,
  createDefaultPatterns,
  type ParsedIntent,
  type IntentPattern,
  type MatchResult,
  type IntentKind,
} from "./intent-parser.js";

// Blueprint Builder
export {
  BlueprintBuilder,
  type Blueprint,
  type BlueprintStep,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from "./blueprint-builder.js";

// Templates
export {
  INTENT_TEMPLATES,
  ACCESS_PORT_TEMPLATE,
  TRUNK_PORT_TEMPLATE,
  STATIC_ROUTE_TEMPLATE,
  SVI_TEMPLATE,
  VLAN_TEMPLATE,
  DHCP_POOL_TEMPLATE,
  templatesToPatterns,
  type IntentTemplate,
} from "./templates.js";

// HSRP Builder
export {
  type SVIStandbyConfig,
  buildHSRPIntent,
  buildHSRPCommands,
  HSRP_DEFAULTS,
  HSRP_PRECEDENCE,
  type HSRPActiveStandby,
  parseHSRPState,
  type HSRPIntent,
  type HSRPConfigResult,
} from "./hsrp-builder.js";

// HSRP Scenarios
export {
  type HSRPScenarioContext,
  type HSRPScenarioExpectation,
  type HSRPScenarioResult,
  createPreemptScenario,
  createFailoverScenario,
  createStandbyPriorityScenario,
  createTrackingScenario,
  createAuthScenario,
  parseStandbyOutputForGroup,
  verifyHSRPState,
} from "./hsrp-scenarios.js";

// HSRP Diagnostics
export {
  type HSRPDiagnosticCheck,
  type HSRPDiagnosticResult,
  type HSRPInconsistency,
  HSRP_INCONSISTENCIES,
  diagnoseHSRP,
  formatDiagnosticReport,
} from "./hsrp-diagnostics.js";
