# Runtime-Control Inventory

## Inventario de Archivos por Paquete

Este documento clasifica cada archivo exported por `pt-runtime` y `pt-control` según su responsabilidad arquitectónica.

---

## pt-runtime — Clasificación

| Archivo | Export Principal | Responsabilidad Actual | Responsabilidad Correcta | Acción | Fase | Riesgo | Dependencias |
|--------|---------------|---------------------|------------------------|-------|------|-------|--------------|
| `src/index.ts` | RuntimeGenerator, ModularRuntimeGenerator | Build system | Build system | dejar | 1 | bajo | N/A |
| `src/contracts/pt-compatibility.ts` | assertCatalogLoaded, PTCatalogHealth | Compatibility contract | Compatibility contract | dejar | 1 | bajo | N/A |
| `src/domain/runtime-result.ts` | okResult, errorResult, deferredResult | Runtime result types | Runtime result types | dejar | 1 | bajo | N/A |
| `src/domain/deferred-job-plan.ts` | createDeferredJobPlan, deferred step builders | Deferred job plan | Deferred job plan | dejar | 1 | bajo | N/A |
| `src/runtime/types.ts` | Runtime types | Runtime types | Runtime types | dejar | 1 | bajo | N/A |
| `src/runtime/contracts.ts` | Runtime contracts | Runtime contracts | Runtime contracts | dejar | 1 | bajo | N/A |
| `src/core/middleware.ts` | Middleware | Middleware | Middleware | dejar | 1 | bajo | N/A |
| `src/core/registry.ts` | Registry | Registry | Registry | dejar | 1 | bajo | N/A |
| `src/core/dispatcher.ts` | Dispatcher | Dispatcher | Mover a `pt/kernel` | dividir | 2 | medio | kernel |
| `src/handlers/device-crud.ts` | handleAddDevice, handleRemoveDevice, handleRenameDevice, handleMoveDevice | Device CRUD | **Primitive** device CRUD | dejar | 1 | bajo | pt-api |
| `src/handlers/device-discovery.ts` | handleListDevices | Device discovery | **Primitive** device listing | dejar | 1 | bajo | pt-api |
| `src/handlers/device-listing.ts` | composeDeviceListing | Device listing | **Primitive** device listing | dejar | 1 | bajo | pt-api |
| `src/handlers/device.ts` | DeviceHandler (class deprecated) | Device aggregator | Legacy wrapper | deprecar | 3 | bajo | device-crud |
| `src/handlers/link.ts` | handleAddLink, handleRemoveLink | Link CRUD | **Primitive** link CRUD | dejar | 1 | bajo | pt-api |
| `src/handlers/module/handlers.ts` | handleAddModule, handleRemoveModule | Module CRUD | **Primitive** module CRUD | dejar | 1 | bajo | pt-api |
| `src/handlers/inspect.ts` | handleInspect, handleDeepInspect | Device inspection | **Primitive** inspection | dejar | 1 | bajo | pt-api |
| `src/handlers/vlan.ts` | handleEnsureVlans, handleConfigVlanInterfaces | VLAN configuration | **Primitive** VLAN-ops | dividir | 2 | alto | pt-api |
| `src/handlers/dhcp.ts` | handleConfigureDhcpServer, handleConfigureDhcpPool | DHCP configuration | **Primitive** DHCP-ops | dividir | 2 | alto | pt-api |
| `src/handlers/host.ts` | handleConfigHost, handleInspectHost | Host configuration | **Primitive** host config | dejar | 1 | bajo | pt-api |
| `src/handlers/canvas.ts` | handleListCanvasRects, handleGetRect, handleDevicesInRect | Canvas operations | **Primitive** canvas ops | dejar | 1 | bajo | pt-api |
| `src/handlers/ios-execution.ts` | handleConfigIos, handleExecIos, handleDeferredPoll | IOS execution | **Primitive** execution | dejar | 1 | bajo | pt-api, terminal |
| `src/handlers/ios-session.ts` | RuntimeSessionState, inferModeFromPrompt | Session state | **Primitive** session state | dejar | 1 | bajo | pt-api |
| `src/handlers/ios-plan-builder.ts` | buildConfigIosPlan, buildExecIosPlan | **WORKFLOW** - Plan building | Mover a `control` **workflows** | mover | 3 | alto | ios-execution |
| `src/handlers/ios-output-classifier.ts` | classifyOutput | **WORKFLOW** - Output classification | Mover a `control` **parsers** | mover | 3 | medio | ios-domain |
| `src/handlers/ios-engine.ts` | IOSEngine (clase compleja) | **LEGACY** - IOS engine | **Deprecated** | deprecar | 4 | medio | N/A |
| `src/handlers/omniscience-*.ts` | Omni* handlers (5 archivos) | **HACKS** - Low-level PT | **Adapter** omni (bajo nivel) | dejar | 1 | alto | pt-api, global |
| `src/pt/kernel/main.ts` | createKernel, Kernel interface | Kernel lifecycle | **Kernel** lifecycle | dejar | 1 | bajo | pt-api |
| `src/pt/kernel/kernel-state.ts` | KernelState | Kernel state | **Kernel** state | dejar | 1 | bajo | N/A |
| `src/pt/kernel/queue-*.ts` | Command queue operations | Command queue management | **Kernel** queue | dejar | 1 | bajo | N/A |
| `src/pt/kernel/lease.ts` | LeaseManager | Lease validation | **Kernel** lease | dejar | 1 | bajo | N/A |
| `src/pt/kernel/heartbeat.ts` | HeartbeatManager | Heartbeat write | **Kernel** heartbeat | dejar | 1 | bajo | N/A |
| `src/pt/kernel/runtime-loader.ts` | RuntimeLoader | Runtime hot reload | **Kernel** loader | dejar | 1 | bajo | N/A |
| `src/pt/kernel/execution-engine.ts` | ExecutionEngine | Job execution | **Kernel** execution engine | dejar | 1 | bajo | terminal |
| `src/pt/terminal/terminal-engine.ts` | createTerminalEngine, TerminalEngine | Terminal execution | **Terminal** engine | dejar | 1 | bajo | pt-api |
| `src/pt/terminal/terminal-session.ts` | TerminalSessionState | Session state | **Terminal** session | dejar | 1 | bajo | pt-api |
| `src/pt/terminal/prompt-parser.ts` | parsePrompt, IosMode | Prompt parsing | **Terminal** prompt parsing | dejar | 1 | bajo | N/A |
| `src/pt/terminal/command-executor.ts` | CommandExecutor | Command execution | **Terminal** executor | dejar | 1 | bajo | pt-api |
| `src/pt-api/*.ts` | PT type definitions | PT API types | **Catalog** PT types | dejar | 1 | bajo | N/A |
| `src/build/render-*.ts` | Render functions | Build system | **Build** system | dejar | 1 | bajo | N/A |
| `src/build/validate-pt-safe.ts` | validatePtSafe | Validation | **Build** validation | dejar | 1 | bajo | N/A |
| `src/value-objects/*.ts` | CableType, DeviceName, etc. | Value objects | **Domain** value objects | dejar | 1 | bajo | N/A |

