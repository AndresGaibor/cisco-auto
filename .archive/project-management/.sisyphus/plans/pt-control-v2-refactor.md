# Mejora PT Control v2 + Skill Cisco Networking

## TL;DR

> **Quick Summary**: Modernizar PT control v2 para autonomía proactiva con logging estructurado, verificar integración con virtual topology, eliminar PT control v1, y actualizar toda la documentación.
> 
> **Deliverables**:
> - Sistema de logging NDJSON con retención de 7 días
> - Skill Cisco con autonomía proactiva y confirmación para acciones destructivas
> - Virtual topology integrado con PT control v2 para consultas
> - PT control v1 eliminado completamente
> - Documentación actualizada (README, docs, skills)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Tipos/Interfaces → Logging Manager → Integración CLI → Tests → Documentación

---

## Context

### Original Request
Mejora el PT control v2 y mejora las skills del proyecto para ser un asistente inteligente para redes. Cuando pidan algo relacionado a redes, usar la CLI de manera autónoma y proactiva. Llevar registro de logs de conversaciones y ejecuciones. Revisar que virtual topology esté bien implementado con la CLI del PT control v2. Analizar y quitar PT control v1. Arreglar la documentación.

### Interview Summary
**Key Discussions**:
- **Autonomía**: Proactiva con confirmación para acciones destructivas (device-reset, vlan-delete, interface-shutdown, routing-change, acl-modify, config-write, topology-change)
- **Logging**: NDJSON estructurado, 7 días retención, sin enmascarar datos (todo local)
- **PT Control v1**: Eliminar completamente, sin compatibilidad
- **Tests**: Tests después de implementar (Bun test)
- **Virtual topology verificado**: Integración funciona + tests pasan + visualizaciones correctas + consultas desde PT control

**Research Findings**:
- PT control v2 en `packages/pt-control-v2/` con runtime generator, comandos y eventos
- Template de runtime ya registra eventos en `events.ndjson`/`state.json` - extender este patrón
- Skill Cisco en `.iflow/skills/cisco-networking-assistant/`
- 52 archivos de test existentes con Bun test
- Migración desde `src/` hacia `packages/` en progreso

### Metis Review
**Identified Gaps** (addressed):
- **Política de retención**: Definir 7 días (decidido por usuario)
- **Datos sensibles**: No enmascarar, todo es local (decidido por usuario)
- **Acciones destructivas**: Lista explícita definida (decidido por usuario)
- **Alcance documentación**: TODO incluyendo skills (decidido por usuario)
- **Virtual topology verificado**: Criterios claros establecidos

---

## Work Objectives

### Core Objective
Hacer que el asistente de redes Cisco sea autónomo, proactivo y auditable, con integración completa entre PT control v2, virtual topology y logging estructurado.

### Concrete Deliverables
- `packages/pt-control-v2/src/logging/` - Sistema de logging NDJSON
- `packages/pt-control-v2/src/autonomy/` - Registro de acciones destructivas y flujo de confirmación
- `.iflow/skills/cisco-networking-assistant/` - Skill actualizada con integración CLI
- `packages/topology/` - Integración con PT control v2
- Documentación actualizada en `README.md`, `docs/`, y skills

### Definition of Done
- [ ] PT control v2 puede ejecutar comandos autónomamente con logging
- [ ] Skill Cisco invoca CLI de forma proactiva
- [ ] Acciones destructivas requieren confirmación
- [ ] Virtual topology responde consultas desde PT control
- [ ] PT control v1 completamente eliminado
- [ ] Logs rotan después de 7 días
- [ ] Documentación sin referencias a v1

### Must Have
- Sistema de logging estructurado NDJSON con `session_id`, `correlation_id`, `action`, `target_device`, `outcome`, `duration_ms`
- Autonomía proactiva para acciones no destructivas
- Confirmación obligatoria para: device-reset, vlan-delete, interface-shutdown, routing-change, acl-modify, config-write, topology-change
- Integración bidireccional PT control v2 ↔ virtual topology
- Eliminación completa de PT control v1

### Must NOT Have (Guardrails from Metis)
- NO mantener compatibilidad con PT control v1
- NO enmascarar datos en logs (usuario decidió no hacerlo)
- NO agregar tests antes de implementar (decidido tests después)
- NO crear abstracciones prematuras para logging
- NO documentación genérica - solo actualizar lo específico de redes/PT

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Bun test)
- **Automated tests**: Tests after implementation
- **Framework**: bun test
- **Agent-Executed QA**: YES (mandatory for all tasks)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI/TUI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl/bun) — Send requests, assert status + response
- **Library/Module**: Use Bash (bun test) — Run tests, verify pass

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + types):
├── Task 1: Tipos e interfaces para logging NDJSON [quick]
├── Task 2: Log manager service con rotación de 7 días [quick]
├── Task 3: Tipos para integración virtual topology [quick]
├── Task 4: Registro de acciones destructivas [quick]
└── Task 5: Helpers de confirmación de autonomía [quick]

