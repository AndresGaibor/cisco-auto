# Skill + Bridge Auto-Install System

## TL;DR

> **Quick Summary**: Crear sistema de skill multi-CLI con instalación automática del bridge PT para Cisco Packet Tracer 8.2+
> 
> **Deliverables**:
> - Bridge server con endpoints `/next`, `/execute`, `/bridge-client.js`
> - Comando CLI `cisco-auto bridge install` con automatización AppleScript
> - Skill `cisco-networking-assistant` sincronizado en todos los CLIs
> - Script `sync-skills.ts` para sincronización multi-CLI
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Bridge Server → CLI Command → macOS Automation → Sync Script

---

## Context

### Original Request
Crear un sistema de skill que funcione en múltiples CLI tools (Gemini CLI, Qwen Code, iFlow CLI, OpenCode, Claude Code) con instalación automática del bridge PT al usar el skill.

### Interview Summary
**Key Discussions**:
- **Tipo de skill**: Mejorar el existente `cisco-networking-assistant`
- **Instalación del bridge**: vía Builder Code Editor con `evaluateJavaScriptAsync`
- **OS Detection**: macOS (AppleScript), Windows (PowerShell), Linux (pendiente)
- **CLI Tools**: Todos sincronizados
- **Método de automatización**: Bootstrap code que hace polling al bridge server

**Research Findings**:
- Extensiones .pts/.pkp/.ptst son binarios cifrados Crypto++ (NO replicables)
- PT tiene APIs internas: `evaluateJavaScriptAsync`, `$se('runCode')`
- Bridge server actual en puerto 3000, necesita endpoints nuevos
- Skills duplicados en `.iflow/` y `.gemini/`

### Metis Review

**Critical Issues Identified**:
1. **Port Mismatch**: API server on 3000, bridge mentioned on 54321
2. **Missing Endpoints**: `/next`, `/execute`, `/bridge-client.js` don't exist
3. **No Automation Code**: AppleScript and `sync-skills.ts` missing

**Identified Gaps (addressed)**:
- Puerto del bridge server: Definir `BRIDGE_PORT` env var (default 54321)
- Comportamiento de `/next`: Devuelve comando pendiente o vacío
- Función `$se`: Verificar existencia en PT 8.2+
- Detección de versión PT: Validar antes de instalar

---

## Work Objectives

### Core Objective
Implementar un sistema de bridge para Cisco Packet Tracer que permita comunicación bidireccional entre CLI tools y PT, con instalación automática vía Builder Code Editor.

### Concrete Deliverables
- `src/bridge/server.ts` - Bridge server en puerto 54321
- `src/bridge/routes/` - Endpoints `/health`, `/next`, `/execute`, `/bridge-client.js`
- `apps/cli/src/commands/bridge/index.ts` - Comando `bridge install|status|uninstall`
- `scripts/install-bridge-macos.scpt` - AppleScript para automatización
- `scripts/sync-skills.ts` - Sincronización multi-CLI
- `.iflow/skills/cisco-networking-assistant/SKILL.md` - Skill actualizado

### Definition of Done
- [ ] Bridge server responde en puerto 54321
- [ ] `curl http://127.0.0.1:54321/health` returns `{"status":"ok","bridge":"connected"}`
- [ ] `cisco-auto bridge install` detecta PT y OS correctamente
- [ ] Bootstrap se inyecta exitosamente en PT Builder Code Editor
- [ ] `/next` devuelve comandos que PT ejecuta vía `$se('runCode')`
- [ ] Skill sincronizado en todos los directorios CLI

### Must Have
- Detección automática de OS (macOS/Windows/Linux)
- Comando `bridge install` con automatización AppleScript
- Endpoints `/next`, `/execute`, `/bridge-client.js` funcionales
- Sincronización multi-CLI

### Must NOT Have (Guardrails)
- NO modificar el API server existente (puerto 3000)
- NO hardcodear puerto sin opción de configuración
- NO asumir que AppleScript funciona sin permisos
- NO crear variants de skill que diverjan

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test)
- **Automated tests**: YES - TDD approach
- **Framework**: bun test
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task includes agent-executed QA scenarios with specific commands.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: Define Bridge Server contract [unspecified-high]
├── Task 2: Create Bridge Server endpoints [unspecified-high]
├── Task 3: Implement `/bridge-client.js` endpoint [unspecified-high]
└── Task 4: Create CLI bridge command structure [unspecified-high]

