# Fase 7: Regression Baseline

## Suites Baseline Mínimas

### regression-smoke (5 Core Capabilities)

Suite mínima de smoke que debe pasar siempre.

```
Suite: regression-smoke
Prerequisitos: PT corriendo, ~/pt-dev/main.js cargado

Capabilities probadas:
1. device:add   - Agregar dispositivo
2. device:list - Listar dispositivos
3. link:add   - Conectar dispositivos
4. exec:ios  - Ejecutar comando IOS
5. config:ip - Configurar IP
```

**Comando:**
```bash
bun run pt omni regression-smoke
```

**Output esperado:**
```
=== Regression Smoke ===
✓ device:add - <1s>
✓ device:list - <1s>
✓ link:add - <2s>
✓ exec:ios - <3s>
✓ config:ip - <1s>

=================================
5 capabilities probadas
5 passed, 0 failed
```

### terminal-core (Exec/Config Básica)

Suite de terminal para operaciones básicas de exec.

```
Suite: terminal-core
Prerequisitos: regression-smoke passed

Capabilities probadas:
1. terminal:connect     - Conectar a dispositivo
2. terminal:exec      - Exec básico
3. terminal:exec pager - Exec con pager
4. terminal:mode     - Cambio de modo
```

**Comando:**
```bash
bun run pt omni terminal-core
```

**Output esperado:**
```
=== Terminal Core ===
✓ terminal:connect - <1s>
✓ terminal:exec basic - <2s>
✓ terminal:exec pager - <3s>
✓ terminal:mode switch - <2s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### device-basic (Add/Remove/Move)

Suite de operaciones básicas de dispositivos.

```
Suite: device-basic
Prerequisitos: terminal-core passed

Capabilities probadas:
1. device:add    - Agregar
2. device:remove - Remover
3. device:move  - Mover
4. device:list  - Listar
```

**Comando:**
```bash
bun run pt omni device-basic
```

**Output esperado:**
```
=== Device Basic ===
✓ device:add - <1s>
✓ device:remove - <1s>
✓ device:move - <2s>
✓ device:list - <1s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### link-basic (Connect/Disconnect)

Suite de conexiones básicas.

```
Suite: link-basic
Prerequisitos: device-basic passed

Capabilities probadas:
1. link:add   - Conectar
2. link:remove - Desconectar
3. link:force - Forzar conexión
4. link:list  - Listar enlaces
```

**Comando:**
```bash
bun run pt omni link-basic
```

**Output esperado:**
```
=== Link Basic ===
✓ link:add - <1s>
✓ link:remove - <1s>
✓ link:force - <2s>
✓ link:list - <1s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### workflow-basic (Planos Simples)

Suite de workflows simples.

```
Suite: workflow-basic
Prerequisitos: link-basic passed

Capabilities probadas:
1. workflow:device-add  - Workflow device add
2. workflow:link-add   - Workflow link add
3. workflow:config-ip  - Workflow config IP
4. workflow:vlan      - Workflow VLAN simple
```

**Comando:**
```bash
bun run pt omni workflow-basic
```

**Output esperado:**
```
=== Workflow Basic ===
✓ workflow:device-add - <3s>
✓ workflow:link-add - <4s>
✓ workflow:config-ip - <3s>
✓ workflow:vlan - <5s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

### omni-safe (Capabilities Safe)

Suite de capabilities marked as safe.

```
Suite: omni-safe
Prerequisitos: workflow-basic passed

Capabilities probadas:
1. ipc:eval        - Eval JS
2. network:ping     - Ping
3. snapshot:create - Snapshot
4. omni:raw        - Raw execution
```

**Comando:**
```bash
bun run pt omni omni-safe
```

**Output esperado:**
```
=== Omni Safe ===
✓ ipc:eval - <2s>
✓ network:ping - <3s>
✓ snapshot:create - <2s>
✓ omni:raw - <3s>

=================================
4 capabilities probadas
4 passed, 0 failed
```

---

## Criterios de Regression Bloqueante

### Criterio 1: Supported → Broken

Si una capability marcada como `supported: true` falla, es regression bloqueante.

```typescript
// En capability registry:
const capabilityDeviceAdd = {
  name: 'device:add',
  supported: true,  // <--- supported flag
  confidence: 95
};

// Si supported=true Y falla = BLOQUEANTE
```