Wave 2 (After Wave 1 — core integration):
├── Task 6: Integrar logging en PT control v2 CLI [deep]
├── Task 7: Integrar logging en skill Cisco assistant [deep]
├── Task 8: Actualizar virtual topology para consultas desde PT control [deep]
├── Task 9: Implementar flujo de confirmación para acciones destructivas [deep]
└── Task 10: Conectar skill Cisco con PT control v2 CLI [deep]

Wave 3 (After Wave 2 — cleanup):
├── Task 11: Eliminar código y referencias de PT control v1 [quick]
├── Task 12: Actualizar README.md [quick]
├── Task 13: Actualizar docs/PT_CONTROL_*.md [quick]
└── Task 14: Actualizar skills del proyecto [quick]

Wave 4 (After Wave 3 — tests):
├── Task 15: Tests para sistema de logging [quick]
├── Task 16: Tests para integración virtual topology [quick]
├── Task 17: Tests para flujo de confirmación [quick]
└── Task 18: Tests de integración end-to-end [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T6 → T9 → T15 → T18 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

- **1-5**: — — 6-10, 1
- **6**: 1, 2 — 9, 15, 2
- **7**: 1, 2 — 10, 15, 2
- **8**: 3 — 10, 16, 2
- **9**: 4, 5 — 17, 2
- **10**: 6, 7, 8 — 18, 2
- **11**: — 12, 13, 14, 1
- **12-14**: 11 — — 1
- **15**: 6, 7 — 18, 2
- **16**: 8 — 18, 2
- **17**: 9 — 18, 2
- **18**: 10, 15, 16, 17 — F1-F4, 3

---

## TODOs

- [ ] 1. **Tipos e interfaces para logging NDJSON**

  **What to do**:
  - Crear `packages/pt-control-v2/src/logging/types.ts` con interfaces `LogEntry`, `LogSession`, `LogConfig`
  - Definir campos: `session_id`, `correlation_id`, `timestamp`, `action`, `target_device`, `outcome`, `duration_ms`, `error?`, `metadata?`
  - Exportar tipos desde `packages/pt-control-v2/src/logging/index.ts`

  **Must NOT do**:
  - NO agregar lógica de logging aquí, solo tipos
  - NO crear abstracciones genéricas reutilizables fuera del contexto de PT

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (no specific skills needed for type definitions)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5)
  - **Blocks**: Tasks 6, 7, 15
  - **Blocked By**: None

  **References**:
  - `packages/pt-control-v2/src/runtime-generator/templates/runtime-main.ts` - Patrón existente de `events.ndjson`
  - `packages/pt-control-v2/src/types/` - Estructura de tipos del paquete

  **Acceptance Criteria**:
  - [ ] Archivo `logging/types.ts` existe con interfaces definidas
  - [ ] `bun build packages/pt-control-v2/src/logging/types.ts` compila sin errores

  **QA Scenarios**:
  ```
  Scenario: Tipos de logging se pueden importar y usar
    Tool: Bash (bun)
    Preconditions: Archivo types.ts existe
    Steps:
      1. bun -e "import { LogEntry } from './packages/pt-control-v2/src/logging/types'; const e: LogEntry = {session_id:'x',correlation_id:'y',timestamp:new Date(),action:'test',outcome:'success',duration_ms:0}; console.log(e.outcome)"
    Expected Result: "success" impreso en consola
    Evidence: .sisyphus/evidence/task-01-types-import.txt

  Scenario: Tipos inválidos rechazados por TypeScript
    Tool: Bash (bun)
    Preconditions: Archivo types.ts existe
    Steps:
      1. bun build --noemit packages/pt-control-v2/src/logging/types.ts
    Expected Result: Build exitoso, tipos válidos
    Evidence: .sisyphus/evidence/task-01-types-build.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [ ] 2. **Log manager service con rotación de 7 días**

  **What to do**:
  - Crear `packages/pt-control-v2/src/logging/log-manager.ts` con clase `LogManager`
  - Implementar `log(entry: LogEntry)`, `getSession(sessionId: string)`, `rotate()`
  - Guardar logs en `.sisyphus/logs/pt-control-{date}.ndjson`
  - Implementar rotación automática: eliminar archivos > 7 días
  - Usar `Bun.file()` para operaciones de archivo

  **Must NOT do**:
  - NO enmascarar datos sensibles (usuario decidió no hacerlo)
  - NO usar dependencias externas para logging

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (native Bun APIs)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-5)
  - **Blocks**: Tasks 6, 7, 15
  - **Blocked By**: Task 1

  **References**:
  - `packages/pt-control-v2/src/runtime-generator/templates/runtime-main.ts` - Patrón existente de escritura NDJSON
  - `node_modules/bun-types/docs/` - APIs de Bun para archivos

  **Acceptance Criteria**:
  - [ ] LogManager implementa log, getSession, rotate
  - [ ] Logs se guardan en `.sisyphus/logs/`
  - [ ] Rotación elimina archivos > 7 días
  - [ ] `bun test packages/pt-control-v2/src/logging/log-manager.test.ts` pasa (crear después)

  **QA Scenarios**:
  ```
  Scenario: Log entry se guarda correctamente
    Tool: Bash (bun)
    Preconditions: LogManager implementado
    Steps:
      1. bun -e "import { LogManager } from './packages/pt-control-v2/src/logging'; const lm = new LogManager(); lm.log({session_id:'test',correlation_id:'c1',timestamp:new Date(),action:'test-action',outcome:'success',duration_ms:100});"
      2. cat .sisyphus/logs/pt-control-*.ndjson | head -1
    Expected Result: JSON con session_id "test" visible
    Evidence: .sisyphus/evidence/task-02-log-entry.txt

  Scenario: Rotación elimina logs antiguos
    Tool: Bash (bun)
    Preconditions: LogManager con rotación implementado
    Steps:
      1. touch -t 202001010000 .sisyphus/logs/pt-control-2020-01-01.ndjson
      2. bun -e "import { LogManager } from './packages/pt-control-v2/src/logging'; const lm = new LogManager(); lm.rotate();"
      3. ls .sisyphus/logs/pt-control-2020-01-01.ndjson 2>&1
    Expected Result: "No such file or directory" (archivo eliminado)
    Evidence: .sisyphus/evidence/task-02-rotation.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [ ] 3. **Tipos para integración virtual topology**

  **What to do**:
  - Crear/actualizar tipos en `packages/topology/src/types.ts` para consultas desde PT control
  - Definir `TopologyQuery`, `TopologyResult`, `DeviceQuery`, `LinkQuery`
  - Exportar desde `packages/topology/src/index.ts`
  - Asegurar compatibilidad con tipos existentes de PT control v2

  **Must NOT do**:
  - NO cambiar estructura de datos existente de topology
  - NO agregar lógica de consulta aquí

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (type definitions)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-5)
  - **Blocks**: Tasks 8, 16
  - **Blocked By**: None

  **References**:
  - `packages/topology/src/` - Tipos existentes de topology
  - `packages/pt-control-v2/src/types/` - Tipos de PT control para compatibilidad

  **Acceptance Criteria**:
  - [ ] Tipos de query definidos en topology
  - [ ] Exportados desde index.ts
  - [ ] `bun build packages/topology/src/types.ts` compila

  **QA Scenarios**:
  ```
  Scenario: Tipos de query se pueden importar
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { TopologyQuery, TopologyResult } from './packages/topology/src'; const q: TopologyQuery = {type:'device',name:'R1'}; console.log(q.type)"
    Expected Result: "device" impreso
    Evidence: .sisyphus/evidence/task-03-topology-types.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [ ] 4. **Registro de acciones destructivas**

  **What to do**:
  - Crear `packages/pt-control-v2/src/autonomy/destructive-actions.ts`
  - Definir constante `DESTRUCTIVE_ACTIONS`: `device-reset`, `vlan-delete`, `interface-shutdown`, `routing-change`, `acl-modify`, `config-write`, `topology-change`
  - Función `isDestructive(action: string): boolean`
  - Función `getConfirmationPrompt(action: string): string`

  **Must NOT do**:
  - NO implementar lógica de confirmación aquí
  - NO agregar acciones no listadas por usuario

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (simple registry)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5)
  - **Blocks**: Tasks 9, 17
  - **Blocked By**: None

  **References**:
  - Decision del usuario: lista de acciones destructivas

  **Acceptance Criteria**:
  - [ ] DESTRUCTIVE_ACTIONS contiene las 7 acciones
  - [ ] isDestructive funciona correctamente
  - [ ] getConfirmationPrompt devuelve mensajes descriptivos

  **QA Scenarios**:
  ```
  Scenario: isDestructive identifica acciones correctas
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { isDestructive, DESTRUCTIVE_ACTIONS } from './packages/pt-control-v2/src/autonomy'; console.log(isDestructive('device-reset'), isDestructive('show-version'))"
    Expected Result: "true false"
    Evidence: .sisyphus/evidence/task-04-destructive-check.txt

  Scenario: getConfirmationPrompt devuelve mensaje
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { getConfirmationPrompt } from './packages/pt-control-v2/src/autonomy'; console.log(getConfirmationPrompt('vlan-delete').includes('VLAN'))"
    Expected Result: "true"
    Evidence: .sisyphus/evidence/task-04-confirm-prompt.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [ ] 5. **Helpers de confirmación de autonomía**

  **What to do**:
  - Crear `packages/pt-control-v2/src/autonomy/confirmation.ts`
  - Implementar `requestConfirmation(action: string, details: string): Promise<boolean>`
  - Usar `console.log` + `prompt` o similar para CLI interactivo
  - Integrar con logging: registrar decisiones de confirmación

  **Must NOT do**:
  - NO crear UI compleja, mantener simple para CLI
  - NO bloquear si no hay TTY (devolver false o usar default)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (CLI interaction)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4)
  - **Blocks**: Tasks 9, 17
  - **Blocked By**: Task 4

  **References**:
  - `packages/pt-control-v2/src/cli/` - Patrones de CLI existentes

  **Acceptance Criteria**:
  - [ ] requestConfirmation funciona en CLI
  - [ ] Registra decisión en logs
  - [ ] Maneja caso no-TTY graciosamente

  **QA Scenarios**:
  ```
  Scenario: Confirmación funciona en modo interactivo
    Tool: interactive_bash (tmux)
    Steps:
      1. bun -e "import { requestConfirmation } from './packages/pt-control-v2/src/autonomy'; requestConfirmation('device-reset', 'Reset R1').then(r => console.log('Result:', r))"
      2. Send "y" + Enter
    Expected Result: "Result: true"
    Evidence: .sisyphus/evidence/task-05-confirm-interactive.txt

  Scenario: No-TTY devuelve false por defecto
    Tool: Bash (bun)
    Steps:
      1. echo "" | bun -e "import { requestConfirmation } from './packages/pt-control-v2/src/autonomy'; requestConfirmation('device-reset', 'Reset R1').then(r => console.log('Result:', r))"
    Expected Result: "Result: false" (default safe)
    Evidence: .sisyphus/evidence/task-05-confirm-notty.txt
  ```

  **Commit**: NO (groups with Wave 1)

