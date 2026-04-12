# PT Stack v2 - Arquitectura de Módulos Avanzados

**Fecha:** 2026-04-12  
**Branch:** feat/pt-runtime-migration  
**Estado:** Design Aprobado

---

## Resumen Ejecutivo

Este documento especifica la arquitectura para 8 módulos nuevos que extienden el stack de PT-Control más allá de la CLI básica, habilitar diagnóstico causal en tiempo real, y hacer el sistema confiable para ejecución automatizada y agentes externos.

Los módulos propuestos son:

1. **Terminal Policy Engine** — Política de sesión IOS (pager, confirm, setup, timeouts)
2. **Topology Lint + Intent Drift Service** — Verificación de coherencia global del lab
3. **Server-PT DHCP Appliance Service** — Administración de pools DHCP vía API PT
4. **Diagnosis Service** — Orquestador para diagnóstico causal ("¿por qué X no funciona?")
5. **Capability Matrix v2** — Capabilities por modelo y superficie
6. **PT-Safe Build Gate** — Validación AST para Qt Script Engine
7. **Change Planner con Rollback** — Compilación de operaciones a pasos verificables
8. **Evidence Ledger** — Trazabilidad completa de operaciones

**Alcance:** CLI (`bun run pt`), agentes externos (Claude Code, OpenCode, Pi Agent), tiempo real.

---

## 1. Terminal Policy Engine

### Responsabilidad
Gobierna toda interacción con la sesión IOS del terminal para hacer la ejecución confiable y predecible.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              TerminalPolicyEngine (pt-control)              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ PolicyManager  │  │ DialogResolver  │                  │
│  │ - currentMode  │  │ - confirmPrompt │                  │
│  │ - dirtyLine    │  │ - pagerHandler  │                  │
│  │ - timeoutMs    │  │ - setupHandler  │                  │
│  │ - retryCount   │  │ - autoinstall   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ SessionArbiter │  │ ModeTransition │                  │
│  │ - queue jobs   │  │ - exec→config  │                  │
│  │ - serialize    │  │ - config→intf  │                  │
│  │ - heartbeat    │  │ - intf→subif   │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Interfaz Pública

```typescript
interface ITerminalPolicyEngine {
  sendCommand(device: string, command: string): Promise<CommandResult>;
  resolveDialog(device: string, dialog: DialogType): Promise<void>;
  transitionMode(device: string, targetMode: SessionMode): Promise<void>;
  executeWithPolicy<T>(device: string, op: () => Promise<T>, options?: PolicyOptions): Promise<T>;
  getPolicyState(device: string): PolicyState;
}

type DialogType = 'pager' | 'confirm' | 'setup' | 'autoinstall' | 'dirtyline';
type SessionMode = 'exec' | 'configure' | 'interface' | 'subinterface' | 'router' | 'vlan';

interface PolicyOptions {
  timeoutMs?: number;
  retryCount?: number;
  autoConfirm?: boolean;
  autoPaginate?: boolean;
}
```

### Reglas de Política

| Escenario | Comportamiento | Timeout | Retry |
|-----------|---------------|---------|-------|
| Pager | Auto-space hasta fin, o stop en `q` | 30s | 0 |
| Confirm | Auto-y o abort configurable | 10s | 1 |
| Setup | Detectar y skip/auto-configure | 60s | 0 |
| Dirty line | Esperar prompt limpio + retry | 15s | 2 |
| Mode change | Validar transición exitosa | 10s | 1 |
| Timeout | Abortar, marcar job failed | - | - |

### Integración

- El `TerminalEngine` existente (in-PT) emite eventos
- El `TerminalPolicyEngine` (Node side) consume eventos y aplica políticas
- Comunicación: archivos en `~/pt-dev/` + events del kernel

---

## 2. Topology Lint + Intent Drift Service

### Responsabilidad
Verificar coherencia global del lab más allá de operaciones individuales — detectar drift entre intención y estado observado. El blueprint se construye incrementalmente desde las operaciones ejecutadas.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│            TopologyLintService (pt-control)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐              │
│  │ BlueprintStore   │    │ TopologyObserver │              │
│  │ - incremental    │◄──►│ - getDeviceState │              │
│  │ - operations[]   │    │ - getLinkState   │              │
│  │ - expected[]     │    │ - getVlanState   │              │
│  └───────────────────┘    └───────────────────┘              │
│           │                         │                        │
│           ▼                         ▼                        │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              LintRuleEngine                          │     │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │     │
│  │  │ ipDupe     │ │ vlanAccess │ │ trunkVlanMatch │   │     │
│  │  │ subnetGate │ │ dhcpHelper │ │ aclApplied    │   │     │
│  │  │ ...        │ │ ...        │ │ ...            │   │     │
│  │  └────────────┘ └────────────┘ └────────────────┘   │     │
│  └─────────────────────────────────────────────────────┘     │
│                         │                                     │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              DriftDetector                            │     │
│  │  - compare(blueprint, observed)                      │     │
│  │  - categorize(drift) → missing|conflict|stale       │     │
│  │  - severity(issue) → critical|warning|info         │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Interfaz Pública

