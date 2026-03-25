# CLI Refactor: gh-Style Architecture + MCP-Packet-Tracer Integration

## TL;DR

> **Quick Summary**: Reestructurar CLI estilo gh CLI e integrar todas las features de MCP-Packet-Tracer directamente (sin servidor MCP externo), con bridge HTTP para comunicación en tiempo real con Packet Tracer.
>
> **Deliverables**:- CLI reestructurada con comandos por recurso (`cisco-auto <recurso> <acción>`)
> - Bridge HTTP puerto 54321 para Packet Tracer
> - 22 tools de MCP-Packet-Tracer integradas como comandos CLI
> - Sistema de validación y auto-fix de topologías
> - Generación de configs IOS
> - Live deploy a Packet Tracer vía HTTP bridge
>
> **Estimated Effort**: XLarge
> **Parallel Execution**: YES - Múltiples waves
> **Critical Path**: CLI Framework → Tool Registry → Individual Tools → Integration

---

## Context

### Original Request
"Revisa este proyecto, mira cómo está, qué falta, y quita la TUI de laboratorios si hay. Revisa los repos MCP-Packet-Tracer e impleméntalos. Además quiero investigar una forma profesional de hacer CLI como gh de GitHub."

### Interview Summary**Key Discussions**:
- **Arquitectura**: Solo CLI mejorada (NO servidor MCP externo). Las features se integran directamente en la CLI.
- **Features**: TODAS del MCP-Packet-Tracer: planificación topología, validación, auto-fix, generación configs IOS, templates, catálogo dispositivos, live deploy.
- **CLI Style**: Estilo gh CLI (comandos agrupados por recurso).
- **PT Bridge**: Sí implementar, puerto 54321.
- **Testing**: TDD (Tests First).

### Research Findings
- **Proyecto actual**: CLI con Commander v14, 10 comandos, monorepo Bun. NO existe TUI real (solo wizard readline básico).
- **MCP-Packet-Tracer (Mats2208)**: Servidor MCP Python con 22 tools, arquitectura hexagonal, bridge HTTP 54321 para PT.
- **gh CLI patterns**: Comandos por recurso, flagsconsistentes (--json, --jq), autocompletado shell, config tiered.

### Metis Review
**Identified Gaps** (all addressed):
- **Authentication**: Usar SSH keys preferidas sobre passwords, variables de entorno para secrets.
- **Bridge HTTP**: Localhost-only binding, autenticación implícita.
- **Auto-fix scope**: SOLO modifica IPs libres, tipos de cable, puertos disponibles. NUNCAcreedentials, seguridad, routing protocols.
- **Error handling**: Códigos de salida consistentes (0=éxito, 1=error, 2=uso inválido, etc.).
- **PT compatibility**: Soportar PT 8.x principalmente, graceful fallback si bridge no disponible.

---

## Work Objectives

### Core Objective
Transformar cisco-auto en una CLI profesional estilo gh con todas las capacidades de automatización de topologías de Packet Tracer, integrando planificación, validación, auto-fix, generación de configs y deploy en tiempo real.

### Concrete Deliverables
- CLI reestructurada con comandos por recurso: `cisco-auto lab`, `cisco-auto device`, `cisco-auto topology`, `cisco-auto config`
- Bridge HTTP en puerto 54321 para comunicación con Packet Tracer
- Tool registry con 22 herramientas adaptadas del MCP-Packet-Tracer
- Sistema de validación de topologías con auto-fix
- Generación de configs IOS desde YAML
- Live deploy a Packet Tracer
- Test suite completa con TDD

### Definition of Done
- [ ] `cisco-auto --help` muestra ayuda estructurada por recursos
- [ ] `cisco-auto lab create` funciona enmodo interactivo y batch
- [ ] `cisco-auto topology validate lab.yaml` detecta errores y sugiere fixes
- [ ] `cisco-auto config generate lab.yaml --dry-run` genera configs sin aplicar
- [ ] `cisco-auto bridge status` verifica conexión con Packet Tracer
- [ ] `bun test` pasa con >80% coverage
- [ ] TypeScript compila sin errores

### Must Have
- Reestructuración CLI estilo gh (comandos por recurso)
- Bridge HTTP puerto 54321
- Tool registry conpt_plan_topology, pt_validate_plan, pt_fix_plan, pt_generate_configs, pt_live_deploy
- Output JSON opcional (--json, --jq)
- Tests con bun:test