- [x] 6. **Integrar logging en PT control v2 CLI**

  **What to do**:
  - Importar LogManager en `packages/pt-control-v2/src/cli/`
  - Registrar cada comando ejecutado con: action, target_device, outcome, duration_ms
  - Envolver ejecución de comandos con try/catch para capturar errores
  - Inicializar LogManager al inicio de CLI

  **Must NOT do**:
  - NO loguear datos sensibles (passwords) - aunque usuario dijo no enmascarar, no exponer en texto plano
  - NO agregar logging a comandos que no son de red

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [] (CLI integration)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-10)
  - **Blocks**: Tasks 15, 18
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `packages/pt-control-v2/src/cli/commands/` - Comandos existentes
  - `packages/pt-control-v2/src/logging/log-manager.ts` - LogManager a integrar

  **Acceptance Criteria**:
  - [ ] CLI crea archivo de log al ejecutar comandos
  - [ ] Logs contienen action, outcome, duration_ms
  - [ ] Errores se registran con outcome: "error"

  **QA Scenarios**:
  ```
  Scenario: CLI registra comandos exitosos
    Tool: Bash (bun)
    Steps:
      1. bun run packages/pt-control-v2/src/cli/index.ts device list --help
      2. cat .sisyphus/logs/pt-control-*.ndjson | grep "device list" | head -1
    Expected Result: JSON con action "device list" y outcome "success"
    Evidence: .sisyphus/evidence/task-06-cli-log-success.txt

  Scenario: CLI registra errores
    Tool: Bash (bun)
    Steps:
      1. bun run packages/pt-control-v2/src/cli/index.ts invalid-command-xyz 2>&1 || true
      2. cat .sisyphus/logs/pt-control-*.ndjson | grep "invalid-command" | head -1
    Expected Result: JSON con outcome "error"
    Evidence: .sisyphus/evidence/task-06-cli-log-error.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 7. **Integrar logging en skill Cisco assistant**

  **What to do**:
  - Actualizar `.iflow/skills/cisco-networking-assistant/SKILL.md` con instrucciones de logging
  - Crear helpers en skill para invocar LogManager
  - Registrar cada acción proactiva de la skill: diagnóstico, sugerencia, ejecución
  - Skill debe poder leer logs para contexto histórico

  **Must NOT do**:
  - NO crear dependencia circular entre skill y PT control
  - NO duplicar código de LogManager

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`skill-creator`] - Para actualizar estructura de skill

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8-10)
  - **Blocks**: Tasks 10, 15
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `.iflow/skills/cisco-networking-assistant/SKILL.md` - Skill actual
  - `packages/pt-control-v2/src/logging/` - LogManager a usar

  **Acceptance Criteria**:
  - [ ] SKILL.md documenta uso de logging
  - [ ] Skill puede registrar acciones
  - [ ] Skill puede consultar logs previos

  **QA Scenarios**:
  ```
  Scenario: Skill registra acción de diagnóstico
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { skillLog } from '.iflow/skills/cisco-networking-assistant/scripts/logging'; skillLog({action:'diagnose',target_device:'R1',outcome:'success',duration_ms:500});"
      2. cat .sisyphus/logs/cisco-skill-*.ndjson | grep "diagnose" | head -1
    Expected Result: JSON con action "diagnose"
    Evidence: .sisyphus/evidence/task-07-skill-log.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 8. **Actualizar virtual topology para consultas desde PT control**

  **What to do**:
  - Agregar función `queryTopology(query: TopologyQuery): TopologyResult` en `packages/topology/src/`
  - Implementar queries: get device by name, get links by device, get full topology
  - Crear endpoint/función que PT control pueda invocar
  - Asegurar que devuelve datos en formato compatible con PT control v2

  **Must NOT do**:
  - NO cambiar formato de datos de topology existente
  - NO agregar dependencias externas

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [] (topology integration)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-7, 9-10)
  - **Blocks**: Tasks 16, 18
  - **Blocked By**: Task 3

  **References**:
  - `packages/topology/src/` - Código existente de topology
  - `packages/pt-control-v2/src/types/` - Tipos de PT control para compatibilidad

  **Acceptance Criteria**:
  - [ ] queryTopology implementa device y link queries
  - [ ] PT control puede invocar desde CLI
  - [ ] Devuelve datos estructurados

  **QA Scenarios**:
  ```
  Scenario: Query device por nombre
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { queryTopology } from './packages/topology/src'; const r = queryTopology({type:'device',name:'R1'}); console.log(r.found)"
    Expected Result: "true" o "false" según topología
    Evidence: .sisyphus/evidence/task-08-topology-query.txt

  Scenario: Query links de un device
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { queryTopology } from './packages/topology/src'; const r = queryTopology({type:'links',device:'R1'}); console.log(r.links?.length ?? 0)"
    Expected Result: Número de links
    Evidence: .sisyphus/evidence/task-08-topology-links.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 9. **Implementar flujo de confirmación para acciones destructivas**

  **What to do**:
  - En CLI de PT control, antes de ejecutar acción destructiva, llamar `requestConfirmation`
  - Si usuario rechaza, abortar y registrar en logs
  - Si usuario acepta, continuar y registrar confirmación
  - Añadir flag `--yes` para saltar confirmación (útil para scripts)

  **Must NOT do**:
  - NO ejecutar acción sin confirmación si es destructiva (excepto con --yes)
  - NO recordar preferencias entre sesiones

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [] (CLI flow)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-8, 10)
  - **Blocks**: Tasks 17, 18
  - **Blocked By**: Tasks 4, 5

  **References**:
  - `packages/pt-control-v2/src/autonomy/confirmation.ts` - Helper de confirmación
  - `packages/pt-control-v2/src/autonomy/destructive-actions.ts` - Lista de acciones

  **Acceptance Criteria**:
  - [ ] Acciones destructivas piden confirmación
  - [ ] Flag --yes salta confirmación
  - [ ] Confirmación se registra en logs

  **QA Scenarios**:
  ```
  Scenario: Acción destructiva pide confirmación
    Tool: interactive_bash (tmux)
    Steps:
      1. bun run packages/pt-control-v2/src/cli/index.ts device reset R1
      2. Wait for prompt "Are you sure?"
      3. Send "n" + Enter
    Expected Result: "Aborted" y no se ejecuta
    Evidence: .sisyphus/evidence/task-09-confirm-destructive.txt

  Scenario: Flag --yes salta confirmación
    Tool: Bash (bun)
    Steps:
      1. bun run packages/pt-control-v2/src/cli/index.ts device reset R1 --yes 2>&1
    Expected Result: Comando ejecuta sin prompt
    Evidence: .sisyphus/evidence/task-09-yes-flag.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 10. **Conectar skill Cisco con PT control v2 CLI**

  **What to do**:
  - Skill puede invocar comandos de PT control v2 CLI programáticamente
  - Crear wrapper en skill para ejecutar comandos: `runPTCommand(command: string, args: string[])`
  - Skill es proactiva: detecta intención de redes y ejecuta CLI automáticamente
  - Registrar cada invocación en logs

  **Must NOT do**:
  - NO crear nuevo CLI, usar el existente
  - NO duplicar lógica de comandos en skill

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`cisco-networking-assistant`] - Skill principal a integrar

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9)
  - **Blocks**: Tasks 18
  - **Blocked By**: Tasks 6, 7, 8

  **References**:
  - `.iflow/skills/cisco-networking-assistant/SKILL.md` - Skill a actualizar
  - `packages/pt-control-v2/src/cli/` - CLI a invocar

  **Acceptance Criteria**:
  - [ ] Skill puede ejecutar comandos PT control
  - [ ] Comandos se registran en logs
  - [ ] Skill es proactiva para consultas de red

  **QA Scenarios**:
  ```
  Scenario: Skill ejecuta comando de device list
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { runPTCommand } from '.iflow/skills/cisco-networking-assistant/scripts/pt-wrapper'; runPTCommand('device', ['list']).then(r => console.log(r.length > 0))"
    Expected Result: "true" (hay devices)
    Evidence: .sisyphus/evidence/task-10-skill-pt-command.txt

  Scenario: Skill consulta topology
    Tool: Bash (bun)
    Steps:
      1. bun -e "import { queryTopology } from '.iflow/skills/cisco-networking-assistant/scripts/topology'; const r = queryTopology({type:'full'}); console.log(r.devices?.length ?? 0)"
    Expected Result: Número de devices en topología
    Evidence: .sisyphus/evidence/task-10-skill-topology.txt
  ```

  **Commit**: NO (groups with Wave 2)