### Clasificación pt-runtime por Categoría

| Categoría | Archivos | Acción |
|-----------|--------|--------|
| **kernel** | `pt/kernel/*.ts` (excepto runtime-loader) | dejar |
| **primitive PT** | `handlers/device-crud.ts`, `handlers/device-discovery.ts`, `handlers/link.ts`, `handlers/module/*.ts`, `handlers/host.ts`, `handlers/canvas.ts`, `handlers/inspect.ts` | dejar |
| **primitive terminal** | `handlers/ios-execution.ts`, `handlers/ios-session.ts`, `pt/terminal/*.ts` | dejar |
| **primitive VLAN/DHCP** | `handlers/vlan.ts`, `handlers/dhcp.ts` | dividir (mantener ops bajos) |
| **hack adapter** | `handlers/omniscience-*.ts` | dejar (con contrato) |
| **workflow** | `handlers/ios-plan-builder.ts`, `handlers/ios-output-classifier.ts` | mover a control |
| **legacy** | `handlers/ios-engine.ts`, `handlers/device.ts` (class) | deprecar |
| **build** | `src/build/*.ts` | dejar |

---

## pt-control — Clasificación

| Archivo | Export Principal | Responsabilidad Actual | Responsabilidad Correcta | Acción | Fase | Riesgo | Dependencias |
|--------|---------------|---------------------|------------------------|-------|------|-------|--------------|
| `src/index.ts` | PTController | Main entry point | Main entry point | dejar | 1 | bajo | N/A |
| `src/controller/index.ts` | PTController | Controller | Controller | dejar | 1 | bajo | N/A |
| `src/controller/topology-service.ts` | TopologyService | Topology management | **Service** topology | dejar | 1 | bajo | N/A |
| `src/controller/ios-service.ts` | IOSService | IOS execution service | **Service** IOS | dejar | 1 | bajo | pt-runtime |
| `src/application/services/topology-mutation-service.ts` | TopologyMutationService | Topology mutations | **Service** mutations | dejar | 1 | bajo | N/A |
| `src/application/services/device-service.ts` | DeviceService | Device service | **Service** device | dejar | 1 | bajo | N/A |
| `src/application/services/device-mutation-service.ts` | DeviceMutationService | Device mutations | **Service** device mutations | dejar | 1 | bajo | N/A |
| `src/application/services/ios-execution-service.ts` | IOSExecutionService | IOS execution | **Service** IOS execution | dejar | 1 | bajo | pt-runtime |
| `src/application/services/ios-config-operations.ts` | IOSConfigOperations | IOS config ops | **Service** IOS config | dejar | 1 | bajo | pt-runtime |
| `src/application/services/ios-query-operations.ts` | IOSQueryOperations | IOS query ops | **Service** IOS query | dejar | 1 | bajo | pt-runtime |
| `src/application/services/ios-verification-service.ts` | IOSVerificationService | **WORKFLOW** - IOS verification | **Workflow** IOS verification | dejar | 1 | alto | N/A |
| `src/application/services/ios-semantic-service.ts` | IOSSemanticService | **WORKFLOW** - IOS semantic | **Workflow** IOS semantic | dejar | 1 | alto | N/A |
| `src/application/services/omniscience-service.ts` | OmniscienceService | **WORKFLOW** - Omni harness | **Workflow** omni harness | dejar | 1 | alto | pt-runtime |
| `src/application/services/scenario-service.ts` | ScenarioService | **WORKFLOW** - Scenario service | **Workflow** scenario | dejar | 1 | alto | N/A |
| `src/application/services/layout-planner-service.ts` | LayoutPlannerService | **WORKFLOW** - Layout planning | **Workflow** layout | dejar | 1 | medio | N/A |
| `src/application/services/port-planner-service.ts` | PortPlannerService | **WORKFLOW** - Port planning | **Workflow** port | dejar | 1 | medio | N/A |
| `src/application/services/link-feasibility-service.ts` | LinkFeasibilityService | **WORKFLOW** - Link feasibility | **Workflow** link | dejar | 1 | medio | N/A |
| `src/pt/planner/change-planner-service.ts` | ChangePlannerService | **WORKFLOW** - Change planning | **Workflow** change planner | dejar | 1 | alto | N/A |
| `src/pt/planner/operation-compiler.ts` | OperationCompiler | **WORKFLOW** - Operation compile | **Workflow** operation compiler | dejar | 1 | alto | N/A |
| `src/pt/topology/topology-lint-service.ts` | TopologyLintService | **WORKFLOW** - Topology lint | **Workflow** lint | dejar | 1 | medio | N/A |
| `src/pt/topology/drift-detector.ts` | DriftDetector | **WORKFLOW** - Drift detection | **Workflow** drift | dejar | 1 | medio | N/A |
| `src/pt/diagnosis/diagnosis-service.ts` | DiagnosisService | **WORKFLOW** - Diagnosis | **Workflow** diagnosis | dejar | 1 | medio | N/A |
| `src/pt/terminal/policy-manager.ts` | PolicyManager | **WORKFLOW** - Terminal policy | **Workflow** terminal policy | dejar | 1 | medio | pt-runtime |
| `src/pt/terminal/session-arbiter.ts` | SessionArbiter | **WORKFLOW** - Session arbiter | **Workflow** session arbiter | dejar | 1 | medio | pt-runtime |
| `src/pt/server/dhcp-pool-manager.ts` | DhcpPoolManager | **WORKFLOW** - DHCP pool mgmt | **Workflow** DHCP pools | dejar | 1 | medio | pt-runtime |
| `src/pt/ledger/evidence-ledger-service.ts` | EvidenceLedgerService | **WORKFLOW** - Evidence ledger | **Workflow** evidence | dejar | 1 | bajo | N/A |
| `src/intent/vlan-builder.ts` | Intent builders (VLAN) | **WORKFLOW** - Intent resolution | **Workflow** intent resolution | dejar | 1 | alto | N/A |
| `src/intent/dhcp-builder.ts` | Intent builders (DHCP) | **WORKFLOW** - Intent resolution | **Workflow** intent resolution | dejar | 1 | alto | N/A |
| `src/intent/routing-builder.ts` | Intent builders (routing) | **WORKFLOW** - Intent resolution | **Workflow** intent resolution | dejar | 1 | alto | N/A |
| `src/intent/blueprint-builder.ts` | BlueprintBuilder | **WORKFLOW** - Blueprint build | **Workflow** blueprint | dejar | 1 | alto | N/A |
| `src/vdom/topology-cache-manager.ts` | TopologyCacheManager | **Service** - Topology cache | **Service** topology cache | dejar | 1 | bajo | N/A |
| `src/domain/ios/capabilities/pt-capability-resolver.ts` | resolveCapabilities | **Service** - Capability resolution | **Service** capabilities | dejar | 1 | bajo | pt-runtime |
| `src/domain/ios/session/prompt-classifier.ts` | PromptClassifier | **Service** - Prompt classification | **Service** prompt classifier | dejar | 1 | bajo | N/A |
| `src/domain/ios/session/setup-guard.ts` | SetupGuard | **Service** - Setup guard | **Service** setup guard | dejar | 1 | bajo | N/A |

