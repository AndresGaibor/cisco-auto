/**
 * TOOL TYPES - Re-exported for backwards compatibility
 *
 * This file now re-exports from more specific modules to improve maintainability
 */
export type { ToolInputSchema, ToolInputProperty, ToolInput, Tool, ToolCategory, ToolExample, ToolConfigDefinition, ToolHandler, } from './tool-base';
export type { ToolResultSuccess, ToolResultError, ToolResult, ToolResultMetadata, ToolExecutionContext, ToolLogger, ToolConfig, } from './tool-execution';
export type { ToolError, } from './tool-core';
export type { TopologyPlan, TopologyPlanParams, NetworkType, RoutingProtocol, DevicePlan, DeviceModelPlan, PortInfo, PlanPosition, InterfacePlan, VLANPlan, DHCPPlan, RoutingPlan, OSPFPlanConfig, OSPFAreaPlan, EIGRPPlanConfig, StaticRoutePlan, CredentialsPlan, LinkPlan, LinkEndpoint, CableTypePlan, TopologyPlanValidation, ValidationError, ValidationErrorType, ValidationWarning, ValidationWarningType, FixSuggestion, FixAction, TopologyPlanMetadata, } from './topology-types';
export type { DeployedDevice, FailedDevice, DeploySummary, } from './deploy-types';
//# sourceMappingURL=tool.d.ts.map