- [x] 11. **Eliminar código y referencias de PT control v1**

  **What to do**:
  - Buscar y eliminar `packages/pt-control/` (v1) si existe
  - Buscar referencias a "pt-control" (sin v2) en código y docs
  - Actualizar imports que apunten a v1
  - Eliminar scripts y configs específicas de v1

  **Must NOT do**:
  - NO mantener compatibilidad con v1
  - NO dejar código muerto comentado

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (cleanup)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-14)
  - **Blocks**: Tasks 12, 13, 14
  - **Blocked By**: None

  **References**:
  - `packages/pt-control/` - Directorio v1 a eliminar
  - `rg "pt-control[^-v2]"` - Buscar referencias

  **Acceptance Criteria**:
  - [ ] Directorio packages/pt-control/ no existe
  - [ ] No hay referencias a v1 en código
  - [ ] `rg "pt-control-v1"` no retorna resultados

  **QA Scenarios**:
  ```
  Scenario: Directorio v1 eliminado
    Tool: Bash
    Steps:
      1. ls packages/pt-control 2>&1
    Expected Result: "No such file or directory"
    Evidence: .sisyphus/evidence/task-11-v1-removed.txt

  Scenario: Sin referencias a v1 en código
    Tool: Bash (rg)
    Steps:
      1. rg "pt-control-v1" --type ts --type md
    Expected Result: Sin resultados
    Evidence: .sisyphus/evidence/task-11-no-v1-refs.txt
  ```

  **Commit**: NO (groups with Wave 3)

