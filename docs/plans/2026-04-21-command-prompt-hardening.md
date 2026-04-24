# Command Prompt Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Volver canónico, robusto y reusable el soporte de `Command Prompt` para PCs/Servers, evitando falsos positivos, output vacío, sleeps ad hoc y lógica duplicada por comando.

**Architecture:** Unificar la ejecución de comandos host alrededor de un solo pipeline: `pt-control` construye planes y verifica evidencia; `pt-runtime` ejecuta el plan y devuelve output crudo confiable por comando. Eliminar bypasses directos con `omni.evaluate.raw` y consolidar `ping`, `ipconfig`, `tracert`, `arp` y futuros comandos sobre el mismo contrato.

**Tech Stack:** Bun, TypeScript, `pt-control`, `pt-runtime`, terminal plans, evidence parsers/verifiers, Packet Tracer runtime handlers.

---

## Contexto clave

- Hoy hay varios caminos rotos o duplicados:
  - `packages/pt-control/src/controller/index.ts:229` tiene un path ad hoc para `sendPing`.
  - `packages/pt-control/src/application/services/omniscience-service.ts:123` duplica `sendPing`.
  - `packages/pt-control/src/adapters/runtime-terminal-adapter.ts:98` quiere usar `execInteractive`.
  - `packages/pt-runtime/src/handlers/runtime-handlers.ts:137-143` no registra `execInteractive`.
- La base correcta ya existe:
  - `packages/pt-control/src/pt/terminal/standard-terminal-plans.ts`
  - `packages/pt-control/src/pt/terminal/terminal-output-parsers.ts`
  - `packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts`
  - `packages/pt-runtime/src/terminal/standard-plans.ts`
- El bug de fondo no es solo `ping`; es la falta de un contrato único para comandos host.

---

### Task 1: Alinear el contrato público del terminal host

**Files:**
- Modify: `packages/pt-control/src/ports/runtime-terminal-port.ts`
- Modify: `packages/pt-control/src/adapters/runtime-terminal-adapter.ts`
- Modify: `packages/pt-runtime/src/handlers/runtime-handlers.ts`
- Test: `packages/pt-control/src/__tests__/adapters/runtime-terminal-adapter.test.ts` or create if missing
- Test: `packages/pt-runtime/src/__tests__/handlers/runtime-handlers.test.ts` or create if missing

**Step 1: Write the failing test**

Crear un test que pruebe que `RuntimeTerminalAdapter.runTerminalPlan()` no depende de un comando inexistente o inconsistente.

Caso mínimo:
- un `TerminalPlan` host con `ping 192.168.10.10`
- el adapter debe invocar un contrato runtime canónico para terminal host/interactivo
- no debe usar paths ad hoc por comando

**Step 2: Run test to verify it fails**

Run: `bun test packages/pt-control/src/__tests__/adapters/runtime-terminal-adapter.test.ts`
Expected: FAIL porque el contrato actual está partido entre `execInteractive`, `execPc` y bypasses.

**Step 3: Write minimal implementation**

Objetivo:
- decidir un contrato único y explícito, preferiblemente uno de estos:
  - `execInteractive` registrado de verdad en runtime
  - o `terminal.runPlan` / `terminal.exec`
- mi recomendación: **registrar un handler canónico para ejecución interactiva/host** y hacer que `RuntimeTerminalAdapter` use solo ese.

**Step 4: Run test to verify it passes**

Run: `bun test packages/pt-control/src/__tests__/adapters/runtime-terminal-adapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/pt-control/src/ports/runtime-terminal-port.ts \
  packages/pt-control/src/adapters/runtime-terminal-adapter.ts \
  packages/pt-runtime/src/handlers/runtime-handlers.ts \
  packages/pt-control/src/__tests__/adapters/runtime-terminal-adapter.test.ts
git commit -m "refactor: unify host terminal runtime contract"
```

---

### Task 2: Hacer que runtime ejecute host commands con un solo engine