### Clasificación pt-control por Categoría

| Categoría | Archivos | Acción |
|-----------|--------|--------|
| **controller** | `controller/index.ts` | dejar |
| **services** | `application/services/*.ts` (query, ops) | dejar |
| **workflows** | `*verification*.ts`, `*semantic*.ts`, `*scenario*.ts`, `*planner*.ts`, `intent/*.ts` | dejar |
| **diagnosis** | `pt/diagnosis/*.ts`, `pt/topology/drift-detector.ts` | dejar |
| **terminal** | `pt/terminal/*.ts` (policy/arbiter) | dejar |
| **service** | `domain/ios/*.ts`, `vdom/*.ts` | dejar |
| **ledger** | `pt/ledger/*.ts` | dejar |

---

## Resumen de Clasificación

### pt-runtime

| Total Archivos | Categoría | Cantidad |
|---------------|----------|---------|
| 55 | **kernel** | 12 |
| 55 | **primitive PT** | 10 |
| 55 | **primitive terminal** | 5 |
| 55 | **primitive VLAN/DHCP** | 2 |
| 55 | **hack adapter** | 5 |
| 55 | **workflow** | 2 |
| 55 | **legacy** | 2 |
| 55 | **build** | 3 |
| 55 | **domain/catalog** | 14 |