```typescript
interface ITopologyLintService {
  recordOperation(op: NetworkOperation): void;
  lint(): Promise<LintResult[]>;
  queryDrift(entity: string): Promise<DriftQueryResult>;
  getBlueprint(): TopologyBlueprint;
  listRules(): LintRule[];
}

interface NetworkOperation {
  type: 'CREATE_VLAN' | 'CONFIGURE_TRUNK' | 'CREATE_SVI' | 'CREATE_DHCP_POOL' | ...;
  device: string;
  entity: string;
  expected: Record<string, unknown>;
  timestamp: Date;
}
```

### Reglas de Lint

| Regla | Descripción | Severidad |
|-------|-------------|-----------|
| `ipDuplicate` | Misma IP en múltiples dispositivos | critical |
| `subnetNoGateway` | Subred sin default-router | critical |
| `accessPortVlanMissing` | Access port con VLAN no existente | critical |
| `trunkVlanNotAllowed` | Trunk no permite VLANs necesarias | critical |
| `nativeVlanMismatch` | Native VLAN diferente entre ends | warning |
| `subinterfaceEncaps` | Subint sin encapsulation matching | warning |
| `dhcpPoolSubnetMismatch` | Pool DHCP no coincide con subred | critical |
| `dhcpHelperMissing` | DHCP server remoto sin helper-address | critical |
| `aclNotApplied` | ACL creada pero no aplicada a interface | warning |
| `staticRouteNoReach` | Ruta estática con next-hop inalcanzable | critical |
| `orphanLink` | Cable sin ambos ends conectados | info |
| `portConflict` | Mismo puerto usado inconsistentemente | warning |

---

## 3. Server-PT DHCP Appliance Service

### Responsabilidad
Administrar pools DHCP usando la API de Packet Tracer (`DhcpPool`) en lugar de IOS.

### API PT DhcpPool Disponible

- `setDefaultRouter(ip)`, `setStartIp(ip)`, `setEndIp(ip)`
- `setDnsServerIp(ip)`, `setMaxUsers(number)`, `setNetworkMask(mask)`
- `getLeases()` — leases activos

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│            DhcpApplianceService (pt-control)                │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐             │
│  │ DhcpPoolManager  │    │ LeaseInspector    │             │
│  │ - createPool()   │    │ - getLeases()     │             │
│  │ - updatePool()   │    │ - getLeaseCount() │             │
│  │ - deletePool()   │    │ - isExhausted()   │             │
│  │ - getPoolInfo()  │    │ - suggestRelay()  │             │
│  └───────────────────┘    └───────────────────┘             │
│           │                         │                        │
│           └─────────────┬──────────┘                        │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SubnetValidator                         │    │
│  │  - validateRange(startIp, endIp, mask)             │    │
│  │  - validateGateway(gateway, subnet)                │    │
│  │  - suggestOptimalRange(subnet)                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Interfaz Pública

```typescript
interface IDhcpApplianceService {
  createPool(serverDevice: string, config: DhcpPoolConfig): Promise<string>;
  updatePool(serverDevice: string, poolId: string, config: Partial<DhcpPoolConfig>): Promise<void>;
  deletePool(serverDevice: string, poolId: string): Promise<void>;
  getPoolInfo(serverDevice: string, poolId: string): Promise<DhcpPoolInfo>;
  getActiveLeases(serverDevice: string, poolId: string): Promise<DhcpLease[]>;
  isPoolExhausted(serverDevice: string, poolId: string): Promise<boolean>;
  suggestHelperAddress(pool: DhcpPoolInfo): Promise<string>;
}

interface DhcpPoolConfig {
  network: string;
  mask: string;
  startIp: string;
  endIp: string;
  defaultRouter: string;
  dnsServer?: string;
  maxUsers?: number;
  vlan?: number;
}
```

---

## 4. Diagnosis Service (Feature Killer)

