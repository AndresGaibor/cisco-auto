# Fase 7: Consolidación Final

## Arquitectura Final

### pt-runtime = Kernel Mínimo + Terminal Engine + Primitives + Omni Adapters + Catalog + Compat/Build

```
┌─────────────────────────────────────────────────────────────┐
│ pt-runtime                                                 │
├─────────────────────────────────────────────────────────────┤
│ [Kernel Mínimo]                                           │
│   - Lifecycle management (bootstrap, poll, delegate)      │
│   - Command queue processing                               │
│   - Result writing                                        │
│   - Deferred job execution                                 │
├─────────────────────────────────────────────────────────────┤
│ [Terminal Engine]                                         │
│   - PT terminal emulation                                  │
│   - CLI output processing                                 │
│   - ANSI parsing                                          │
├─────────────────────────────────────────────────────────────┤
│ [Primitives PT-safe]                                       │
│   - device operations (add, remove, move)                 │
│   - link operations (connect, disconnect)                  │
│   - config basic (ip, hostname)                            │
│   - exec basic (show commands)                            │
├─────────────────────────────────────────────────────────────┤
│ [Omni Adapters]                                           │
│   - ipc bridge                                            │
│   - network bridge                                        │
│   - privileged bridge                                    │
├─────────────────────────────────────────────────────────────┤
│ [Catalog + Compat/Build]                                  │
│   - Device model catalog                                   │
│   - ES5 validation                                      │
│   - Build orchestration                                  │
└─────────────────────────────────────────────────────────────┘
```

### pt-control = Cerebro (Orchestrator, Planners, Workflows, Verification, Diagnosis, Fallback, Omni Harness, Quality/Release)

```
┌─────────────────────────────────────────────────────────────┐
│ pt-control                                                │
├─────────────────────────────────────────────────────────────┤
│ [Orchestrator]                                            │
│   - Command routing                                       │
│   - Workflow execution                                   │
│   - Error handling                                       │
├─────────────────────────────────────────────────────────────┤
│ [Planners]                                               │
│   - device-add planner                                   │
│   - link-add planner                                     │
│   - config planner                                      │
│   - lab validation planner                              │
├─────────────────────────────────────────────────────────────┤
│ [Workflows]                                              │
│   - workflow:device-add                                  │
│   - workflow:link-add                                   │
│   - workflow:vlan-config                               │
│   - workflow:dhcp-config                               │
├─────────────────────────────────────────────────────────────┤
│ [Verification]                                           │
│   - Topology verification                                │
│   - Config verification                                  │
│   - Connectivity verification                            │
├─────────────────────────────────────────────────────────────┤
│ [Diagnosis]                                             │
│   - Error diagnosis                                      │
│   - Failure analysis                                     │
│   - Root cause identification                            │
├─────────────────────────────────────────────────────────────┤
│ [Fallback]                                               │
│   - Omni fallback for failures                            │
│   - Retry logic                                          │
│   - Recovery strategies                                  │
├─────────────────────────────────────────────────────────────┤
│ [Omni Harness]                                           │
│   - Capability execution                                 │
│   - Evidence collection                                  │
│   - Result normalization                                  │
├─────────────────────────────────────────────────────────────┤
│ [Quality/Release]                                        │
│   - Quality gates                                       │
│   - Release validation                                   │
│   - Baseline verification                               │
└─────────────────────────────────────────────────────────────┘
```

### omni = Capability Registry + Runner + Suites + Evidence Ledger + Support Matrix + Regression Compare

```
┌─────────────────────────────────────────────────────────────┐
│ omni                                                    │
├────���────────────────────────────────────────────────────────┤
│ [Capability Registry]                                   │
│   - capability:name → implementation map                │
│   - capability:version                                   │
│   - capability:dependencies                             │
│   - capability:supported flag                           │
├─────────────────────────────────────────────────────────────┤
│ [Runner]                                                 │
│   - Capability execution                                 │
│   - Parameter validation                                 │
│   - Timeout handling                                     │
├─────────────────────────────────────────────────────────────┤
│ [Suites]                                                 │
│   - regression-smoke                                     │
│   - terminal-core                                        │
│   - device-basic                                         │
│   - link-basic                                           │
│   - workflow-basic                                       │
│   - omni-safe                                            │
├─────────────────────────────────────────────────────────────┤
│ [Evidence Ledger]                                        │
│   - Execution timestamp                                  │
│   - Input parameters                                     │
│   - Output results                                       │
│   - Success/failure status                                │
│   - Evidence artifacts                                   │
├─────────────────────────────────────────────────────────────┤
│ [Support Matrix]                                         │
│   - Capability → Support level (stable/experimental)       │
│   - Version constraints                                  │
│   - PT version requirements                              │
├─────────────────────────────────────────────────────────────┤
│ [Regression Compare]                                     │
│   - Baseline comparison                                  │
│   - Delta detection                                       │
│   - Confidence scoring                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Qué Ya NO Existe Como Patrón Válido

###❌ Lógica Alta en Runtime

El runtime NO debe contener lógica de negocio compuesta. Cualquier handler que requiera múltiples pasos, planificación, o decisiones debe vivir en pt-control como workflow.

```typescript
// ❌ INVÁLIDO - Lógica alta en runtime
runtime.handleVlanConfig = async (payload) => {
  // Verificar dispositivo existe
  // Crear VLAN
  // Asignar puertos
  // Verificar resultado
  // retries si falla
};

