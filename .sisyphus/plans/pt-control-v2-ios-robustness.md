# Robustez IOS para PT Control v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convertir la capa IOS de `pt-control-v2` en una sesión CLI stateful, compatible con Packet Tracer y con el contrato `pt-extension`/`pt-control-v2`, sin mezclarla con el backend SSH/Telnet real.

**Architecture:** Separar el contrato de comando del transporte, normalizar el payload en la frontera PT, y mover el estado de CLI a una sesión dedicada dentro del runtime de Packet Tracer. El host sólo publica payloads y consume eventos; el runtime de PT maneja `enable`, modos `config`, paginación, confirmaciones y salida parseada según capacidades del dispositivo.

**Tech Stack:** Bun, TypeScript, Zod, Packet Tracer Script Module, NDJSON events, runtime generator de `pt-control-v2`.

## Contexto

### Hallazgos que justifican el plan
- El runtime legacy de `pt-extension` despacha con `payload.kind`.
- `pt-control-v2` despacha con `payload.type`.
- La capa IOS actual ejecuta comandos de forma síncrona y sin FSM de prompt.
- No existe `PromptStateMachine` ni `CliSession` dedicados.
- `show` se apoya en parsers/salida sintética, pero sin una capa robusta de validación de estados.

### Guardrails
- NO mezclar esta implementación con un backend SSH/Telnet real.
- NO expandir el alcance a canvas/workspace intelligence en este plan.
- NO inventar nuevos comandos; sólo endurecer el contrato y el flujo IOS existente.
- NO tocar paquetes ajenos salvo docs y la compatibilidad de `pt-extension` si hace falta.

## Execution Strategy

### Wave 1 — Contrato y compatibilidad
#### Task 1: Normalizar el contrato de comandos entre legacy y v2

**Files:**
- Modify: `pt-extension/main.js`
- Modify: `pt-extension/runtime.js`
- Modify: `packages/pt-control-v2/src/types/commands.ts`
- Modify: `packages/pt-control-v2/src/controller/file-bridge.ts`
- Modify: `packages/pt-control-v2/src/controller/index.ts`
- Modify: `packages/pt-control-v2/generated/main.js`
- Modify: `packages/pt-control-v2/generated/runtime.js`
- Test: `packages/pt-control-v2/tests/bridge-contract.test.ts`

**Step 1: Write the failing test**

Crear tests que prueben la normalización bidireccional:
- `kind` → `type`
- `dev1/dev2` ↔ `device1/device2`
- `cableType` ↔ `linkType`
- `execIos.parse` por defecto compatible con ambos runtimes

**Step 2: Run test to verify it fails**

Run: `bun test tests/bridge-contract.test.ts -v`

Expected: FAIL porque el bridge aún no normaliza alias.

**Step 3: Write minimal implementation**

Implementar la normalización en la frontera PT y en el producer host para que ambos runtimes acepten el mismo payload lógico.

**Step 4: Run test to verify it passes**

Run: `bun test tests/bridge-contract.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add pt-extension/main.js pt-extension/runtime.js packages/pt-control-v2/src/types/commands.ts packages/pt-control-v2/src/controller/file-bridge.ts packages/pt-control-v2/src/controller/index.ts packages/pt-control-v2/generated/main.js packages/pt-control-v2/generated/runtime.js packages/pt-control-v2/tests/bridge-contract.test.ts
git commit -m "fix: normalize pt control command contract"
```

#### Task 2: Crear la sesión IOS con estado y prompt machine

**Files:**
- Create: `packages/pt-control-v2/src/ios/session/prompt-state.ts`
- Create: `packages/pt-control-v2/src/ios/session/cli-session.ts`
- Create: `packages/pt-control-v2/src/ios/session/command-result.ts`
- Modify: `packages/pt-control-v2/src/runtime-generator/handlers/config.ts`
- Modify: `packages/pt-control-v2/src/runtime-generator/compose.ts` *(o el template runtime equivalente que alimente el generado)*
- Modify: `packages/pt-control-v2/src/runtime-generator/utils/helpers.ts`
- Test: `packages/pt-control-v2/tests/ios-session.test.ts`

**Step 1: Write the failing test**