Wave 2 (After Wave 1 — core implementation):
├── Task 5: Implement OS detection [quick]
├── Task 6: Create AppleScript for macOS automation [unspecified-high]
├── Task 7: Implement `bridge install` command [unspecified-high]
└── Task 8: Implement `bridge status` verification [unspecified-high]

Wave 3 (After Wave 2 — synchronization):
├── Task 9: Create sync-skills.ts script [unspecified-high]
├── Task 10: Update SKILL.md documentation [writing]
├── Task 11: Add error handling and edge cases [unspecified-high]
└── Task 12: Write integration tests [unspecified-high]

Wave FINAL (After ALL tasks — verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Manual QA with real PT (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix

- **1-4**: No dependencies (can run in parallel)
- **5-8**: Depend on Wave 1 completion
- **9-12**: Depend on Wave 2 completion
- **FINAL**: Depends on all tasks complete

### Agent Dispatch Summary

- **Wave 1**: **4** agents in parallel (all unspecified-high)
- **Wave 2**: **4** agents (1 quick, 3 unspecified-high)
- **Wave 3**: **4** agents (1 writing, 3 unspecified-high)
- **FINAL**: **4** agents (oracle, 2 unspecified-high, deep)

---

## TODOs

- [x] 1. Define Bridge Server Contract

  **What to do**:
  - Create `docs/bridge-api-contract.md` documenting expected behavior
  - Define `/health` endpoint: `GET /health` → `{"status":"ok","bridge":"connected|disconnected"}`
  - Define `/next` endpoint: `GET /next` → `{command: string} | {}`
  - Define `/execute` endpoint: `POST /execute` with body `{command: string}` → `{queued: boolean}`
  - Define `/bridge-client.js` endpoint: `GET /bridge-client.js` → JavaScript bootstrap
  - Document polling interval (500ms) and timeout handling

  **Must NOT do**:
  - Break existing API server on port 3000

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []- writing skill for documentation clarity

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5-8
  - **Blocked By**: None

  **References**:
  - `src/api/start.ts:9` - Current API server port configuration
  - Existing endpoints: `/api/health`, `/api/labs`, `/api/templates`- Metis review: Port mismatch identified

  **Acceptance Criteria**:
  - [ ] Document exists at `docs/bridge-api-contract.md`
  - [ ] All endpoints documented with request/response examples
  - [ ] Error scenarios documented

  **QA Scenarios**:

  Scenario: Document completeness
    Tool: Read
    Preconditions: File exists
    Steps:
      1. Read `docs/bridge-api-contract.md`      2. Verify contains `/health`, `/next`, `/execute`, `/bridge-client.js`
    Expected Result: All 4 endpoints documented
    Evidence: .sisyphus/evidence/task-01-contract.md

- [x] 2. Create Bridge Server Structure

  **What to do**:
  - Create `src/bridge/server.ts` with Bun.serve()
  - Use `BRIDGE_PORT` env var (default 54321)
  - Implement basic routing structure
  - Add CORS headers for PT WebView access
  - Create `src/bridge/routes/health.ts` for `/health` endpoint

  **Must NOT do**:
  - Modify existing API server
  - Hardcode port without config option

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-8
  - **Blocked By**: None

  **References**:
  - `src/api/start.ts` - Existing server pattern
  - `src/bridge/routes/health.ts` - Health endpoint example

  **Acceptance Criteria**:
  - [ ] Bridge server starts on configurable port
  - [ ] `BRIDGE_PORT` environment variable respected
  - [ ] CORS headers configured for PT WebView

  **QA Scenarios**:

  Scenario: Server starts and responds
    Tool: Bash (curl)
    Preconditions: Server started
    Steps:
      1. `bun run src/bridge/server.ts &`
      2. `sleep 2`
      3. `curl http://127.0.0.1:54321/health`
    Expected Result: `{"status":"ok"}`
    Evidence: .sisyphus/evidence/task-02-server-start.txt

- [x] 3. Implement Bridge Endpoints

  **What to do**:
  - Create `src/bridge/routes/next.ts` - Returns pending command or empty
  - Create `src/bridge/routes/execute.ts` - Queues commands for PT
  - Create `src/bridge/routes/client.ts` - Serves bootstrap script
  - Implement command queue (in-memory array for MVP)
  - Add proper TypeScript types

  **Must NOT do**:
  - Persist commands to disk (out of scope)
  - Implement authentication (MVP only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-8
  - **Blocked By**: None

  **References**:
  - `docs/bridge-api-contract.md` - API contract
  - `src/bridge/server.ts` - Server entry point

  **Acceptance Criteria**:
  - [ ] `GET /next` returns command or empty object
  - [ ] `POST /execute` queues command
  - [ ] `GET /bridge-client.js` returns JavaScript

  **QA Scenarios**:

  Scenario: Command queue works
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `curl -X POST http://127.0.0.1:54321/execute -d '{"command":"show version"}'`
      2. `curl http://127.0.0.1:54321/next`
    Expected Result: Returns `{"command":"show version"}`
    Evidence: .sisyphus/evidence/task-03-queue.txt- [x] 4. Create CLI Bridge Command Structure

  **What to do**:
  - Create `apps/cli/src/commands/bridge/index.ts` with subcommands
  - Implement `bridge start` - Start bridge server
  - Implement `bridge status` - Show connection status
  - Implement `bridge install` placeholder (Wave 2)
  - Implement `bridge uninstall` placeholder (Wave 2)- Add proper CLI help text

  **Must NOT do**:
  - Implement platform-specific automation yet (Wave 2)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-8
  - **Blocked By**: None

  **References**:
  - `apps/cli/src/commands/bridge/command.ts` - Existing bridge command
  - `apps/cli/src/index.ts` - CLI entry point

  **Acceptance Criteria**:
  - [ ] `cisco-auto bridge --help` shows usage
  - [ ] `cisco-auto bridge start` starts server
  - [ ] `cisco-auto bridge status` shows status

  **QA Scenarios**:

  Scenario: CLI help works
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. `bun run apps/cli/src/index.ts bridge --help`
    Expected Result: Shows usage with start, status, install, uninstall
    Evidence: .sisyphus/evidence/task-04-cli-help.txt

---

- [x] 5. Implement OS Detection

  **What to do**:
  - Create `src/bridge/os-detection.ts`
  - Implement `detectOS()` returning 'macos' | 'windows' | 'linux'
  - Implement `detectPacketTracer()` returning installation path or null
  - Implement `isPacketTracerRunning()` for each OS
  - Add unit tests

  **Must NOT do**:
  - Assume PT is always installed in standard location

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Wave 1 completion

  **References**:
  - Investigation: `/Applications/Cisco Packet Tracer*/` on macOS
  - Investigation: `C:\Program Files\Cisco Packet Tracer*\` on Windows

  **Acceptance Criteria**:
  - [ ] `detectOS()` returns correct platform
  - [ ] `detectPacketTracer()` finds PT or returns null
  - [ ] `isPacketTracerRunning()` works on current OS

  **QA Scenarios**:

  Scenario: OS detection works
    Tool: Bun test
    Preconditions: None
    Steps:
      1. `bun test src/bridge/os-detection.test.ts`
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-05-os-detection.txt

- [x] 6. Create AppleScript for macOS Automation

  **What to do**:
  - Create `scripts/install-bridge-macos.scpt`
  - Script opens PT if not running
  - Script navigates to Extensions > Builder Code Editor
  - Script pastes bootstrap code via `evaluateJavaScriptAsync`
  - Add timeout handling (10s max)
  - Create `scripts/uninstall-bridge-macos.scpt` for cleanup

  **Must NOT do**:
  - Execute without accessibility permissions check
  - Hang indefinitely if PT doesn't respond

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Wave 1 completion

  **References**:
  - Investigation: PT has `evaluateJavaScriptAsync` API
  - Investigation: Menu path "Extensions > Builder Code Editor"

  **Acceptance Criteria**:
  - [ ] AppleScript compiles without errors
  - [ ] Script handles PT not running gracefully
  - [ ] Script handles menu navigation timeout

  **QA Scenarios**:

  Scenario: AppleScript is valid
    Tool: Bash (osacompile)
    Preconditions: macOS
    Steps:
      1. `osacompile -o /tmp/test.scpt scripts/install-bridge-macos.scpt`
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-06-applescript.txt

- [x] 7. Implement `bridge install` Command

  **What to do**:
  - Complete `bridge install` implementation in CLI
  - Detect OS and call appropriate automation script
  - Check PT is running before attempting install
  - Verify bootstrap injection succeeded
  - Provide clear error messages for each failure mode

  **Must NOT do**:
  - Fail silently
  - Assume AppleScript works without permissions

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5, 6

  **References**:
  - `src/bridge/os-detection.ts` - OS detection
  - `scripts/install-bridge-macos.scpt` - AppleScript
  - `docs/bridge-api-contract.md` - API contract

  **Acceptance Criteria**:
  - [ ] Detects OS correctly
  - [ ] Launches PT if not running
  - [ ] Injects bootstrap successfully
  - [ ] Shows success/error message clearly

  **QA Scenarios**:

  Scenario: Install shows clear error when PT not found
    Tool: Bash
    Preconditions: PT not installed
    Steps:
      1. `bun run apps/cli/src/index.ts bridge install`
    Expected Result: Error message "Packet Tracer not found"
    Evidence: .sisyphus/evidence/task-07-install-error.txt

- [x] 8. Implement `bridge status` Verification

  **What to do**:
  - Complete `bridge status` to show:
    - Bridge server running state
    - PT connection state (polling `/health`)
    - PT version if detected
  - Return JSON for programmatic use
  - Return human-readable output for CLI

  **Must NOT do**:
  - Assume server is always running

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Wave 1 completion

  **References**:
  - `src/bridge/routes/health.ts` - Health endpoint

  **Acceptance Criteria**:
  - [ ] Shows server running/not running
  - [ ] Shows PT connected/disconnected
  - [ ] JSON output available with `--json` flag

  **QA Scenarios**:

  Scenario: Status shows correct state
    Tool: Bash (curl)
    Preconditions: Server running
    Steps:
      1. `bun run apps/cli/src/index.ts bridge status`
    Expected Result: Shows server status and PT status
    Evidence: .sisyphus/evidence/task-08-status.txt

---

- [x] 9. Create sync-skills.ts Script

  **What to do**:
  - Create `scripts/sync-skills.ts`
  - Read source skill from `.iflow/skills/cisco-networking-assistant/`
  - Copy to `.gemini/`, `.claude/`, `.qwen/`, `.agents/`
  - Update `skills-lock.json` with sync metadata
  - Add `--dry-run` option for preview
  - Add `--check` option for verification

  **Must NOT do**:
  - Transform or modify skill content
  - Delete files without confirmation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Wave 2 completion

  **References**:
  - `skills-lock.json` - Existing lock file
  - `.iflow/skills/cisco-networking-assistant/` - Source skill

  **Acceptance Criteria**:
  - [ ] Copies skill to all CLI directories
  - [ ] Updates skills-lock.json
  - [ ] `--dry-run` shows what would be done

  **QA Scenarios**:

  Scenario: Sync works correctly
    Tool: Bash
    Preconditions: Skill exists in `.iflow/`
    Steps:
      1. `bun run scripts/sync-skills.ts`
      2. Compare `.gemini/` and `.iflow/` directories
    Expected Result: Identical content
    Evidence: .sisyphus/evidence/task-09-sync.txt

- [x] 10. Update SKILL.md Documentation

  **What to do**:
  - Add "Bridge Installation" section to SKILL.md
  - Document `cisco-auto bridge install` command
  - Document `cisco-auto bridge status` command
  - Add troubleshooting section for common issues
  - Add manual installation fallback steps

  **Must NOT do**:
  - Remove existing skill content
  - Add outdated or incorrect information

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`documentation-engineer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `.iflow/skills/cisco-networking-assistant/SKILL.md` - Existing skill
  - `docs/bridge-api-contract.md` - API documentation

  **Acceptance Criteria**:
  - [ ] Bridge installation section present
  - [ ] All commands documented with examples
  - [ ] Troubleshooting section included

  **QA Scenarios**:

  Scenario: Documentation is complete
    Tool: Read
    Preconditions: File updated
    Steps:
      1. Read SKILL.md
      2. Check for "## Bridge Installation" section
    Expected Result: Section exists with clear instructions
    Evidence: .sisyphus/evidence/task-10-docs.md

- [x] 11. Add Error Handling and Edge Cases

  **What to do**:
  - Handle PT not running
  - Handle accessibility permissions denied
  - Handle port conflict (54321 in use)
  - Handle PT version not supported
  - Handle timeout during menu navigation
  - Add clear error messages with recovery suggestions

  **Must NOT do**:
  - Crash without message
  - Show technical stack traces to users

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:
  - `src/bridge/os-detection.ts` - OS detection
  - `scripts/install-bridge-macos.scpt` - AppleScript

  **Acceptance Criteria**:
  - [ ] Each failure mode has clear error message
  - [ ] Recovery suggestions provided
  - [ ] No technical jargon in user-facing messages

  **QA Scenarios**:

  Scenario: Port conflict handled gracefully
    Tool: Bash
    Preconditions: Another process on port 54321
    Steps:
      1. Start dummy server on 54321
      2. `bun run apps/cli/src/index.ts bridge start`
    Expected Result: Clear error about port conflict
    Evidence: .sisyphus/evidence/task-11-port-error.txt

- [x] 12. Write Integration Tests

  **What to do**:
  - Create `tests/integration/bridge-server.test.ts`
  - Test `/health`, `/next`, `/execute`, `/bridge-client.js`
  - Create `tests/integration/bridge-install.test.ts`
  - Test OS detection functions
  - Mock AppleScript execution for testing

  **Must NOT do**:
  - Require real PT installation (use mocks)
  - Leave test servers running

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3,4

  **References**:
  - `tests/integration/pt-bridge.test.ts` - Existing test pattern
  - `docs/bridge-api-contract.md` - API contract

  **Acceptance Criteria**:
  - [ ] All endpoints tested
  - [ ] OS detection tested
  - [ ] `bun test` passes

  **QA Scenarios**:

  Scenario: All tests pass
    Tool: Bash (bun test)
    Preconditions: Tests written
    Steps:
      1. `bun test tests/integration/bridge-*.test.ts`
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-12-tests.txt

---

## Final Verification Wave (MANDATORY)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Verify all "Must Have" implemented, all "Must NOT Have" absent, evidence files exist.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Check `as any`, empty catches, console.log.

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start PT, run `bridge install`, verify bootstrap injection, test command execution.

- [x] F4. **Scope Fidelity Check** — `deep`
  Compare plan vs implementation. No missing features, no scope creep.

---

## Commit Strategy

- **1**: `feat(bridge): add bridge server with /next, /execute, /bridge-client.js endpoints`
- **2**: `feat(cli): add bridge install command with macOS automation`
- **3**: `feat(scripts): add sync-skills.ts for multi-CLI synchronization`
- **4**: `docs(skill): update cisco-networking-assistant with bridge instructions`

---

## Success Criteria

### Verification Commands
```bash
# Start bridge server
bun run src/bridge/server.ts

# Health check
curl http://127.0.0.1:54321/health
# Expected: {"status":"ok","bridge":"connected","version":"1.0.0"}

# Get bootstrap client
curl http://127.0.0.1:54321/bridge-client.js
# Expected: JavaScript content with polling loop

# Install bridge (with PT running)
bun run apps/cli/src/index.ts bridge install
# Expected: PT receives bootstrap, polling begins

# Check status
bun run apps/cli/src/index.ts bridge status
# Expected: Bridge server status + PT connection status

# Sync skills
bun run scripts/sync-skills.ts
# Expected: All CLI directories updated
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Bridge server runs on configurable port
- [ ] macOS AppleScript automation works
- [ ] Skill synchronized across all CLIs