**Files:**
- Modify: `packages/pt-runtime/src/handlers/ios-execution.ts`
- Modify: `packages/pt-runtime/src/terminal/command-executor.ts`
- Modify: `packages/pt-runtime/src/terminal/prompt-detector.ts`
- Modify: `packages/pt-runtime/src/terminal/session-state.ts` if needed
- Test: `packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts`
- Test: create `packages/pt-runtime/src/__tests__/terminal/command-executor-host.test.ts`

**Step 1: Write the failing test**

Agregar tests para host commands:
- `ping` devuelve output real completo
- `ipconfig` devuelve output completo
- `tracert` espera hasta finalizar
- `arp -a` devuelve output sin vacío falso

Casos críticos:
- output no vacío
- prompt vuelve a `C:\>`
- `Ping statistics` presente cuando corresponde
- no éxito sintético

**Step 2: Run test to verify it fails**

Run:
```bash
bun test packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts
bun test packages/pt-runtime/src/__tests__/terminal/command-executor-host.test.ts
```

Expected: FAIL en casos host o coverage insuficiente.

**Step 3: Write minimal implementation**

Objetivo:
- `handleExecPc` y el camino interactivo host deben usar el mismo `command-executor`
- `handlePing` no debe tener rama especial PC con `deferred` incompleto
- eliminar o deprecar `__ping` como primitive especial para PCs
- el fin de comando debe ser estructural:
  - `commandEnded`, o
  - prompt retornado, o
  - condiciones host-busy + cierre consistente

**Step 4: Run test to verify it passes**

Run:
```bash
bun test packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts
bun test packages/pt-runtime/src/__tests__/terminal/command-executor-host.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/pt-runtime/src/handlers/ios-execution.ts \
  packages/pt-runtime/src/terminal/command-executor.ts \
  packages/pt-runtime/src/terminal/prompt-detector.ts \
  packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts \
  packages/pt-runtime/src/__tests__/terminal/command-executor-host.test.ts
git commit -m "refactor: harden host command execution"
```

---

### Task 3: Unificar `ping` sobre terminal plans y borrar bypasses

**Files:**
- Modify: `packages/pt-control/src/controller/index.ts`
- Modify: `packages/pt-control/src/application/services/omniscience-service.ts`
- Modify: `packages/pt-control/src/omni/capability-runner.ts`
- Modify: `packages/pt-control/src/omni/handlers/terminal-handlers.ts`
- Test: create `packages/pt-control/src/__tests__/controller/send-ping.test.ts`
- Test: update `packages/pt-control/src/__tests__/application/services/omniscience-service.test.ts`

**Step 1: Write the failing test**

Crear tests que prueben:
- `PTController.sendPing()` usa el pipeline canónico de terminal
- `OmniscienceService.sendPing()` deja de hacer `sleep + getOutput`
- mismo raw/veredicto para timeout y success

Casos:
- `Request timed out` => `success: false`
- `Reply from ...` => `success: true`
- output vacío => error o inconclusive, no success

**Step 2: Run test to verify it fails**

Run:
```bash
bun test packages/pt-control/src/__tests__/controller/send-ping.test.ts
bun test packages/pt-control/src/__tests__/application/services/omniscience-service.test.ts
```

Expected: FAIL con la implementación actual o con mocks viejos.

**Step 3: Write minimal implementation**

Objetivo:
- `sendPing()` debe construir `createHostPingPlan(...)`
- ejecutar por `terminalPort.runTerminalPlan(...)`
- parsear con `parseTerminalOutput("host.ping", ...)`
- verificar con `verifyTerminalEvidence(...)`
- `OmniscienceService.sendPing()` debe ser wrapper del mismo camino o delegar al controller/capability runner

**Step 4: Run test to verify it passes**