Probar inferencia de modo y transiciones:
- `>` → `user-exec`
- `#` → `priv-exec`
- `(config)#` → `config`
- `(config-if)#` → `config-if`
- `Password:` → `awaiting-password`
- `[confirm]` → `awaiting-confirm`
- `--More--` → `paging`

**Step 2: Run test to verify it fails**

Run: `bun test tests/ios-session.test.ts -v`

Expected: FAIL porque no existe la sesión stateful.

**Step 3: Write minimal implementation**

Crear la sesión IOS mínima con `ensurePrivileged`, `ensureConfigMode`, clasificación de resultados y manejo de prompt/paginación.

**Step 4: Run test to verify it passes**

Run: `bun test tests/ios-session.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-control-v2/src/ios/session/prompt-state.ts packages/pt-control-v2/src/ios/session/cli-session.ts packages/pt-control-v2/src/ios/session/command-result.ts packages/pt-control-v2/src/runtime-generator/handlers/config.ts packages/pt-control-v2/src/runtime-generator/compose.ts packages/pt-control-v2/src/runtime-generator/utils/helpers.ts packages/pt-control-v2/tests/ios-session.test.ts
git commit -m "feat: add stateful ios cli session"
```

### Wave 2 — Capacidades y planificación de comandos
#### Task 3: Resolver capacidades por modelo y familia IOS

**Files:**
- Create: `packages/pt-control-v2/src/ios/capabilities/device-capabilities.ts`
- Create: `packages/pt-control-v2/src/ios/capabilities/pt-capability-resolver.ts`
- Test: `packages/pt-control-v2/tests/capability-resolver.test.ts`

**Step 1: Write the failing test**

Probar reglas concretas:
- 2960 no emite `switchport trunk encapsulation dot1q`
- router-on-a-stick soporta subinterfaces dot1q
- multilayer switch soporta SVI e `ip routing`
- DHCP relay soporta `ip helper-address`

**Step 2: Run test to verify it fails**

Run: `bun test tests/capability-resolver.test.ts -v`

Expected: FAIL porque el resolver no existe todavía.

**Step 3: Write minimal implementation**

Implementar la matriz de capacidades por familia/modelo y exponer flags por feature.

**Step 4: Run test to verify it passes**

Run: `bun test tests/capability-resolver.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-control-v2/src/ios/capabilities/device-capabilities.ts packages/pt-control-v2/src/ios/capabilities/pt-capability-resolver.ts packages/pt-control-v2/tests/capability-resolver.test.ts
git commit -m "feat: resolve ios capabilities by device family"
```

#### Task 4: Generar operaciones IOS de alto nivel según capacidades

**Files:**
- Create: `packages/pt-control-v2/src/ios/operations/interface-ops.ts`
- Create: `packages/pt-control-v2/src/ios/operations/routing-ops.ts`
- Create: `packages/pt-control-v2/src/ios/operations/dhcp-ops.ts`
- Create: `packages/pt-control-v2/src/ios/operations/vlan-ops.ts`
- Modify: `packages/pt-control-v2/src/cli/commands/config/ios.ts`
- Test: `packages/pt-control-v2/tests/ios-command-planner.test.ts`

**Step 1: Write the failing test**

Probar secuencias esperadas:
- trunk en 2960 omite encapsulation
- subinterfaz router-on-a-stick usa `encapsulation dot1q`
- SVI usa `interface vlan X` + `ip routing`
- DHCP relay emite `ip helper-address`
- rutas estáticas emiten `ip route`

**Step 2: Run test to verify it fails**

Run: `bun test tests/ios-command-planner.test.ts -v`

Expected: FAIL.

**Step 3: Write minimal implementation**

Construir un planner semántico que reciba operación + capacidades y emita la secuencia IOS correcta.

**Step 4: Run test to verify it passes**

Run: `bun test tests/ios-command-planner.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-control-v2/src/ios/operations/interface-ops.ts packages/pt-control-v2/src/ios/operations/routing-ops.ts packages/pt-control-v2/src/ios/operations/dhcp-ops.ts packages/pt-control-v2/src/ios/operations/vlan-ops.ts packages/pt-control-v2/src/cli/commands/config/ios.ts packages/pt-control-v2/tests/ios-command-planner.test.ts
git commit -m "feat: add capability-aware ios command planner"
```