**Tabla de decision:**
| Capability Status | Result | Action |
|----------------|--------|--------|
| supported: true | failed | 🔴 BLOQUEAR release |
| supported: false | failed | 🟡 Advertir, continue |
| experimental | failed | 🟡 Advertir |

### Criterio 2: Aumento Fuerte de Flakiness

Si una capability pasa >95% → <70%, es regression.

```typescript
// Baseline: 95% pass rate
// Current: 68% pass rate
// Delta: -27%
// Classification: BLOQUEANTE
```

**Threshold de flakiness:**
```
Pass rate > 90%: ✅ ESTABLE
Pass rate 70-90%: 🟡 WARNING
Pass rate < 70%: 🔴 BLOCKING
```

### Criterio 3: Pérdida de Evidence

Si no se genera evidence para una execution, es regression.

```bash
# Evidence esperado
ls ~/.omni/evidence-*.json | wc -l

# Si menos del 100% de executions tienen evidence
# = BLOQUEANTE
```

### Criterio 4: Terminal-core Falla

Si terminal-core suite falla, es bloqueante.

```bash
# Si terminal-core falla
# = TODO EL RELEASE BLOQUEADO
# 
# Reason: terminal-core es prerequisito para todas las demás suites
```

---

## Criterios de Advertencia

### Criterio 1: Degradación Leve de Confidence

Si confidence baja de 95% → 85%, warning.

```typescript
// Baseline confidence: 95%
// Current confidence: 85%
// Delta: -10%
// Classification: ADVERTENCIA
```

### Criterio 2: Capability Experimental Inestable

Capabilities marked como `experimental` pueden fallar.

```typescript
const capabilitySkipBoot = {
  name: 'device:skipBoot',
  status: 'experimental',  // <-- experimental flag
  confidence: 70
};

// experimental + failed = WARNING (no blocking)
```

---

## Matriz de Status

| Suite | Bloqueante | Threshold |
|-------|-----------|-----------|
| regression-smoke | 🔴 SIEMPRE | 100% pass |
| terminal-core | 🔴 SIEMPRE | 100% pass |
| device-basic | 🟡 Si supported | 90% pass |
| link-basic | 🟡 Si supported | 90% pass |
| workflow-basic | 🟡 Si workflow | 85% pass |
| omni-safe | 🟡 Si safe | 90% pass |

---

## Baseline CI Integration

### GitHub Actions

```yaml
name: Regression Baseline

on: [push, pull_request]

jobs:
  baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Build
        run: bun run pt:build
      
      - name: Run regression-smoke
        run: bun run pt omni regression-smoke
      
      - name: Run terminal-core
        run: bun run pt omni terminal-core
      
      - name: Run device-basic
        run: bun run pt omni device-basic
      
      - name: Run link-basic
        run: bun run pt omni link-basic
      
      - name: Check results
        if: failure()
        run: |
          echo "🔴 Baseline failed"
          exit 1
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Solo smoke antes de commit
bun run pt omni regression-smoke || {
  echo "🔴 Smoke failed"
  exit 1
}
```

---

## Restauración de Baseline

### Si baseline falla

```bash
# 1. Verificar qué falló
bun run pt omni regression-smoke

# 2. Verificar PT corriendo
pgrep -fl "Packet Tracer"

# 3. Verificar main.js
ls -la ~/pt-dev/main.js

# 4. Rebuild si necesario
bun run pt:build

# 5. Recargar PT
# File > Open > ~/pt-dev/main.js

# 6. Re-run baseline
bun run pt omni regression-smoke
```

### Rollback de Capability

```bash
# Si capability específica falla
# Buscar última version estable

git log --oneline --all | head -20

# Revertir a stable commit
git checkout <stable-commit> -- packages/
```

---

## Registro de Baseline

### Evidence Collection

```bash
# Evidence se guarda en ~/.omni/evidence-*.json
# Formato:

{
  "suite": "regression-smoke",
  "timestamp": "2026-04-19T10:00:00Z",
  "status": "passed",
  "results": [
    { "capability": "device:add", "status": "passed", "duration": 1234 },
    { "capability": "device:list", "status": "passed", "duration": 1000 },
    ...
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "pass_rate": "100%"
  }
}
```