### Must NOT Have (Guardrails)
- NO exponer servidor MCP externamente
- NO añadir dashboard web o UI
- NO modificar packages stubs (import-yaml, import-pka, legacy) sin discutir
- NO auto-fix de credenciales, seguridad, routing protocols ya configurados
- NO soporte multi-vendor (solo Cisco IOS)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES - bun:test configurado
- **Automated tests**: YES (TDD)
- **Framework**: bun test
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI**: Use Bash (bun run CLI commands)
- **Bridge HTTP**: Use Bash (curl requests, assert status + response)
- **Integration**: Use Bash (full workflow plan →validate → fix → generate → deploy)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - DAY 1-2):
├── Task 1: CLI Framework Restructure [quick]
├── Task 2: Global Flags Implementation (--json, --jq, --output) [quick]
├── Task 3: Output Formatters (JSON, YAML, table) [quick]
├── Task 4: Error Codes Standardization [quick]
├── Task 5: Shell Completion Setup [quick]
├── Task 6: Config File Support (cisco-auto.yaml) [quick]
└── Task 7: Help System Overhaul [quick]

Wave 2 (Bridge & Registry - DAY 3-5):
├── Task 8: Bridge HTTP Server Setup [unspecified-high]
├── Task 9: Bridge Health Check Endpoint [quick]
├── Task 10: Tool Registry Architecture [unspecified-high]
├── Task 11: Tool Registry Base Types [quick]
├── Task 12: Tool Execution Context [unspecified-high]
└── Task 13: Tool Result Formatter [quick]

Wave 3 (Core Tools - DAY 6-10):
├── Task 14: pt_list_devices (catalog) [quick]
├── Task 15: pt_list_templates [quick]
├── Task 16: pt_get_device_details [quick]
├── Task 17: pt_plan_topology [deep]
├── Task 18: pt_validate_plan [deep]
├── Task 19: pt_fix_plan [deep]
├── Task 20: pt_explain_plan [unspecified-high]
├── Task 21: pt_estimate_plan [unspecified-high]
└── Task 22: pt_generate_script [unspecified-high]

Wave 4 (Deploy Tools - DAY 11-14):
├── Task 23: pt_generate_configs [deep]
├── Task 24: pt_deploy (clipboard) [quick]
├── Task 25: pt_live_deploy [deep]
├── Task 26: pt_bridge_status [quick]
├── Task 27: pt_query_topology [unspecified-high]
├── Task 28: pt_full_build [deep]
└── Task 29: pt_export [unspecified-high]

Wave 5 (Interactive Tools - DAY 15-17):
├── Task 30: Interactive Lab Creation [unspecified-high]
├── Task 31: Interactive Device Selection [quick]
├── Task 32: Interactive Validation UI [unspecified-high]
└── Task 33: Progress Reporting with chalk/pino [quick]

Wave 6 (Integration - DAY 18-21):
├── Task 34: Integration: Plan → Validate → Fix Pipeline [deep]
├── Task 35: Integration: Validate → Generate → Deploy [deep]
├── Task 36: Error Recovery & Rollback [deep]
├── Task 37: Partial Deploy Handling [unspecified-high]
└── Task 38: Offline Mode Support [unspecified-high]

Wave FINAL (Review & Docs - DAY 22-24):
├── Task F1: Plan Compliance Audit (oracle) [oracle]
├── Task F2: Code Quality Review [unspecified-high]
├── Task F3: Real Manual QA [unspecified-high]
└── Task F4: Scope Fidelity Check [deep]

Critical Path: Task 1 → Task 8 → Task 10 → Task 17 → Task 18 → Task 23 → Task 25 → Task 34 → Task F1

Parallel Speedup: ~60% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|------------|--------|
| 1-7 | — | 8, 10 |
| 8-13 | 1-7 | 14-29 |
| 14-22 | 8-13 | 23-29 |
| 23-29 | 14-22 | 30-33, 34-38 |
| 30-33 | 23-29 | 34-38 |
| 34-38 | 30-33 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 7 tasks → `quick` (all)
- **Wave 2**: 6 tasks → `unspecified-high` (3), `quick` (3)
- **Wave 3**: 9 tasks → `deep` (3), `unspecified-high` (3), `quick` (3)
- **Wave 4**: 7 tasks → `deep` (2), `unspecified-high` (2), `quick` (3)
- **Wave 5**: 4 tasks → `unspecified-high` (2), `quick` (2)
- **Wave 6**: 5 tasks → `deep` (3), `unspecified-high` (2)
- **FINAL**: 4 tasks → `oracle` (1), `unspecified-high` (2), `deep` (1)