### Wave 3 — Validación, parsing y endurecimiento
#### Task 5: Endurecer parsing, clasificación y salida `show`

**Files:**
- Modify: `packages/pt-control-v2/src/runtime-generator/handlers/ios-parsers.ts`
- Modify: `packages/pt-control-v2/src/runtime-generator/handlers/config.ts`
- Modify: `packages/pt-control-v2/src/controller/fast-event-stream.ts`
- Modify: `packages/pt-control-v2/src/controller/index.ts`
- Test: `packages/pt-control-v2/tests/ios-validation.test.ts`

**Step 1: Write the failing test**

Probar que:
- `execIos` devuelve `parsed` cuando hay parser disponible
- `parse:false` conserva salida cruda
- `invalid` / `incomplete` / `ambiguous` se clasifican correctamente
- la salida sintética sólo se usa donde el runtime no puede leer estado real

**Step 2: Run test to verify it fails**

Run: `bun test tests/ios-validation.test.ts -v`

Expected: FAIL.

**Step 3: Write minimal implementation**

Conectar parsers, clasificación de eventos y propagación de errores/estado al host.

**Step 4: Run test to verify it passes**

Run: `bun test tests/ios-validation.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-control-v2/src/runtime-generator/handlers/ios-parsers.ts packages/pt-control-v2/src/runtime-generator/handlers/config.ts packages/pt-control-v2/src/controller/fast-event-stream.ts packages/pt-control-v2/src/controller/index.ts packages/pt-control-v2/tests/ios-validation.test.ts
git commit -m "fix: validate ios outputs through parser pipeline"
```

### Wave 4 — Documentación y smoke test final
#### Task 6: Actualizar docs y cerrar con smoke test real en Packet Tracer

**Files:**
- Modify: `README.md`
- Modify: `packages/pt-control-v2/README.md`
- Modify: `packages/pt-control-v2/tests/runtime-generator.test.ts`

**Step 1: Write the failing test**

Extender el test existente del runtime generator para cubrir el contrato final (`type`, aliases de link, parse flag y sesión IOS).

**Step 2: Run test to verify it fails**

Run: `bun test tests/runtime-generator.test.ts -v`

Expected: FAIL hasta que la documentación y los asserts reflejen el contrato nuevo.

**Step 3: Write minimal implementation**

Actualizar la documentación mínima de usuario y dejar explícitos los nuevos flujos IOS.

**Step 4: Run test to verify it passes**

Run: `bun test tests/runtime-generator.test.ts -v`

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md packages/pt-control-v2/README.md packages/pt-control-v2/tests/runtime-generator.test.ts
git commit -m "docs: align pt control v2 ios workflow"
```

## Final Verification Wave

Los revisores finales son gates de aprobación, no tareas normales.

### F1: Plan compliance audit
- Verificar que el plan sólo toca compatibilidad PT, sesión IOS, capacidades, planner, parsing y docs mínimas.
- Veredicto esperado: `APPROVE`.

### F2: Code quality review
- Verificar TypeScript estricto, sin `any`, sin `@ts-ignore`, sin catches vacíos, sin shortcuts de estado.
- Veredicto esperado: `APPROVE`.

### F3: Packet Tracer smoke QA
- Ejecutar el flujo real en PT: `enable`, `configure terminal`, trunk, SVI, `show ip interface brief`, `show ip route`.
- Verificar que el prompt y la paginación se manejan correctamente.
- Veredicto esperado: `APPROVE`.

### F4: Scope fidelity check
- Confirmar que no se implementó canvas/workspace intelligence ni otros cambios fuera de este alcance.
- Confirmar que `pt-extension` quedó sólo con la compatibilidad necesaria.
- Veredicto esperado: `APPROVE`.

## Definition of Done
- `pt-extension` y `pt-control-v2` aceptan el mismo contrato lógico de comandos.
- La CLI IOS opera con sesión stateful y prompt-aware.
- Las capacidades del dispositivo gobiernan los comandos generados.
- Los `show` devuelven salida clasificada/parseada de forma consistente.
- Las pruebas nuevas y las existentes pasan.
- La documentación refleja el flujo nuevo.