Run:
```bash
bun test packages/pt-control/src/__tests__/controller/send-ping.test.ts
bun test packages/pt-control/src/__tests__/application/services/omniscience-service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/pt-control/src/controller/index.ts \
  packages/pt-control/src/application/services/omniscience-service.ts \
  packages/pt-control/src/__tests__/controller/send-ping.test.ts \
  packages/pt-control/src/__tests__/application/services/omniscience-service.test.ts
git commit -m "refactor: route ping through terminal plans"
```

---

### Task 4: Hacer robusto el veredicto semántico de host commands

**Files:**
- Modify: `packages/pt-control/src/pt/terminal/terminal-output-parsers.ts`
- Modify: `packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts`
- Test: create `packages/pt-control/src/pt/terminal/terminal-output-parsers.test.ts`
- Test: create `packages/pt-control/src/pt/terminal/terminal-evidence-verifier.test.ts`

**Step 1: Write the failing test**

Agregar tests para:
- `host.ping` con estadísticas pero 0 replies => ejecución válida pero conectividad fallida
- `host.ping` con replies => success
- `host.tracert` => evidencia suficiente
- `host.arp` => evidencia suficiente con entries
- output vacío => no evidencia

**Step 2: Run test to verify it fails**

Run:
```bash
bun test packages/pt-control/src/pt/terminal/terminal-output-parsers.test.ts
bun test packages/pt-control/src/pt/terminal/terminal-evidence-verifier.test.ts
```

Expected: FAIL porque hoy `host.ping` usa `ok = hasStatistics`.

**Step 3: Write minimal implementation**

Objetivo:
- separar:
  - `executionOk`
  - `evidenceOk`
  - `semanticSuccess`
- mínimo aceptable:
  - `host.ping`: `ok` no debe significar conectividad exitosa
  - agregar facts como `packetLoss`, `sent`, `received`
  - devolver una razón clara para timeout, unreachable, inconclusive
- agregar verifier dedicado para:
  - `host.tracert`
  - `host.arp`

**Step 4: Run test to verify it passes**

Run:
```bash
bun test packages/pt-control/src/pt/terminal/terminal-output-parsers.test.ts
bun test packages/pt-control/src/pt/terminal/terminal-evidence-verifier.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/pt-control/src/pt/terminal/terminal-output-parsers.ts \
  packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts \
  packages/pt-control/src/pt/terminal/terminal-output-parsers.test.ts \
  packages/pt-control/src/pt/terminal/terminal-evidence-verifier.test.ts
git commit -m "feat: strengthen host terminal evidence verification"
```

---

### Task 5: Generalizar el Command Prompt API para nuevos comandos

**Files:**
- Modify: `packages/pt-control/src/pt/terminal/standard-terminal-plans.ts`
- Modify: `packages/pt-control/src/omni/capability-registry.ts`
- Modify: `packages/pt-control/src/omni/handlers/terminal-handlers.ts`
- Test: create `packages/pt-control/src/__tests__/omni/host-command-capabilities.test.ts`

**Step 1: Write the failing test**

Agregar tests para un patrón reusable:
- `host.command` genérico
- wrappers concretos `host.ipconfig`, `host.ping`, `host.tracert`, `host.arp`
- cualquier nuevo comando de `Command Prompt` debe entrar por el mismo builder

**Step 2: Run test to verify it fails**

Run:
```bash
bun test packages/pt-control/src/__tests__/omni/host-command-capabilities.test.ts
```

Expected: FAIL si el catálogo sigue demasiado especial-cased.

**Step 3: Write minimal implementation**

Objetivo:
- consolidar `createHostCommandPlan(device, command, options)` como base
- dejar wrappers solo como azúcar
- capability registry debe preferir terminal handler común para host
- documentar qué comandos host tienen parser/verifier específico y cuáles quedan como raw evidence

**Step 4: Run test to verify it passes**