---

## TODOs

### Wave 2: Bridge & Tool Registry

- [x] 8. Bridge HTTP Server Setup

  **What to do**:
  - Crear servidor HTTP en puerto 54321 para comunicación con Packet Tracer
  - Implementar endpoint `/health` para health check
  - Implementar endpoint `/next` para polling de comandos (PT hace polling)
  - Implementar endpoint `/execute` para enviar comandos a PT
  - Asegurar que solo acepta conexiones desde localhost
  - Manejar CORS para PT WebView

  **Must NOT do**:
  - NO exponer el servidor a redes externas
  - NO permitir conexiones sin autenticación implícita (localhost-only)
  - NO guardar estado entre requests (stateless por defecto)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Server setup con Bun requiere manejo de HTTP, CORS, seguridad
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 9-13, 14-29
  - **Blocked By**: Tasks 1-7 (CLI Framework)

  **References**:
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/infrastructure/execution/live_bridge.py` - Bridge HTTP pattern
  - `https://github.com/Mats2208/MCP-Packet-Tracer` - Bootstrap code para PT WebView

  **Acceptance Criteria**:
  - [ ] `bun run src/bridge/server.ts` inicia servidor en 54321
  - [ ] `curl http://localhost:54321/health` responde `{"status":"ok"}`
  - [ ] Server rechaza conexiones desde IPs no-localhost
  - [ ] Tests con bun:test pasan

  **QA Scenarios**:
  ```
  Scenario: Health endpoint responds
    Tool: Bash
    Preconditions: Bridge server running
    Steps:
      1. curl -s http://localhost:54321/health
      2. Assert response is {"status":"ok"}
    Expected Result: Health check works
    Evidence: .sisyphus/evidence/task-08-health-check.txt

  Scenario: Non-localhost connection refused
    Tool: Bash
    Steps:
      1. curl -s http://0.0.0.0:54321/health --interface eth0
      2. Assert connection refused or timeout
    Expected Result: Non-localhost rejected
    Evidence: .sisyphus/evidence/task-08-localhost-only.txt

  Scenario: Execute endpoint queues command
    Tool: Bash
    Preconditions: Bridge server running
    Steps:
      1. curl -X POST http://localhost:54321/execute -d '{"command":"addDevice","args":["R1","2911",100,200]}'
      2. curl http://localhost:54321/next
      3. Assert queued command returned
    Expected Result: Command queued and retrieved
    Evidence: .sisyphus/evidence/task-08-execute.txt
  ```

  **Commit**: YES
  - Message: `feat(bridge): add PT HTTP bridge on port 54321`
  - Files: `src/bridge/server.ts`, `src/bridge/routes/`, `tests/bridge/`

- [x] 9. Bridge Health Check Endpoint

  **What to do**:
  - Implementar `GET /health` detallado con versión, uptime, PT connection status
  - Implementar `GET /status` retorna info del bridge
  - Crear comando CLI `cisco-auto bridge status`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 8 (Bridge Server)

  **Acceptance Criteria**:
  - [ ] `cisco-auto bridge status` muestra estado del bridge
  - [ ] Incluye versión, uptime, PT connection status

  **QA Scenarios**:
  ```
  Scenario: Bridge status command works
    Tool: Bash
    Preconditions: Bridge running
    Steps:
      1. cisco-auto bridge status
      2. Assert output contains "Connected" or "Disconnected"
    Expected Result: Status displayed
    Evidence: .sisyphus/evidence/task-09-bridge-status.txt
  ```

  **Commit**: YES
  - Message: `feat(bridge): add health check and status endpoints`
  - Files: `src/bridge/routes/health.ts`, `apps/cli/src/commands/bridge.ts`