### Responsabilidad
Orquestar los servicios existentes y nuevos para responder preguntas causales del lab.

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│              DiagnosisService (pt-control)                  │
├─────────────────────────────────────────────────────────────┤
│                    ┌─────────────────────┐                  │
│                    │  DiagnosisEngine    │                  │
│                    │  - parseQuery()     │                  │
│                    │  - planInvestigation│                  │
│                    │  - correlate()      │                  │
│                    │  - synthesize()     │                  │
│                    └──────────┬──────────┘                  │
│                               │                             │
│         ┌─────────────────────┼─────────────────────┐        │
│         │                     │                     │        │
│         ▼                     ▼                     ▼        │
│  ┌─────────────┐    ┌─────────────────┐    ┌───────────┐  │
│  │ Verification│    │ TopologyLint    │    │ Capability│  │
│  │ IOS Service │    │ Service         │    │ Matrix    │  │
│  │ (existing)  │    │ (this design)   │    │ (future)   │  │
│  └─────────────┘    └─────────────────┘    └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Interfaz Pública

```typescript
interface IDiagnosisService {
  diagnose(query: DiagnosisQuery): Promise<DiagnosisResult>;
  diagnoseDevice(device: string): Promise<DeviceDiagnosis>;
  diagnoseNetwork(network: string): Promise<NetworkDiagnosis>;
  explainOperation(operationId: string): Promise<OperationExplanation>;
  getFullDriftReport(): Promise<DriftReport>;
}

interface DiagnosisQuery {
  target: string;
  type: 'device' | 'network' | 'connectivity' | 'operation';
  context?: string;
}

interface DiagnosisResult {
  rootCause: string;
  missing: string[];
  conflicts: string[];
  suggestions: string[];
  severity: 'critical' | 'warning' | 'info';
  evidence: Evidence[];
}
```

### Ejemplo: "¿Por qué PC7 no obtiene IP?"

```typescript
{
  rootCause: "No existe pool DHCP para subred 192.168.10.0/24",
  missing: [
    "DHCP pool en Server-PT-1 para 192.168.10.0/24",
    "helper-address en Gi0/0.10 de Router1"
  ],
  conflicts: [],
  suggestions: [
    "Crear DHCP pool: network 192.168.10.0, range 100-200, gateway 192.168.10.1",
    "O configurar: ip helper-address 192.168.10.254 en Gi0/0.10"
  ],
  severity: 'critical',
  evidence: [...]
}
```

---

## 5. Capability Matrix v2

### Responsabilidad
Centralizar qué operaciones son soportadas por modelo de dispositivo y tipo de superficie.

### Interfaz

```typescript
interface ICapabilityMatrixService {
  getCapabilities(device: string): DeviceCapabilities;
  canExecute(device: string, operation: OperationType): boolean;
  getRecommendedSurface(device: string, operation: OperationType): SurfaceType;
  getAvailableParsers(device: string): ParserType[];
}

type SurfaceType = 'ios' | 'hostport' | 'dhcp-appliance' | 'wireless-ap';
type OperationType = 'vlan' | 'trunk' | 'access-port' | 'svi' | 'subinterface' | 'dhcp-pool' | 'dhcp-relay' | 'static-route' | 'ospf' | 'eigrp' | 'bgp' | 'acl' | 'nat' | 'ssh' | 'tunnel';
```

---

## 6. PT-Safe Build Gate

### Responsabilidad
Validar que el código generado para PT es realmente ejecutable en Qt Script Engine (ES5).

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│            PT-Safe Build Gate (pt-runtime)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐             │
│  │ ASTValidator      │    │ ES5Lowering       │             │
│  │ - detect let/const │    │ - arrow → func    │             │
│  │ - detect classes  │    │ - template → concat│           │
│  │ - detect async   │    │ - class → prototype│           │
│  │ - detect modern  │    │ - const → var      │             │
│  └───────────────────┘    └───────────────────┘             │
│           │                         │                        │
│           └─────────────┬──────────┘                        │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SnapshotValidator                      │    │
│  │  - diff vs baseline                                │    │
│  │  - golden tests                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Reglas de Detección