- [x] 12. **Actualizar README.md**

  **What to do**:
  - Eliminar referencias a PT control v1
  - Documentar PT control v2 como la versión actual
  - Agregar sección de logging y autonomía
  - Actualizar comandos de instalación y uso
  - Documentar acciones destructivas y confirmación

  **Must NOT do**:
  - NO documentar features no implementadas
  - NO dejar documentación de v1

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (documentation)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 13-14)
  - **Blocks**: None
  - **Blocked By**: Task 11

  **References**:
  - `README.md` - Archivo a actualizar
  - `.sisyphus/drafts/pt-control-v2-refactor.md` - Decisiones documentadas

  **Acceptance Criteria**:
  - [ ] README no menciona v1
  - [ ] Sección de logging documentada
  - [ ] Sección de autonomía documentada
  - [ ] Comandos actualizados

  **QA Scenarios**:
  ```
  Scenario: README sin referencias a v1
    Tool: Bash
    Steps:
      1. grep -i "v1\|version 1" README.md
    Expected Result: Sin resultados
    Evidence: .sisyphus/evidence/task-12-readme-no-v1.txt

  Scenario: README documenta logging
    Tool: Bash
    Steps:
      1. grep -i "logging\|logs" README.md
    Expected Result: Al menos 1 línea con documentación de logging
    Evidence: .sisyphus/evidence/task-12-readme-logging.txt
  ```

  **Commit**: NO (groups with Wave 3)