- [x] 10. Tool Registry Architecture

  **What to do**:
  - Crear arquitectura de Tool Registry para exponer tools como comandos CLI
  - Definir interfaz `Tool` con: name, description, inputSchema, handler
  - Crear `src/core/adapters/mcp/tool-registry.ts`
  - Implementar patrón: registrar tools, ejecutar por nombre
  - Adaptar tools del MCP-Packet-Tracer a esta arquitectura

  **Must NOT do**:
  - NO exponer servidor MCP externo
  - NO depender de FastMCP (es Python)
  - NO crear dependencia circular

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Arquitectura core que afecta todo el diseño
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 11-13, 14-29
  - **Blocked By**: Task 8 (Bridge)

  **References**:
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/adapters/mcp/tool_registry.py` - Patrón Python
  - TypeScript interfaces para inputSchema (similar a JSON Schema)

  **Acceptance Criteria**:
  - [ ] `ToolRegistry` permite registrar tools dinámicamente
  - [ ] Cada tool tiene nombre, descripción, inputSchema, handler
  - [ ] `registry.execute('pt_list_devices', {})` funciona
  - [ ] Tests unitarios pasan

  **QA Scenarios**:
  ```
  Scenario: Tool registry accepts new tools
    Tool: Bun test
    Steps:
      1. registry.register({name: 'test_tool', handler: () => 'ok'})
      2. const result = registry.execute('test_tool', {})
      3. Assert result is 'ok'
    Expected Result: Tool registered and executed
    Evidence: .sisyphus/evidence/task-10-registry.txt

  Scenario: InputSchema validates correctly
    Tool: Bun test
    Steps:
      1. registry.register({name: 'test', inputSchema: {type: 'object', properties: {name: {type: 'string'}}}})
      2. registry.execute('test', {name: 123})
      3. Assert validation error
    Expected Result: Invalid input rejected
    Evidence: .sisyphus/evidence/task-10-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add tool registry architecture`
  - Files: `src/core/adapters/mcp/tool-registry.ts`, `src/core/types/tool.ts`

- [x] 11. Tool Registry Base Types

  **What to do**:
  - Definir tipos TypeScript para: `Tool`, `ToolInput`, `ToolResult`, `ToolError`
  - Crear Zod schemas para validación de inputs
  - Definir tipos específicos para cada tool (TopologyPlan, DevicePlan, etc.)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 10 (Tool Registry Architecture)

  **References**:
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/domain/models/` - Modelos Python
  - `packages/lab-model/src/lab.ts` - Modelos existentes

  **Acceptance Criteria**:
  - [ ] Tipos exportados desde `src/core/types/`
  - [ ] Zod schemas validan inputs de tools
  - [ ] `TopologyPlan`, `DevicePlan`, `LinkPlan` tipos definidos

  **Commit**: YES
  - Message: `feat(mcp): add tool registry base types`
  - Files: `src/core/types/tool.ts`, `src/core/schemas/`

- [x] 12. Tool Execution Context

  **What to do**:
  - Crear contexto de ejecución para tools: logger, config, bridge client
  - Implementar inyección de dependencias para tools
  - Manejar timeout y cancellation
  - Logging estructurado con pino

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - Reason: Context management requiere DI y logging
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14-29
  - **Blocked By**: Task 10 (Tool Registry)

  **Acceptance Criteria**:
  - [ ] `ExecutionContext` incluye logger, config, bridgeClient
  - [ ] Timeout configurable por tool
  - [ ] Logs estructurados con correlation ID

  **Commit**: YES
  - Message: `feat(mcp): add tool execution context`
  - Files: `src/core/context/`

- [x] 13. Tool Result Formatter

  **What to do**:
  - Formatear resultados de tools para CLI (JSON, table, text)
  - Manejar errores y mostrar user-friendly messages
  - Extraer metadata relevante (duration, items count)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14-29
  - **Blocked By**: Task 10 (Tool Registry)

  **Acceptance Criteria**:
  - [ ] Resultados se formatean según flag `--output`
  - [ ] Errores muestran mensaje claro sin stack trace
  - [ ] Metadata incluida en modo verbose

  ### Wave 3: Core Tools (pt_* tools from MCP-Packet-Tracer)