// ✅ VÁLIDO - Solo primitiva baixa
runtime.handleVlanCreate = async (payload) => {
  // Solo creación directa, sin validación compuesta
};
```

###❌ Hacks Sin Contract

Todo hack o bypass debe documentarse como capability en omni con contract explícito.

```typescript
// ❌ INVÁLIDO - Hack sin documentación
function workaround() {
  // Magic que funciona pero no se sabe por qué
}

// ✅ VÁLIDO - Capability documentada
const capabilitySkipBoot = {
  name: 'device:skipBoot',
  contract: { device: '<string>' },
  supported: true,
  description: 'Fuerza skip boot en dispositivo'
};
```

###❌ Scripts PT Por Fuera de Omni

Todo script inyectado en PT debe pasar por el harness de omni.

```typescript
// ❌ INVÁLIDO - Script directo sin tracking
await ipc.evalJavaScript('router.send("enable")');

// ✅ VÁLIDO - Via omni capability
await omni.execute('exec:ios', { device: 'router', cmd: 'enable' });
```

###❌ Éxito Sintético

El success solo es válido si viene de evidencia real de PT, no de asunciones.

```typescript
// ❌ INVÁLIDO - Éxito sintético
return { success: true }; // Asumido sin verificar

// ✅ VÁLIDO - Éxito basado en evidencia
const result = await ipc.cli('show ip int brief');
return { success: result.includes('Interface') };
```

###❌ CLI Que Salte el Orchestrator

La CLI siempre debe pasar por el orchestrator de pt-control.

```bash
# ❌ INVÁLIDO - Acceso directo
nc -U /tmp/pt.sock < commands/test.json

# ✅ VÁLIDO - Via CLI oficial
bun run pt device add 1841 R1
```

###❌ Build Sin Validator PT-Safe

Todo build debe pasar el validador ES5 y PT-safe antes de deploy.

```bash
# ❌ INVÁLIDO - Build directo
cat runtime.js > ~/pt-dev/runtime.js

# ✅ VÁLIDO - Con validación
bun run pt:build  # Valida ES5 y PT-safe automáticamente
```

---

## Restricciones Permanentes

### main.js = Kernel Mínimo (No Workflows)

main.js SOLO maneja lifecycle. No contiene lógica de negocio.

```
main.js responsibilities:
  ✓ Bootstrap runtime.js
  ✓ Poll commands/
  ✓ Delegate to runtime
  ✓ Write results/
  ✓ Handle deferred jobs

main.js MUST NOT:
  ✗ Contain workflow logic
  ✗ Make planning decisions
  ✗ Handle multi-step operations
  ✗ Contain verification logic
```

### runtime = Solo Primitives y Handlers Bajos

runtime contiene operaciones atómicas de bajo nivel.

```
runtime responsibilities:
  ✓ device:add (creación directa)
  ✓ device:remove (eliminación directa)
  ✓ link:connect (conexión directa)
  ✓ link:disconnect (desconexión directa)
  ✓ exec:ios (ejecución de comando)
  ✓ config:set (configuración directa)

runtime MUST NOT:
  ✗ Contain complex validation
  ✗ Make retry decisions
  ✗ Plan multi-step operations
  ✗ Verify topology state
```

### TODO Debe Pasar Validación PT-Safe/ES5

Todo código destinado a PT debe pasar validación previa.

```bash
# Validación requerida antes de deploy:
bun run pt:validate-es5   # ES5 syntax check
bun run pt:validate-pt   # PT-safe check
bun run pt:build         # Build + deploy
```

### Nueva Capability = Entrar Como Primitive, Omni Adapter, o Workflow

Toda nueva capability debe seguir una de estas tres vías.

```
Vía Primitive (pt-runtime):
  ├── Se ejecuta en runtime.js
  ├── Acceso directo a PT
  └── Para operaciones atómicas

Vía Omni Adapter (omni/):
  ├── Wrapper alrededor de primitive
  ├── Manejo de errores
  └── Logging/evidence

Vía Workflow (pt-control):
  ├── Orquestación de múltiples pasos
  ├── Planning y decisiones
  └── Verificación compuestos
```

---

## Resumen de la Fase 7

| Componente | Scope | Restricción |
|------------|-------|-------------|
| main.js | Kernel mínimo | Sin workflows |
| runtime | Primitives baixas | Sin lógica alta |
| omni | Capabilities | Con contract |
| pt-control | Orchestration | Workflows solos |

La Fase 7 establece las bases para un sistema mantenible y predecible donde cada componente tiene responsabilidades claras y delimitadas.