- [x] 13. **Actualizar docs/PT_CONTROL_*.md**

  **What to do**:
  - Revisar y actualizar 5 archivos PT_CONTROL_*.md
  - Eliminar referencias a v1
  - Documentar nueva funcionalidad de logging y autonomía
  - Actualizar ejemplos de comandos

  **Must NOT do**:
  - NO crear nuevos docs innecesarios
  - NO dejar contenido obsoleto

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (documentation)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-12, 14)
  - **Blocks**: None
  - **Blocked By**: Task 11

  **References**:
  - `docs/PT_CONTROL_*.md` - 5 archivos a revisar
  - `.sisyphus/drafts/pt-control-v2-refactor.md` - Decisiones

  **Acceptance Criteria**:
  - [ ] Los 5 docs actualizados
  - [ ] Sin referencias a v1
  - [ ] Logging y autonomía documentados

  **QA Scenarios**:
  ```
  Scenario: Docs PT_CONTROL sin v1
    Tool: Bash
    Steps:
      1. grep -ri "v1\|version 1" docs/PT_CONTROL_*.md
    Expected Result: Sin resultados
    Evidence: .sisyphus/evidence/task-13-docs-no-v1.txt

  Scenario: Docs documentan logging
    Tool: Bash
    Steps:
      1. grep -l "logging\|NDJSON" docs/PT_CONTROL_*.md | wc -l
    Expected Result: Al menos 1 archivo
    Evidence: .sisyphus/evidence/task-13-docs-logging.txt
  ```

  **Commit**: NO (groups with Wave 3)