| Patrón | Allowed | Notas |
|--------|---------|-------|
| `let`, `const` | ❌ | Usar `var` |
| `=>` arrow | ❌ | Usar `function` |
| `` ` `` template | ❌ | Usar `+` concat |
| `async`/`await` | ❌ | Usar callbacks |
| `class extends` | ⚠️ warning | Prefer function + prototype |
| `...` spread | ❌ | Usar concat.apply |
| `?.` optional chaining | ❌ | Usar && checks |
| `??` nullish | ❌ | Usar `||` |
| `for...of` | ❌ | Usar for clásico |
| `Symbol` | ❌ | No existe en Qt |
| `Promise` | ❌ | No existe en Qt |

---

## 7. Change Planner con Rollback

### Responsabilidad
Compilar operaciones de alto nivel a pasos verificables con checkpoints y rollback semántico.

### Flujo

```
Operation Intent → Prechecks → Steps → Checkpoints → Verification → Rollback (if fail)
```

### Interfaz

```typescript
interface IChangePlannerService {
  compileOperation(intent: OperationIntent): Promise<DeferredJobPlan>;
  executeWithCheckpoint(plan: DeferredJobPlan): Promise<ExecutionResult>;
  rollback(plan: DeferredJobPlan, failureAt: number): Promise<RollbackResult>;
}

interface DeferredJobPlan {
  prechecks: Precheck[];
  steps: DeferredStep[];
  checkpoints: Checkpoint[];
  rollback?: RollbackConfig;
}
```

---

## 8. Evidence Ledger

### Responsabilidad
Trazabilidad completa de cada operación.

```typescript
interface IEvidenceLedgerService {
  record(op: OperationRecord): void;
  get(operationId: string): OperationRecord;
  getByDevice(device: string): OperationRecord[];
  explain(operationId: string): string;
}

interface OperationRecord {
  id: string;
  timestamp: Date;
  intent: string;
  commands: string[];
  outputs: string[];
  verifications: VerificationRecord[];
  result: 'success' | 'partial' | 'failed';
  drift?: string[];
}
```

---

## Orden de Implementación (Prioridad por Valor)

1. **Terminal Policy Engine** — Hacer IOS confiable
2. **Topology Lint + Intent Drift** — Feature más útil para labs/agentes
3. **Server-PT DHCP Appliance** — Superficie PT útil
4. **Capability Matrix v2** — Base para decisiones inteligentes
5. **PT-Safe Build Gate** — Prevenir bugs en runtime PT
6. **Change Planner** — Seguridad en operaciones complejas
7. **Evidence Ledger** — Trazabilidad
8. **Diagnosis Service** — Feature killer (orquestador)

---

## Archivos a Crear/Modificar

### Nuevos archivos (pt-control)

- `packages/pt-control/src/application/services/terminal-policy-engine.ts`
- `packages/pt-control/src/application/services/topology-lint-service.ts`
- `packages/pt-control/src/application/services/dhcp-appliance-service.ts`
- `packages/pt-control/src/application/services/diagnosis-service.ts`
- `packages/pt-control/src/application/services/capability-matrix-service.ts`
- `packages/pt-control/src/application/services/change-planner-service.ts`
- `packages/pt-control/src/application/services/evidence-ledger-service.ts`

### Nuevos archivos (pt-runtime)

- `packages/pt-runtime/src/build/ast-pt-safe-validator.ts`
- `packages/pt-runtime/src/build/es5-lowering.ts`
- `packages/pt-runtime/src/build/snapshot-validator.ts`

### Modificar (existente)

- `packages/pt-control/src/agent/agent-context-service.ts` — Exponer diagnosis
- `packages/pt-runtime/src/pt/kernel/main.ts` — Integrar policy engine

---

## Dependencias entre Módulos

```
Diagnosis Service
    ├── Verification IOS (existente)
    ├── Topology Lint ──────┐
    │                       │
    ├── Capability Matrix   │
    │                       │
    └───────────────────────┘

Topology Lint
    └── Blueprint (incremental)
           ├── IOS Semantic Service (existente)
           └── DHCP Appliance

Terminal Policy
    └── TerminalEngine (existente in-PT)
    └── Kernel (existente)

Capability Matrix
    └── ios-domain (existente)
    └── pt-runtime/validated-models

Change Planner
    ├── IOS Semantic Service
    ├── Topology Lint
    └── Terminal Policy

Evidence Ledger
    └── Todos los servicios
```

---

## Consideraciones de Tiempo Real

El diagnóstico causal requiere:

1. **Observable state** — el kernel ya expone `getDeviceByName`, `listDevices`
2. **Event stream** — el TerminalEngine ya tiene eventos (outputWritten, commandEnded)
3. **Polling intervals** — el kernel ya tiene commandPollInterval, deferredPollInterval

El stack completo necesita:
- Un "diagnostic loop" que consulte estado + ejecute verification checks + correlacione drift
- Capacidad de responder queries async desde CLI mientras PT corre