- [x] 14. pt_list_devices (catalog)

  **What to do**: Implementar tool para listar catálogo de dispositivos disponibles con sus puertos.
  - Adaptar desde `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/infrastructure/catalog/`
  - Crear `src/core/catalog/device-catalog.ts`
  - Incluir modelos: 1941, 2901, 2911, 4321 (routers), 2960-24TT, 3560-24PS (switches), PC-PT, Server-PT, Laptop-PT
  **Profile**: `quick` | **Parallel**: YES | **References**: `packages/device-catalog/`, MCP-Packet-Tracer

- [x] 15. pt_list_templates

  **What to do**: Implementar tool para listar templates de topología disponibles.
  - Templates: single_lan, multi_lan, multi_lan_wan, star, hub_spoke, router_on_a_stick, three_router_triangle, custom
  **Profile**: `quick` | **Parallel**: YES | **References**: MCP-Packet-Tracer templates

- [x] 16. pt_get_device_details

  **What to do**: Implementar tool para obtener detalles completos de un modelo específico (puertos, interfaces).
  **Profile**: `quick` | **Parallel**: YES | **References**: `packages/device-catalog/`

- [x] 17. pt_plan_topology

  **What to do**: Implementar planificador de topología que genera TopologyPlan completo.
  - Input: número de routers, switches, PCs, routing protocol, DHCP enabled
  - Output: TopologyPlan con dispositivos, enlaces, IPs, DHCP pools, routing
  - Usar `src/core/topology/` existente
  **Profile**: `deep` | **Parallel**: NO (blocks 18, 19) | **References**: MCP-Packet-Tracer Orchestrator, `packages/topology/`

- [x] 18. pt_validate_plan

  **What to do**: Implementar validador de TopologyPlan con 15 tipos de error tipificados.
  - Validar: modelos válidos, puertos disponibles, cables correctos, IPs no duplicadas
  - Usar `src/core/validation/` existente
  **Profile**: `deep` | **Parallel**: NO (blocks 19) | **References**: MCP-Packet-Tracer Validator, `src/core/validation/`

- [x] 19. pt_fix_plan

  **What to do**: Implementar auto-corrección de errores comunes en TopologyPlan.
  - Auto-fix: IPs libres, tipos de cable, puertos disponibles
  - MUST NOT: modificar credenciales, seguridad, routing ya configurado
  **Profile**: `deep` | **Parallel**: NO (blocks 20) | **References**: MCP-Packet-Tracer AutoFixer

- [x] 20. pt_explain_plan

  **What to do**: Implementar explicación en lenguaje natural de cada decisión del plan.
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: MCP-Packet-Tracer explainer

- [x] 21. pt_estimate_plan

  **What to do**: Implementar estimación rápida sin generar plan completo (dry-run).
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: MCP-Packet-Tracer estimator

- [x] 22. pt_generate_script

  **What to do**: Implementar generador de script JavaScript para PTBuilder.
  - Output: script JS con addDevice, addLink, configureIosDevice, configurePcIp
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: MCP-Packet-Tracer generator

### Wave 4: Deploy Tools

- [x] 23. pt_generate_configs

  **What to do**: Implementar generador de configuraciones CLI (IOS) por dispositivo.
  - Reusar `src/core/config-generators/ios-generator.ts`
  - Generar: hostname, IPs, DHCP, routing, VLANs
  **Profile**: `deep` | **Parallel**: NO (blocks 24, 25) | **References**: `src/core/config-generators/`

- [x] 24. pt_deploy (clipboard)

  **What to do**: Implementar deploy que copia script al portapapeles con instrucciones.
  **Profile**: `quick` | **Parallel**: YES | **References**: MCP-Packet-Tracer deploy_executor

- [x] 25. pt_live_deploy

  **What to do**: Implementar envío de comandos directo a PT en tiempo real vía HTTP bridge.
  - Conectar a bridge HTTP puerto 54321
  - Enviar comandos JavaScript a PTBuilder
  **Profile**: `deep` | **Parallel**: NO (critical path) | **References**: MCP-Packet-Tracer live_executor, `src/bridge/`

- [x] 26. pt_bridge_status

  **What to do**: Implementar verificación de conexión con Packet Tracer.
  **Profile**: `quick` | **Parallel**: YES | **References**: MCP-Packet-Tracer bridge_status

- [x] 27. pt_query_topology

  **What to do**: Implementar consulta de dispositivos existentes en PT.
  - Usar `src/core/topology/visualizer.ts` existente
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: `src/core/topology/`