Run:
```bash
bun test packages/pt-control/src/__tests__/omni/host-command-capabilities.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/pt-control/src/pt/terminal/standard-terminal-plans.ts \
  packages/pt-control/src/omni/capability-registry.ts \
  packages/pt-control/src/omni/handlers/terminal-handlers.ts \
  packages/pt-control/src/__tests__/omni/host-command-capabilities.test.ts
git commit -m "feat: generalize command prompt capabilities"
```

---

### Task 6: Migrar callers y eliminar caminos legacy

**Files:**
- Modify: `apps/pt-cli/src/commands/ping.ts`
- Modify: `apps/pt-cli/src/commands/check.ts`
- Modify: `packages/pt-control/src/verification/scenarios/host-command-prompt-connectivity.scenario.ts`
- Modify: any callers found via search for `sendPing(`, `execPc`, `__ping`, `getOutput()`
- Test: relevant CLI/scenario tests

**Step 1: Write the failing test**

Casos:
- CLI `ping` usa el raw limpio del pipeline canónico
- `check.ts` deja de parsear strings a mano si puede consumir parser común
- escenario host usa verifier común, no `includes("TTL")`

**Step 2: Run test to verify it fails**

Run targeted tests for the touched callers.

**Step 3: Write minimal implementation**

Objetivo:
- reemplazar heurísticas manuales por parser/verifier común
- eliminar dependencias directas de `__ping`, `execPc` o `omni.evaluate.raw` para host commands funcionales
- dejar `omni raw` solo para debugging/forense

**Step 4: Run test to verify it passes**

Run targeted tests again.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/commands/ping.ts \
  apps/pt-cli/src/commands/check.ts \
  packages/pt-control/src/verification/scenarios/host-command-prompt-connectivity.scenario.ts
git commit -m "refactor: migrate host command callers to shared pipeline"
```

---

### Task 7: Verificación end-to-end real en Packet Tracer

**Files:**
- No code first; verification runbook
- Optionally create: `docs/testing/command-prompt-hardening.md`

**Step 1: Prepare manual matrix**

Validar estos comandos en PC real:
- `bun run pt ping PC1 192.168.10.1`
- `bun run pt ping PC1 192.168.10.10`
- comando equivalente para `ipconfig`
- comando equivalente para `tracert`
- comando equivalente para `arp -a`

**Step 2: Run matrix**

Expected:
- sin output vacío falso
- sin `[object Object]`
- sin sleeps ad hoc visibles
- timeout/failure detectado correctamente
- success detectado correctamente
- raw limpio del comando actual, no historial contaminado

**Step 3: Run automated verification**

Run:
```bash
bun test
bun run lint
bun run typecheck
```

Expected:
- solo fallos preexistentes fuera del scope, si todavía existen
- ningún fallo nuevo en áreas tocadas

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify command prompt hardening end to end"
```

---

## Decisiones recomendadas

1. **Canónico**: `Command Prompt` debe vivir sobre `TerminalPlan`.
2. **No canónico**: `sleep + getOutput()` solo como fallback forense, no path principal.
3. **Semántica**:
   - `runtime` ejecuta y devuelve evidencia cruda
   - `control` parsea y decide veredicto
4. **Eliminar**:
   - `__ping` como primitive especial para PC
   - duplicación entre `PTController.sendPing()` y `OmniscienceService.sendPing()`
5. **Añadir**:
   - tests dedicados para host command executor
   - verifiers específicos para `host.tracert` y `host.arp`

## Riesgos

1. Hay drift entre contratos de `execInteractive` y handlers realmente registrados.
2. Hay bastante deuda previa de typecheck/lint en el repo; conviene verificar por paquetes y por tests tocados.
3. Si unificas demasiado rápido sin tests host dedicados, puedes romper IOS o escenarios existentes.

## Orden de ejecución recomendado

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7

## Recomendación pragmática

Si quieres máximo impacto con mínimo riesgo, empezaría por este recorte:
1. Unificar contrato runtime/adapter
2. Endurecer `command-executor` host
3. Migrar `ping`
4. Recién después generalizar al resto de `Command Prompt`
