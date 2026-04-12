# PT Stack v2 - Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Implementar los 8 módulos avanzados del stack PT (Policy Engine, Topology Lint, DHCP Appliance, Capability Matrix, PT-Safe Build, Change Planner, Evidence Ledger, Diagnosis Service).

**Architecture:** Módulos como servicios en pt-control, validators en pt-runtime. Construcción incremental: Policy Engine primero (hace IOS confiable), luego Lint (más útil para labs), luego DHCP, etc.

**Tech Stack:** TypeScript, Bun, Packet Tracer Script Module API, existing ios-domain, existing pt-runtime kernel.

---

## Context

### Reference
- Spec: `docs/superpowers/specs/2026-04-12-pt-stack-v2-architecture.md`

### Existing Code
- `packages/pt-control/src/application/services/` - servicios existentes (ios-semantic-service, ios-verification-service)
- `packages/pt-runtime/src/pt/terminal/terminal-engine.ts` - TerminalEngine in-PT
- `packages/pt-runtime/src/pt/kernel/` - kernel boot existente
- `packages/ios-domain/` - operaciones IOS, parsers, capabilities

### Target Location
- Servicios: `packages/pt-control/src/application/services/`
- Build validators: `packages/pt-runtime/src/build/`

---

## Module 1: Terminal Policy Engine

> **Files to create:**
> - `packages/pt-control/src/application/services/terminal-policy-engine.ts`
> - `packages/pt-control/src/pt/terminal/policy-manager.ts`
> - `packages/pt-control/src/pt/terminal/dialog-resolver.ts`
> - `packages/pt-control/src/pt/terminal/session-arbiter.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts` - export new services

### Tasks

#### Task 1: Create TerminalPolicyEngine interface and types
- Create type definitions for PolicyState, DialogType, SessionMode, PolicyOptions
- Define ITerminalPolicyEngine interface with methods: sendCommand, resolveDialog, transitionMode, executeWithPolicy, getPolicyState

#### Task 2: Implement PolicyManager
- Track currentMode, dirtyLine, timeoutMs, retryCount per device
- Methods: getState, setMode, markDirty, clearDirty, setTimeout

#### Task 3: Implement DialogResolver
- Handle pager: detect "--More--", auto-space or stop on 'q'
- Handle confirm: auto-y or abort configurable
- Handle setup: detect setup mode, skip or auto-configure
- Handle autoinstall: detect pattern, abort with warning

#### Task 4: Implement SessionArbiter
- Queue jobs per device (serialize to avoid collisions)
- Heartbeat tracking for zombie session detection
- Method: enqueue, dequeue, serialize, checkHeartbeat

#### Task 5: Implement ModeTransition
- Valid transitions: exec→configure, configure→interface, interface→subinterface
- Validate transition succeeded by checking prompt
- Methods: canTransition, doTransition, validateTransition

#### Task 6: Implement TerminalPolicyEngine
- Wire together PolicyManager, DialogResolver, SessionArbiter, ModeTransition
- Implement sendCommand with policy applied
- Implement executeWithPolicy with timeout/retry

#### Task 7: Export and test
- Export from services/index.ts
- Add unit tests for PolicyManager, DialogResolver, SessionArbiter

---

## Module 2: Topology Lint + Intent Drift Service

> **Files to create:**
> - `packages/pt-control/src/application/services/topology-lint-service.ts`
> - `packages/pt-control/src/pt/topology/blueprint-store.ts`
> - `packages/pt-control/src/pt/topology/lint-rule-engine.ts`
> - `packages/pt-control/src/pt/topology/drift-detector.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`

### Tasks

#### Task 1: Create TopologyLintService interface and types
- Define BlueprintStore, TopologyObserver, LintRule, LintResult, DriftQueryResult
- Define NetworkOperation type (CREATE_VLAN, CONFIGURE_TRUNK, etc.)

#### Task 2: Implement BlueprintStore
- Store incremental operations (array of NetworkOperation)
- Methods: recordOperation, getBlueprint, getOperations

#### Task 3: Implement TopologyObserver
- Interface to get current device/link/VLAN state
- Integration with existing device-query-service

#### Task 4: Implement LintRuleEngine
- Implement all 12 rules: ipDuplicate, subnetNoGateway, accessPortVlanMissing, trunkVlanNotAllowed, nativeVlanMismatch, subinterfaceEncaps, dhcpPoolSubnetMismatch, dhcpHelperMissing, aclNotApplied, staticRouteNoReach, orphanLink, portConflict
- Each rule: check(blueprint, observed) → LintResult[]