- [x] 28. pt_full_build

  **What to do**: Implementar pipeline completo (plan → validate → fix → generate → export).
  **Profile**: `deep` | **Parallel**: NO (depends on all) | **References**: MCP-Packet-Tracer full_build

- [x] 29. pt_export

  **What to do**: Implementar exportación a archivos (JS script, CLI configs, JSON plan).
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: MCP-Packet-Tracer export

### Wave 5: Interactive Tools

- [x] 30. Interactive Lab Creation

  **What to do**: Implementar wizard interactivo para crear labs.
  - Usar readline nativo (NO inquirer/blessed)
  - Preguntar: nombre, número de routers, switches, PCs, routing protocol
  **Profile**: `unspecified-high` | **Parallel**: YES | **References**: `.iflow/skills/cisco-networking-assistant/scripts/config-wizard.ts`

- [x] 31. Interactive Device Selection

  **What to do**: Implementar selección interactiva de dispositivos del catálogo.
  **Profile**: `quick` | **Parallel**: YES

- [x] 32. Interactive Validation UI

  **What to do**: Implementar UI para mostrar errores de validación con sugerencias de fix.
  **Profile**: `unspecified-high` | **Parallel**: YES

- [x] 33. Progress Reporting with chalk/pino

  **What to do**: Implementar reporting de progreso con colores y logging estructurado.
  **Profile**: `quick` | **Parallel**: YES | **References**: `chalk`, `pino` packages

### Wave 6: Integration

- [x] 34. Integration: Plan → Validate → Fix Pipeline

  **What to do**: Integrar pipeline completo de planificación, validación y corrección.
  **Profile**: `deep` | **Parallel**: NO (critical path) | **QA**: Full integration test

- [x] 35. Integration: Validate → Generate → Deploy

  **What to do**: Integrar pipeline de validación, generación y deploy.
  **Profile**: `deep` | **Parallel**: NO (critical path) | **QA**: Full integration test

- [x] 36. Error Recovery & Rollback

  **What to do**: Implementar estrategia de rollback para deploy fallido.
  - Si deploy a N dispositivos falla en dispositivo M, ¿qué hacer?
  **Profile**: `deep` | **Parallel**: NO (critical) | **References**: MCP-Packet-Tracer error handling

- [x] 37. Partial Deploy Handling

  **What to do**: Manejar deploy parcial cuando algunos dispositivos fallan.
  **Profile**: `unspecified-high` | **Parallel**: YES

- [x] 38. Offline Mode Support

  **What to do**: Implementar modo offline cuando Packet Tracer no está disponible.
  - Solo generar configs y scripts sin deploy
  **Profile**: `unspecified-high` | **Parallel**: YES