### pt-control

| Total Archivos | Categoría | Cantidad |
|---------------|----------|---------|
| 80 | **controller** | 1 |
| 80 | **services** | 8 |
| 80 | **workflows** | 20 |
| 80 | **diagnosis** | 3 |
| 80 | **terminal** | 2 |
| 80 | **service** | 10 |
| 80 | **ledger** | 1 |

---

## Acciones por Fase

### Fase 1 (esta) — Completada

- [x] Inventariar archivos
- [x] Clasificar por responsabilidad
- [x] Definir categorías

### Fase 2 — Terminal Engine

- [ ] Separar `handlers/ios-plan-builder.ts` → nuevo paquete `workflows`
- [ ] Crear contrato de ejecución IOS con evidencia

### Fase 3 — Migrar Workflows

- [ ] Mover `ios-output-classifier.ts` → `ios-domain/parsers`
- [ ] Mover intent builders → workflows
- [ ] Consolidar planners

### Fase 4 — Reescribir Exports

- [ ]分组发布 exports
- [ ] Mantener backwards compatibility
- [ ] Deprecaciones oficiales

### Fase 5 — Cleanup

- [ ] Eliminar `handlers/ios-engine.ts`
- [ ] Eliminar `DeviceHandler` class
- [ ] Limpiar internos

---

## Histórico

| Fecha | Versión | Autor | Cambios |
|-------|--------|-------|---------|
| 2026-04-19 | 1.0 | @agibor | Initial inventory |