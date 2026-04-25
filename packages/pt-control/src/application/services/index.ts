// ============================================================================
// Application Services - Exports
// ============================================================================

export { TopologyService } from "./topology-service.js";
export { TopologyQueryService } from "./topology-query-service.js";
export { TopologyMutationService } from "./topology-mutation-service.js";
export { DeviceService } from "./device-service.js";
export { DeviceQueryService } from "./device-query-service.js";
export { DeviceMutationService } from "./device-mutation-service.js";
export { IosService } from "./ios-service.js";
export { IosExecutionService } from "./ios-execution-service.js";
export { IosSemanticService } from "./ios-semantic-service.js";
export { CanvasService } from "./canvas-service.js";
export { LayoutPlannerService } from "./layout-planner-service.js";
export { PortPlannerService } from "./port-planner-service.js";
export { LinkFeasibilityService } from "./link-feasibility-service.js";
export { OmniscienceService } from "./omniscience-service.js";
export { ScenarioService } from "./scenario-service.js";
export { WlcService } from "./wlc-service.js";
export { LabService, LabScenarioRunner } from "./lab-service.js";
export type { LabScenario, LabCheck, LabVerification, LabContext } from "./lab-service.js";
export type {
  ParsedDeviceXml,
  XmlPort,
  XmlModule,
  XmlVlan,
  XmlRoutingEntry,
  XmlArpEntry,
  XmlMacEntry,
} from "./lab-service.js";

// PT Terminal Policy Engine
export {
  TerminalPolicyEngine,
  createTerminalPolicyEngine,
} from "../../pt/terminal/terminal-policy-engine.js";
export { PolicyManager } from "../../pt/terminal/policy-manager.js";
export { DialogResolver } from "../../pt/terminal/dialog-resolver.js";
export { SessionArbiter } from "../../pt/terminal/session-arbiter.js";
export { ModeTransitionHandler } from "../../pt/terminal/mode-transition.js";
export type {
  ITerminalPolicyEngine,
  PolicyState,
  SessionMode,
  PolicyOptions,
  CommandResult,
  DialogType,
  QueuedJob,
  PolicyConfig,
} from "../../pt/terminal/policy-types.js";

// PT Topology Lint Service
export {
  TopologyLintService,
  createTopologyLintService,
} from "../../pt/topology/topology-lint-service.js";
export { BlueprintStore } from "../../pt/topology/blueprint-store.js";
export { LintRuleEngine } from "../../pt/topology/lint-rule-engine.js";
export { DriftDetector } from "../../pt/topology/drift-detector.js";
export type {
  ITopologyLintService,
  TopologyBlueprint,
  NetworkOperation,
  LintResult,
  DriftQueryResult,
  LintRule,
  ObservedState,
} from "../../pt/topology/topology-lint-types.js";

// PT DHCP Appliance Service
export {
  DhcpApplianceService,
  createDhcpApplianceService,
} from "../../pt/server/dhcp-appliance-service.js";
export { SubnetValidator } from "../../pt/server/subnet-validator.js";
export { DhcpPoolManager } from "../../pt/server/dhcp-pool-manager.js";
export type {
  IDhcpApplianceService,
  DhcpPoolConfig,
  DhcpPoolInfo,
  DhcpLease,
  SubnetValidationResult,
} from "../../pt/server/dhcp-appliance-types.js";

// Capability Matrix Service (kernel)
export {
  CapabilityMatrixService,
  createCapabilityMatrixService,
} from "@cisco-auto/kernel/domain/ios/capability-matrix/capability-matrix-service.js";
export {
  getCapabilitiesForModel,
  getModelInfo,
  getAllModels,
} from "@cisco-auto/kernel/domain/ios/capability-matrix/model-capabilities.js";
export type {
  ICapabilityMatrixService,
  DeviceCapabilities,
  SurfaceType,
  OperationType,
  ParserType,
  ModelInfo,
  CapabilityLookupResult,
} from "@cisco-auto/kernel/domain/ios/capability-matrix/capability-types.js";

// PT Change Planner Service
export {
  ChangePlannerService,
  createChangePlannerService,
} from "../../pt/planner/change-planner-service.js";
export { OperationCompiler } from "../../pt/planner/operation-compiler.js";
export { CheckpointExecutor } from "../../pt/planner/checkpoint-executor.js";
export type {
  IChangePlannerService,
  OperationIntent,
  OperationIntentType,
  DeferredJobPlan,
  DeferredStep,
  ExecutionResult,
  RollbackResult,
  Precheck,
  Checkpoint,
  RollbackConfig,
} from "../../pt/planner/change-planner-types.js";

// PT Evidence Ledger Service
export {
  EvidenceLedgerService,
  createEvidenceLedgerService,
} from "../../pt/ledger/evidence-ledger-service.js";
export type {
  IEvidenceLedgerService,
  OperationRecord,
  OperationResult,
  OperationQuery,
  EvidenceStats,
  VerificationRecord,
  Evidence,
} from "../../pt/ledger/evidence-types.js";

// PT Diagnosis Service
export { DiagnosisService, createDiagnosisService } from "../../pt/diagnosis/diagnosis-service.js";
export { DiagnosisEngine, createDiagnosisEngine } from "../../pt/diagnosis/diagnosis-engine.js";
export type {
  IDiagnosisService,
  IDiagnosisEngine,
  DiagnosisCategory,
  Severity,
  Symptom,
  DiagnosisResult,
  DeviceDiagnosis,
  DeviceIssue,
  DiagnosticCheck,
  RootCause,
  Recommendation,
  DiagnosisOptions,
} from "../../pt/diagnosis/diagnosis-types.js";

// Terminal Command Service
export { createTerminalCommandService } from "./terminal-command-service.js";
export type { TerminalCommandServiceDeps } from "./terminal-command-service.js";