#### Task 5: Implement DriftDetector
- Compare blueprint expected vs observed state
- Categorize drift: missing, conflict, stale
- Assign severity: critical, warning, info

#### Task 6: Implement TopologyLintService
- Wire: BlueprintStore + TopologyObserver + LintRuleEngine + DriftDetector
- Methods: recordOperation, lint, queryDrift, getBlueprint, listRules

#### Task 7: Export and test
- Export from services/index.ts
- Add unit tests for LintRuleEngine rules

---

## Module 3: Server-PT DHCP Appliance Service

> **Files to create:**
> - `packages/pt-control/src/application/services/dhcp-appliance-service.ts`
> - `packages/pt-control/src/pt/server/dhcp-pool-manager.ts`
> - `packages/pt-control/src/pt/server/lease-inspector.ts`
> - `packages/pt-control/src/pt/server/subnet-validator.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`

### Tasks

#### Task 1: Create DhcpApplianceService interface and types
- Define DhcpPoolConfig, DhcpPoolInfo, DhcpLease
- Define IDhcpApplianceService interface

#### Task 2: Implement SubnetValidator
- validateRange(startIp, endIp, mask)
- validateGateway(gateway, subnet)
- suggestOptimalRange(subnet)

#### Task 3: Implement DhcpPoolManager
- createPool, updatePool, deletePool, getPoolInfo
- Integration with PT API (via ipc or kernel)

#### Task 4: Implement LeaseInspector
- getLeases, getLeaseCount, isExhausted
- suggestHelperAddress(pool) → gateway IP

#### Task 5: Implement DhcpApplianceService
- Wire: DhcpPoolManager + LeaseInspector + SubnetValidator
- Methods: createPool, updatePool, deletePool, getPoolInfo, getActiveLeases, isPoolExhausted, suggestHelperAddress

#### Task 6: Export and test
- Export from services/index.ts
- Add unit tests for SubnetValidator

---

## Module 4: Capability Matrix v2

> **Files to create:**
> - `packages/pt-control/src/application/services/capability-matrix-service.ts`
> - `packages/kernel/src/domain/ios/capability-matrix/device-capabilities.ts`
> - `packages/kernel/src/domain/ios/capability-matrix/model-capabilities.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`
> - `packages/kernel/src/domain/ios/index.ts`

### Tasks

#### Task 1: Create capability types
- Define SurfaceType, OperationType, DeviceCapabilities
- Define per-model capability data (2901, 2911, 2960, 3650, etc.)

#### Task 2: Create model-capabilities.ts
- Map model → capabilities (ios, hostport, dhcpAppliance, wireless-ap)
- Map model → supported operations (vlan, trunk, svi, subinterface, dhcp-pool, etc.)
- Map model → interface naming patterns

#### Task 3: Implement CapabilityMatrixService
- getCapabilities(device): DeviceCapabilities
- canExecute(device, operation): boolean
- getRecommendedSurface(device, operation): SurfaceType
- getAvailableParsers(device): ParserType[]

#### Task 4: Export and integrate
- Export from services/index.ts
- Integrate with ios-semantic-service for capability resolution

---

## Module 5: PT-Safe Build Gate

> **Files to create:**
> - `packages/pt-runtime/src/build/ast-pt-safe-validator.ts`
> - `packages/pt-runtime/src/build/es5-lowering.ts`
> - `packages/pt-runtime/src/build/snapshot-validator.ts`

> **Files to modify:**
> - `packages/pt-runtime/src/build/index.ts`
> - `packages/pt-runtime/src/core/runtime-builder.ts`

### Tasks

#### Task 1: Create PT-unsafe patterns list
- Patterns: let/const, arrow functions, template literals, async/await, class extends, spread, optional chaining, nullish coalescing, for...of, Symbol, Promise

#### Task 2: Implement ASTValidator
- Parse generated JS to AST
- Detect PT-unsafe patterns
- Return validation result with errors/warnings

#### Task 3: Implement ES5Lowering (optional)
- Transform arrow → function
- Transform template → concat
- Transform class → prototype
- Transform const → var

#### Task 4: Implement SnapshotValidator
- Load baseline main.js and runtime.js
- diff(current, baseline) → changes
- Check for breaking changes

#### Task 5: Integrate into runtime-builder
- Add validation step before write
- Throw BuildError on PT-unsafe patterns

#### Task 6: Add tests
- Test detection of each pattern
- Test diff against baseline

---

## Module 6: Change Planner with Rollback