- [x] 14. **Actualizar skills del proyecto**

  **What to do**:
  - Revisar `.iflow/skills/cisco-networking-assistant/SKILL.md`
  - Actualizar para reflejar integración con PT control v2
  - Documentar autonomía proactiva y acciones destructivas
  - Revisar otras skills del proyecto que mencionen PT o redes

  **Must NOT do**:
  - NO duplicar documentación existente
  - NO crear skills nuevas

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`skill-creator`] - Para actualizar skills correctamente

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11-13)
  - **Blocks**: None
  - **Blocked By**: Task 11

  **References**:
  - `.iflow/skills/cisco-networking-assistant/SKILL.md` - Skill principal
  - `.iflow/skills/*/SKILL.md` - Otras skills a revisar

  **Acceptance Criteria**:
  - [ ] Skill Cisco actualizada con v2
  - [ ] Autonomía documentada
  - [ ] Acciones destructivas listadas

  **QA Scenarios**:
  ```
  Scenario: Skill menciona v2
    Tool: Bash
    Steps:
      1. grep -i "v2\|pt-control-v2" .iflow/skills/cisco-networking-assistant/SKILL.md
    Expected Result: Al menos 1 resultado
    Evidence: .sisyphus/evidence/task-14-skill-v2.txt

  Scenario: Skill documenta autonomía
    Tool: Bash
    Steps:
      1. grep -i "autonom\|proactiv" .iflow/skills/cisco-networking-assistant/SKILL.md
    Expected Result: Al menos 1 resultado
    Evidence: .sisyphus/evidence/task-14-skill-autonomy.txt
  ```

  **Commit**: NO (groups with Wave 3)

- [x] 15. **Tests para sistema de logging**

  **What to do**:
  - Crear `packages/pt-control-v2/src/logging/__tests__/log-manager.test.ts`
  - Tests: log entry creation, session retrieval, rotation, error handling
  - Crear `packages/pt-control-v2/src/logging/__tests__/types.test.ts` para validación de tipos

  **Must NOT do**:
  - NO tests que requieran interacción humana
  - NO mock excesivo

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (Bun test)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 16-18)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `tests/` - Estructura de tests existente
  - `packages/pt-control-v2/src/logging/` - Código a testear

  **Acceptance Criteria**:
  - [ ] Tests creados y pasando
  - [ ] `bun test packages/pt-control-v2/src/logging/` pasa

  **QA Scenarios**:
  ```
  Scenario: Tests de logging pasan
    Tool: Bash (bun)
    Steps:
      1. bun test packages/pt-control-v2/src/logging/__tests__/
    Expected Result: "X tests passed, 0 failed"
    Evidence: .sisyphus/evidence/task-15-logging-tests.txt
  ```

  **Commit**: NO (groups with Wave 4)