---

  **What to do**:
  - Reestructurar `apps/cli/src/index.ts` para estilo gh CLI
  - Crear comandos por recurso: `lab`, `device`, `topology`, `config`, `bridge`
  - Migrar comandos actuales a nueva estructura
  - Crear `apps/cli/src/commands/resource/` directorio
  - Implementar patrón: `cisco-auto <recurso> <acción> [flags]`

  **Must NOT do**:
  - NO eliminar comandos existentes hasta migrar
  - NO cambiar comportamiento de comandos actuales
  - NO añadir servidor MCPexterno

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Reestructuración de código existente, patrones claros
  - **Skills**: `[]`
    - No skills adicionales necesarios

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-7)
  - **Blocks**: Task 8 (Bridge), Task 10 (Tool Registry)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `apps/cli/src/index.ts:19-38` - Entry point actual con Commander
  - `https://primer.style/cli/` - Guía de diseño de gh CLI
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/adapters/mcp/tool_registry.py` - Patrón de tool registry

  **Acceptance Criteria**:
  - [ ] `cisco-auto --help` muestra comandos agrupados por recurso
  - [ ] `cisco-auto lab --help` muestra acciones dis ponibles
  - [ ] `cisco-auto device list` funciona como comando válido
  - [ ] Comandos antiguos (`parse`, `config`, `validate`) siguen funcionando con deprecation warning

  **QA Scenarios**:
  ```
  Scenario: CLI help shows resource-based structure
    Tool: Bash
    Preconditions: CLI restructured
    Steps:
      1. cisco-auto --help
      2. Assert output contains "lab", "device", "topology", "config", "bridge" as resources
    Expected Result: Help shows resource-based command structure
    Evidence: .sisyphus/evidence/task-01-help-output.txt

  Scenario: Old commands work with deprecation
    Tool: Bash
    Preconditions: Old command migrated
    Steps:
      1. cisco-auto parse test.yaml 2>&1
      2. Assert stderr contains "deprecated" or "use cisco-auto lab parse"
    Expected Result: Deprecation warning shown
    Evidence: .sisyphus/evidence/task-01-deprecation.txt
  ```

  **Commit**: YES
  - Message: `refactor(cli): migrate to gh-style resource commands`
  - Files: `apps/cli/src/index.ts`, `apps/cli/src/commands/`
  - Pre-commit: `bun test`

- [x] 2. Global Flags Implementation

  **What to do**:
  - Añadir flags globales: `--json`, `--jq`, `--output`, `--verbose`, `--quiet`
  - Implementar formateador de output (JSON, YAML, table, text)
  - Crear `apps/cli/src/output/` módulo
  - Añadir flag `--help` contextual por recurso

  **Must NOT do**:
  - NO romper output actual de comandos
  - NO añadir flags específicos de comando aquí

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI código fuente: flags globales
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/shared/utils.py` - Utilidades de formateo

  **Acceptance Criteria**:
  - [ ] `cisco-auto --json device list` imprime JSON válido
  - [ ] `cisco-auto --jq '.devices[] | .name' device list` filtra output
  - [ ] `cisco-auto --verbose` muestra logs detallados

  **QA Scenarios**:
  ```
  Scenario: JSON output works
    Tool: Bash
    Steps:
      1. cisco-auto device list --json
      2. Assert output starts with '{' or '['
      3. Assert output is valid JSON (use jq to parse)
    Expected Result: Valid JSON output
    Evidence: .sisyphus/evidence/task-02-json-output.txt

  Scenario: jq filtering works
    Tool: Bash
    Steps:
      1. cisco-auto device list --json --jq '.[0].name'
      2. Assert output is a single device name
    Expected Result: Filtered output
    Evidence: .sisyphus/evidence/task-02-jq-filter.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add global flags (--json, --jq, --output)`- Files: `apps/cli/src/index.ts`, `apps/cli/src/output/`

- [x] 3. Output Formatters

  **What to do**:
  - Crear `apps/cli/src/output/formatters/` con formatos: JSON, YAML, Table, Text
  - Implementar detección automática de TTY para output default
  - Crear tablas con `cli-table3` o similar
  - Manejar Paginación para output largo

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI: `pkg/cmdutil/json_flags.go` - Patrón de output

  **Acceptance Criteria**:
  - [ ] `cisco-auto device list --output table` muestra tabla formateada
  - [ ] `cisco-auto device list --output yaml` muestra YAML
  - [ ] Output se adapta a TTY vs pipe

  **QA Scenarios**:
  ```
  Scenario: Table output formats correctly
    Tool: Bash
    Steps:
      1. cisco-auto device list --output table
      2. Assert columns are aligned
      3. Assert headers are present
    Expected Result: Formatted table output
    Evidence: .sisyphus/evidence/task-03-table-output.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add output formatters (JSON, YAML, table)`
  - Files: `apps/cli/src/output/formatters/`

- [x] 4. Error Codes Standardization

  **What to do**:
  - Definir códigos de salida estándar: 0=éxito, 1=error general, 2=uso inválido, 3=no encontrado, 4=timeout, 5=conexión rechazada
  - Crear `apps/cli/src/errors/codes.ts`
  - Implementar mensajes de error user-friendly
  - Añadir sugerencias de corrección en errores comunes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI: `pkg/cmd/pr/shared/` -Patrón de error handling

  **Acceptance Criteria**:
  - [ ] `cisco-auto invalid-command` exits with code 2
  - [ ] `cisco-auto bridge status` cuando PT no conecta exits with code 5
  - [ ] Errores incluyen sugerencias de corrección

  **QA Scenarios**:
  ```
  Scenario: Invalid command returns code 2
    Tool: Bash
    Steps:
      1. cisco-auto nonexistent-command
      2. echo $?
      3. Assert exit code is 2
    Expected Result: Exit code 2 for invalid usage
    Evidence: .sisyphus/evidence/task-04-invalid-code.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): standardize error codes`
  - Files: `apps/cli/src/errors/`

