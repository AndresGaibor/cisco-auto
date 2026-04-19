# PT Stack v2 - Módulos Avanzados

Documentación de los 8 módulos avanzados implementados en el stack PT.

## Índice

1. [Terminal Policy Engine](#1-terminal-policy-engine)
2. [Topology Lint + Intent Drift](#2-topology-lint--intent-drift)
3. [Server-PT DHCP Appliance](#3-server-pt-dhcp-appliance)
4. [Capability Matrix v2](#4-capability-matrix-v2)
5. [PT-Safe Build Gate](#5-pt-safe-build-gate)
6. [Change Planner with Rollback](#6-change-planner-with-rollback)
7. [Evidence Ledger](#7-evidence-ledger)
8. [Diagnosis Service](#8-diagnosis-service)

---

## 1. Terminal Policy Engine

Gestión avanzada de sesiones IOS con políticas de diálogo y arbitraje.

### Archivos

```
packages/pt-control/src/pt/terminal/
├── policy-types.ts       # Tipos: PolicyState, DialogType, SessionMode
├── policy-manager.ts     # Gestor de estado por dispositivo
├── dialog-resolver.ts    # Resolvedor de diálogos (--More, confirm, setup)
├── session-arbiter.ts    # Arbitraje de jobs por dispositivo
├── mode-transition.ts    # Transiciones de modo válidas
└── terminal-policy-engine.ts  # Orquestador principal
```

### Uso

```typescript
import { createTerminalPolicyEngine } from '@cisco-auto/pt-control';

const engine = createTerminalPolicyEngine();

// Enviar comando con política
const result = await engine.sendCommand('R1', 'show ip interface brief');

// Ejecutar con reintentos y timeout
const execResult = await engine.executeWithPolicy('R1', 'configure terminal', {
  timeoutMs: 30000,
  retryCount: 3,
  dialogHandling: 'auto'
});

// Obtener estado actual
const state = engine.getPolicyState('R1');
```

### CLI

```bash
# Ver estado de política de un dispositivo
pt terminal state R1

# Ejecutar comando con política
pt terminal exec R1 "show ip route" --timeout 30000
```

---

## 2. Topology Lint + Intent Drift

Validación de topología y detección de drift entre blueprint y estado observado.

### Archivos

```
packages/pt-control/src/pt/topology/
├── topology-lint-types.ts  # Tipos: LintRule, LintResult, DriftQueryResult
├── blueprint-store.ts      # Almacén de operaciones incrementales
├── lint-rule-engine.ts    # Motor con 12 reglas de validación
├── drift-detector.ts      # Detector de drift entre blueprint y observado
└── topology-lint-service.ts  # Orquestador principal
```

### Reglas de Validación (12)

1. `ipDuplicate` - IP duplicada en múltiples interfaces
2. `subnetNoGateway` - Subred sin gateway configurado
3. `accessPortVlanMissing` - Puerto access sin VLAN asignada
4. `trunkVlanNotAllowed` - VLAN no permitida en trunk
5. `nativeVlanMismatch` - Native VLAN diferente entre enlaces
6. `subinterfaceEncaps` - Encapsulación faltante en subinterfaz
7. `dhcpPoolSubnetMismatch` - Pool DHCP no coincide con subred
8. `dhcpHelperMissing` - Helper address faltante para DHCP relay
9. `aclNotApplied` - ACL creada pero no aplicada
10. `staticRouteNoReach` - Ruta estática con next-hop inalcanzable
11. `orphanLink` - Enlace sin dispositivos asociados
12. `portConflict` - Conflicto de puerto entre dispositivos

### Uso

```typescript
import { createTopologyLintService } from '@cisco-auto/pt-control';

const lintService = createTopologyLintService();

// Registrar operación en blueprint
await lintService.recordOperation({
  type: 'CONFIGURE_VLAN',
  device: 'S1',
  parameters: { vlanId: 10, name: 'ADMIN' }
});

// Ejecutar lint
const results = await lintService.lint();

// Query de drift
const drift = await lintService.queryDrift({ severity: 'critical' });
```

### CLI

```bash
# Validar topología completa
pt lint topology

# Ver drift detectado
pt lint drift --severity critical

# Ver blueprint actual
pt lint blueprint

# Listar reglas disponibles
pt lint rules
```

---

## 3. Server-PT DHCP Appliance

Servicio DHCP para servidores externos a Packet Tracer.

### Archivos

```
packages/pt-control/src/pt/server/
├── dhcp-appliance-types.ts  # Tipos: DhcpPoolConfig, DhcpLease
├── subnet-validator.ts       # Validador de subredes
├── dhcp-pool-manager.ts      # Gestor de pools DHCP
└── dhcp-appliance-service.ts  # Orquestador principal
```

### Uso

```typescript
import { createDhcpApplianceService } from '@cisco-auto/pt-control';

const dhcpService = createDhcpApplianceService();

// Crear pool DHCP
await dhcpService.createPool({
  name: 'LAN-POOL',
  network: '192.168.1.0',
  mask: '255.255.255.0',
  gateway: '192.168.1.1',
  dns: ['8.8.8.8'],
  leaseTime: 86400
});

// Obtener info del pool
const poolInfo = await dhcpService.getPoolInfo('LAN-POOL');

// Obtener leases activos
const leases = await dhcpService.getActiveLeases('LAN-POOL');

// Verificar si pool está agotado
const exhausted = await dhcpService.isPoolExhausted('LAN-POOL');
```

### CLI

```bash
# Crear pool DHCP en servidor
pt dhcp create POOL --network 192.168.1.0 --mask 255.255.255.0 --gateway 192.168.1.1

# Listar pools
pt dhcp list

# Ver leases
pt dhcp leases POOL

# Validar subred
pt dhcp validate 192.168.1.0/24 --gateway 192.168.1.1
```

---

## 4. Capability Matrix v2

Matriz de capacidades por modelo de dispositivo Cisco.

### Archivos

```
packages/kernel/src/domain/ios/capability-matrix/
├── capability-types.ts       # Tipos: SurfaceType, OperationType
├── model-capabilities.ts     # Capacidades por modelo (2901, 2911, 3650, etc.)
└── capability-matrix-service.ts  # Servicio de consulta
```

### Modelos Soportados

- Routers: 2901, 2911, 2921, 2950, 2960, 3650, 3660, 4321, 4341, 4351, 4451
- Switches: 2960, 2960-24TC-L, 2960-48TC-L, 3650-24PS, 3650-48PS, 3850-48T
- Dispositivos: Server-PT, Wireless-PT

### Superficies de Ejecución

- `ios` - IOS CLI nativo
- `hostport` - Puerto de host
- `dhcp-appliance` - Servidor DHCP externo

### Uso

```typescript
import { createCapabilityMatrixService } from '@cisco-auto/pt-control';

const capService = createCapabilityMatrixService();

// Obtener capacidades de dispositivo
const caps = capService.getCapabilities('2911');

// Verificar si puede ejecutar operación
const canVlan = capService.canExecute('2960', 'vlan');
const canDhcp = capService.canExecute('2911', 'dhcp-pool');

// Obtener superficie recomendada
const surface = capService.getRecommendedSurface('2911', 'dhcp-pool');

// Obtener parsers disponibles
const parsers = capService.getAvailableParsers('2911');
```

### CLI

```bash
# Ver capacidades de modelo
pt capability model 2911

# Ver operaciones soportadas
pt capability ops 2960

# Verificar operación
pt capability check 2911 dhcp-pool

# Listar todos los modelos
pt capability list
```

---

## 5. PT-Safe Build Gate

Validador de código JavaScript para ejecución en Packet Tracer.

### Archivos

```
packages/pt-runtime/src/build/
├── ast-pt-safe-validator.ts    # Validador de patrones AST
├── snapshot-validator.ts        # Comparador con baseline
└── index.ts                    # Exports
```

### Patrones PT-Unsafe

| Patrón | Alternativa PT-Safe |
|--------|---------------------|
| `let` / `const` | `var` |
| Arrow functions | `function` |
| Template literals | String concatenation |
| `async` / `await` | Callbacks o promises |
| `class extends` | Prototype |
| Spread operator | Direct assignment |
| Optional chaining | Manual null checks |
| Nullish coalescing | Ternary operators |
| `for...of` | Classic `for` loop |
| `Symbol` | Evitar |
| `Promise` | Callbacks |

### Uso

```typescript
import { createPTSafeValidator } from '@cisco-auto/pt-runtime';

const validator = createPTSafeValidator();

// Validar código
const result = validator.validate(`
  var x = 1;
  var fn = function(y) { return y + 1; };
`);

if (!result.valid) {
  console.error('Errores:', result.errors);
}

// Comparar con baseline
const diff = validator.compareWithBaseline(currentCode);
```

### CLI

```bash
# Validar archivo
pt build validate main.js

# Verificar contra baseline
pt build compare main.js

# Mostrar patrones PT-safe
pt build patterns
```

---

## 6. Change Planner with Rollback

Planificador de operaciones con checkpoints y rollback.

### Archivos

```
packages/pt-control/src/pt/planner/
├── change-planner-types.ts    # Tipos: OperationIntent, DeferredJobPlan
├── operation-compiler.ts       # Compilador de operaciones
├── checkpoint-executor.ts      # Ejecutor con verificación
└── change-planner-service.ts  # Orquestador principal
```

### Operaciones Compilables

- `router-on-a-stick` - Router con subinterfaces
- `vlan-segmentation` - Creación de VLANs
- `dhcp-service` - Servicio DHCP
- `routing-protocol` - OSPF/EIGRP/BGP
- `acl-security` - Listas de acceso
- `trunk-connection` - Enlaces trunk
- `access-layer` - Capa de acceso

### Uso

```typescript
import { createChangePlannerService } from '@cisco-auto/pt-control';

const planner = createChangePlannerService();

// Compilar operación
const plan = planner.compileOperation({
  type: 'router-on-a-stick',
  devices: ['R1', 'S1'],
  parameters: {
    vlans: [10, 20],
    subnets: ['192.168.10.0/24', '192.168.20.0/24']
  }
});

// Ejecutar con checkpoints
const result = await planner.executeWithCheckpoint(plan);

// Rollback si falla
if (!result.success) {
  const rollbackResult = await planner.rollback(plan, result.failedStep!);
}
```

### CLI

```bash
# Compilar operación
pt planner compile router-on-a-stick R1 S1 --vlans 10 20

# Ejecutar plan
pt planner execute plan-123

# Ver planes
pt planner list

# Rollback
pt planner rollback plan-123
```

---

## 7. Evidence Ledger

Trazabilidad completa de operaciones IOS.

### Archivos

```
packages/pt-control/src/pt/ledger/
├── evidence-types.ts          # Tipos: OperationRecord, VerificationRecord
└── evidence-ledger-service.ts # Servicio de trazabilidad
```

### Uso

```typescript
import { createEvidenceLedgerService } from '@cisco-auto/pt-control';

const ledger = createEvidenceLedgerService();

// Registrar operación
const opId = ledger.record({
  intent: 'create-vlan',
  device: 'S1',
  commands: ['vlan 10', 'name ADMIN'],
  result: 'success',
  durationMs: 1500
});

// Obtener operación
const op = ledger.get(opId);

// Query por dispositivo
const ops = ledger.getByDevice('S1');

// Explicar resultado
const explanation = ledger.explain(opId);

// Estadísticas
const stats = ledger.getStats();
```

### CLI

```bash
# Ver operación específica
pt ledger show op-123

# Listar operaciones por dispositivo
pt ledger device R1

# Query avanzado
pt ledger query --result failed --limit 10

# Ver estadísticas
pt ledger stats
```

---

## 8. Diagnosis Service

Diagnóstico causal de problemas en el lab (feature killer).

### Archivos

```
packages/pt-control/src/pt/diagnosis/
├── diagnosis-types.ts      # Tipos: Symptom, RootCause, Recommendation
├── diagnosis-engine.ts    # Motor de diagnóstico
└── diagnosis-service.ts   # Orquestador principal
```

### Síntomas Soportados

- `ping-fails` - Falla de conectividad
- `no-dhcp` - Sin obtener IP por DHCP
- `no-access` - Sin acceso a red
- `slow-performance` - Rendimiento lento
- `packet-loss` - Pérdida de paquetes
- `acl-block` - Tráfico bloqueado por ACL

### Categorías de Diagnóstico

- `connectivity` - Conectividad
- `routing` - Enrutamiento
- `switching` - Switching
- `dhcp` - DHCP
- `acl` - Listas de acceso
- `interface` - Interfaces
- `configuration` - Configuración

### Uso

```typescript
import { createDiagnosisService } from '@cisco-auto/pt-control';

const diagnosis = createDiagnosisService();

// Diagnóstico por síntomas
const result = await diagnosis.diagnose([
  {
    type: 'no-dhcp',
    devices: ['PC1'],
    details: 'No obtiene IP hace 1 hora'
  }
]);

// Ver resultados
console.log('Causas raíz:', result.rootCauses);
console.log('Recomendaciones:', result.recommendations);
console.log('Probabilidad de resolución:', result.resolutionProbability);

// Historial
const history = diagnosis.getHistory();
```

### CLI

```bash
# Diagnóstico por síntomas
pt diagnose ping-fails R1

# Diagnóstico completo
pt diagnose --device R1 --deep

# Ver historial
pt diagnose history

# Ver estadísticas
pt diagnose stats
```

---

## Integración CLI

Todos los módulos están disponibles via `bun run pt`:

```bash
# Terminal Policy
pt terminal state R1
pt terminal exec R1 "show run"

# Topology Lint
pt lint topology
pt lint drift

# DHCP
pt dhcp create POOL --network 192.168.1.0/24
pt dhcp list

# Capability
pt capability model 2911
pt capability check 2911 vlan

# Build
pt build validate main.js

# Planner
pt planner compile router-on-a-stick R1 S1

# Evidence
pt ledger show op-123

# Diagnosis
pt diagnose ping-fails R1
```

---

## Dependencias entre Servicios

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