- [x] 16. **Tests para integración virtual topology**

  **What to do**:
  - Crear `packages/topology/src/__tests__/query.test.ts`
  - Tests: query device, query links, query full topology, error cases
  - Test de integración con PT control CLI

  **Must NOT do**:
  - NO tests que dependan de topología real específica
  - NO mock innecesario

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (Bun test)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 17-18)
  - **Blocks**: Task 18
  - **Blocked By**: Task 8

  **References**:
  - `packages/topology/src/` - Código a testear
  - `packages/topology/tests/` - Tests existentes

  **Acceptance Criteria**:
  - [ ] Tests creados y pasando
  - [ ] `bun test packages/topology/src/__tests__/query.test.ts` pasa

  **QA Scenarios**:
  ```
  Scenario: Tests de topology query pasan
    Tool: Bash (bun)
    Steps:
      1. bun test packages/topology/src/__tests__/query.test.ts
    Expected Result: "X tests passed, 0 failed"
    Evidence: .sisyphus/evidence/task-16-topology-tests.txt
  ```

  **Commit**: NO (groups with Wave 4)

- [x] 17. **Tests para flujo de confirmación**

  **What to do**:
  - Crear `packages/pt-control-v2/src/autonomy/__tests__/confirmation.test.ts`
  - Tests: isDestructive detection, confirmation prompt, --yes flag
  - Test de logging de decisiones

  **Must NOT do**:
  - NO tests que requieran TTY real

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (Bun test)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-16, 18)
  - **Blocks**: Task 18
  - **Blocked By**: Task 9

  **References**:
  - `packages/pt-control-v2/src/autonomy/` - Código a testear

  **Acceptance Criteria**:
  - [ ] Tests creados y pasando
  - [ ] `bun test packages/pt-control-v2/src/autonomy/__tests__/` pasa

  **QA Scenarios**:
  ```
  Scenario: Tests de confirmación pasan
    Tool: Bash (bun)
    Steps:
      1. bun test packages/pt-control-v2/src/autonomy/__tests__/
    Expected Result: "X tests passed, 0 failed"
    Evidence: .sisyphus/evidence/task-17-confirmation-tests.txt
  ```

  **Commit**: NO (groups with Wave 4)

- [x] 18. **Tests de integración end-to-end**

  **What to do**:
  - Crear `tests/integration/pt-control-v2-integration.test.ts`
  - Test: CLI ejecuta comando → logging registrado → topology consultable
  - Test: Skill ejecuta comando PT → confirmación para destructivo → logging
  - Test: Rotación de logs funciona

  **Must NOT do**:
  - NO tests que dependan de estado externo
  - NO tests lentos sin necesidad

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [] (integration testing)

  **Parallelization**:
  - **Can Run In Parallel**: NO (final integration test)
  - **Parallel Group**: Wave 4 (last task)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 10, 15, 16, 17

  **References**:
  - `tests/integration/` - Tests de integración existentes
  - Todos los módulos implementados

  **Acceptance Criteria**:
  - [ ] Test de integración pasa
  - [ ] `bun test tests/integration/pt-control-v2-integration.test.ts` pasa

  **QA Scenarios**:
  ```
  Scenario: Test de integración end-to-end pasa
    Tool: Bash (bun)
    Steps:
      1. bun test tests/integration/pt-control-v2-integration.test.ts
    Expected Result: "X tests passed, 0 failed"
    Evidence: .sisyphus/evidence/task-18-e2e-tests.txt
  ```

  **Commit**: YES
  - Message: `test(pt-control): add integration tests for v2 with logging and autonomy`
  - Files: `tests/integration/pt-control-v2-integration.test.ts`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(pt-control): add logging types and autonomy helpers` — packages/pt-control-v2/src/logging/, packages/pt-control-v2/src/autonomy/
- **Wave 2**: `feat(pt-control): integrate logging and autonomy with CLI and skill` — packages/pt-control-v2/src/, .iflow/skills/
- **Wave 3**: `refactor: remove PT control v1, update docs` — packages/pt-control/, README.md, docs/
- **Wave 4**: `test: add tests for logging, topology integration, autonomy` — tests/

---

## Success Criteria

### Verification Commands
```bash
bun test                                    # Expected: All tests pass
bun run packages/pt-control-v2/src/index.ts # Expected: CLI runs without errors
rg "pt-control-v1" --type ts                # Expected: No matches (v1 removed)
ls .sisyphus/logs/                          # Expected: Log files exist with rotation
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] PT control v1 completely removed
- [ ] Documentation updated without v1 references
- [ ] Logging system operational with 7-day rotation
- [ ] Skill Cisco can invoke PT control v2 CLI autonomously
- [ ] Virtual topology responds to PT control queries