- [x] 5. Shell Completion Setup

  **What to do**:
  - Generar scripts de completion para bash, zsh, fish, powershell
  - Crear comando `cisco-auto completion <shell>`
  - Documentar instalación en README

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI: `pkg/cmd/completion/` - Implementación de completion
  - Commander.js: `program.completion()` API

  **Acceptance Criteria**:
  - [ ] `cisco-auto completion bash` genera script válido
  - [ ] `cisco-auto completion zsh` genera script válido
  - [ ] README documenta cómo instalar completion

  **QA Scenarios**:
  ```
  Scenario: Bash completion generates valid script
    Tool: Bash
    Steps:
      1. cisco-auto completion bash > /tmp/completion.bash
      2. source /tmp/completion.bash
      3. cisco-auto <TAB><TAB>
      4. Assert completions include resources
    Expected Result: Valid completion script
    Evidence: .sisyphus/evidence/task-05-completion.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add shell completion`
  - Files: `apps/cli/src/commands/completion.ts`, `README.md`

- [x] 6. Config File Support

  **What to do**:
  - Crear soporte para `cisco-auto.yaml` en directorio de trabajo
  - Soportar configuración global en `~/.cisco-auto/config.yaml`
  - Implementar precedence: defaults < global < project < env < flags
  - Crear comando `cisco-auto config` para ver/editar config

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI: `pkg/cmd/config/` - Patrón de configuración
  - `/tmp/MCP-Packet-Tracer-mats/src/packet_tracer_mcp/settings.py` - Settings pattern

  **Acceptance Criteria**:
  - [ ] `cisco-auto.yaml` en directorio actual se lee automáticamente
  - [ ] `~/.cisco-auto/config.yaml` se lee como config global
  - [ ] Env vars (`CISCO_AUTO_*`) override config file
  - [ ] Flags override todo

  **QA Scenarios**:
  ```
  Scenario: Config file is loaded
    Tool: Bash
    Steps:
      1. echo "defaultRouter: 2911" > cisco-auto.yaml
      2. cisco-auto config get defaultRouter
      3. Assert output contains "2911"
    Expected Result: Config value from file
    Evidence: .sisyphus/evidence/task-06-config-file.txt
  ```

  **Commit**: YES
  - Message: `feat(cli): add config file support`
  - Files: `apps/cli/src/config/`, `apps/cli/src/commands/config.ts`

- [x] 7. Help System Overhaul

  **What to do**:
  - Mejorar help de cada comando con ejemplos
  - Añadir sección "See also" con comandos relacionados
  - Crear help detallado para cada recurso
  - Soportar `cisco-auto <resource> <action> --help`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `gh` CLI: Help system implementation

  **Acceptance Criteria**:
  - [ ] Cada comando tiene sección de ejemplos
  - [ ] Help incluye flags disponibles con descripción
  - [ ] Help muestra comandos relacionados

  **QA Scenarios**:
  ```
  Scenario: Help shows examples
    Tool: Bash
    Steps:
      1. cisco-auto lab create --help
      2. Assert output contains "Examples:"
      3. Assert examples show actual commands
    Expected Result: Help with examples
    Evidence: .sisyphus/evidence/task-07-help-examples.txt
  ```

  **Commit**: YES
  - Message: `docs(cli): improve help system with examples`
  - Files: `apps/cli/src/commands/`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

Atomic commits following conventional commits format:
- `refactor(cli): migrate to gh-style resource commands`
- `feat(bridge): add PT HTTP bridge on port 54321`
- `feat(mcp): implement tool registry architecture`
- `feat(mcp): implement pt_plan_topology`
- `test(cli): add integration tests for full workflow`

---

## Success Criteria

### Verification Commands
```bash
bun test                              # All tests pass
bun run typecheck                     # TypeScript compiles
cisco-auto --help                     # Shows help by resource
cisco-auto lab --help                 # Shows lab commands
cisco-auto topology validate test.yaml --json  # JSON output works
cisco-auto bridge status              # Bridge health check
curl http://localhost:54321/health    # Bridge HTTP responds
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] CLI follows gh patterns
- [ ] Bridge HTTP works on port 54321
- [ ] 22 tools implemented and tested