> **Files to create:**
> - `packages/pt-control/src/application/services/change-planner-service.ts`
> - `packages/pt-control/src/pt/planner/operation-compiler.ts`
> - `packages/pt-control/src/pt/planner/checkpoint-executor.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`

### Tasks

#### Task 1: Create types
- Define OperationIntent, DeferredJobPlan, DeferredStep, Checkpoint, RollbackConfig
- Define Precheck, PrecheckResult

#### Task 2: Implement OperationCompiler
- Compile high-level intent (e.g., "router-on-a-stick") to steps
- Generate prechecks based on capabilities
- Generate rollback actions

#### Task 3: Implement CheckpointExecutor
- Execute steps with checkpoint verification
- Handle step failure, trigger rollback
- Track execution state

#### Task 4: Implement ChangePlannerService
- compileOperation(intent) → DeferredJobPlan
- executeWithCheckpoint(plan) → ExecutionResult
- rollback(plan, failureAt) → RollbackResult

#### Task 5: Export and test
- Export from services/index.ts
- Test router-on-a-stick compilation

---

## Module 7: Evidence Ledger

> **Files to create:**
> - `packages/pt-control/src/application/services/evidence-ledger-service.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`

### Tasks

#### Task 1: Create types
- Define OperationRecord, VerificationRecord, Evidence
- Define result types: success, partial, failed

#### Task 2: Implement EvidenceLedgerService
- record(op): store OperationRecord with intent, commands, outputs, verifications, result, drift
- get(operationId): retrieve record
- getByDevice(device): retrieve all for device
- explain(operationId): generate human-readable explanation

#### Task 3: Integrate with existing services
- Hook into ios-semantic-service to record operations
- Hook into ios-verification-service to record verifications

#### Task 4: Export and test
- Export from services/index.ts
- Add unit tests

---

## Module 8: Diagnosis Service

> **Files to create:**
> - `packages/pt-control/src/application/services/diagnosis-service.ts`
> - `packages/pt-control/src/pt/diagnosis/diagnosis-engine.ts`

> **Files to modify:**
> - `packages/pt-control/src/application/services/index.ts`
> - `packages/pt-control/src/agent/agent-context-service.ts` - expose diagnosis tool

### Tasks

#### Task 1: Create types
- Define DiagnosisQuery, DiagnosisResult, DeviceDiagnosis, NetworkDiagnosis, DriftReport
- Define root cause types and evidence

#### Task 2: Implement DiagnosisEngine
- parseQuery: convert "PC7 no tiene IP" to investigation plan
- planInvestigation: decide which services to query (TopologyLint, Verification, HostPort, Capability)
- correlate: find root cause from multiple evidence sources
- synthesize: generate human-readable result with suggestions

#### Task 3: Implement DiagnosisService
- diagnose(query): main entry point
- diagnoseDevice(device): convenience method
- diagnoseNetwork(network): convenience method
- explainOperation(operationId): explain past operation outcome
- getFullDriftReport(): comprehensive drift summary

#### Task 4: Integrate with Agent Context
- Add diagnose tool to agent-context-service
- Tool input: target device/network

#### Task 5: Export and test
- Export from services/index.ts
- Test: "PC7 no tiene IP" returns correct diagnosis

---

## Integration Checklist

After implementing all modules:

1. **Export all services** from `packages/pt-control/src/application/services/index.ts`
2. **Add to CLI commands** - expose new services via `bun run pt` commands
3. **Add to agent context** - expose diagnosis tool to agents
4. **Integration test** - run full flow: create VLAN → lint → verify → diagnose
5. **Documentation** - update README with new capabilities

---

## Dependencies Flow

```
Diagnosis Service
    ├── Topology Lint ────────────┐
    │                             │
    ├── Verification IOS          │
    ├── Capability Matrix        │
    └── HostPort (existing)      │
                                  │
Topology Lint                     │
    ├── BlueprintStore            │
    └── IOS Semantic Service ────┘

Terminal Policy
    └── TerminalEngine (in-PT)

DHCP Appliance
    └── PT API (via kernel)

Capability Matrix
    └── ios-domain (existing)

Change Planner
    ├── IOS Semantic Service
    ├── Topology Lint
    └── Terminal Policy

Evidence Ledger
    └── (integrates with all)
```

---

## Commit Strategy

Per module:
1. "feat(topology-lint): add BlueprintStore and types"
2. "feat(topology-lint): implement LintRuleEngine with 12 rules"
3. "feat(topology-lint): implement DriftDetector"
4. "feat(topology-lint): add TopologyLintService and exports"
5. "test(topology-lint): add unit tests"

Same pattern for each module.