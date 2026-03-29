# Plan: Integración Packet Tracer Completa

## TL;DR

> **QuickSummary**: Extender cisco-auto para soportar TODAS las funcionalidades dePacket Tracer (VLANs, ACLs, NAT,OSPF, etc.) desde la CLI, con bootstrap permanente y tests deintegración.
> 
> **Deliverables**:
> - Archivo `.pts` auto-cargable para bootstrap permanente
> - Extensión de `generate-script.ts` para todos los generadores IOS
> - Nuevos comandos CLI para configuraciones avanzadas
> - Tests de integración con Packet Tracer real
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T0 → T1 → T2 → T3

---

## Context

### Original Request
El usuario quiere editar Packet Tracer en tiempo real desde la CLI de cisco-auto, con soporte completo para VLANs, ACLs, NAT, OSPF, STP, etc.

### Interview Summary

**Key Discussions**:
- **Arquitectura**: HTTP polling via WebView (no WebSocket, no XML)
- **Bootstrap**: Necesario para inyectar polling en WebView porque Script Engine no tiene XMLHttpRequest
- **Generadores existentes**: YA existen todos los generadores IOS (VLANs, STP, ACLs, routing, etc.)
- **Gap principal**: `generate-script.ts` solo genera IPs básicas, no usa los generadores completos

**Research Findings**:
- Script Engine tiene APIs completas (`lw.addDevice`, `configureIosDevice`, etc.)
- No hay APIs nativas para VLAN/ACL/NAT - hay que enviar comandos IOS
- Nombres de dispositivos son auto-modificados por PT (Router1 → Router1(1))

### Metis Review

**Identified Gaps** (addressed):
- Falta bootstrap .pts para auto-loading
- `generate-script.ts` no integra todos los generadores
- CLI commands faltantes para configuraciones avanzadas
- Tests de integración inexistentes

**Guardrails Applied**:
- Mantener backward compatibility con CLI existente
- No hardcodear credentials
- Seguir commit strategy atómico

---

## Work Objectives

### Core Objective
Integrar TODAS las funcionalidades de Packet Tracer en cisco-auto para edición en tiempo real desde la CLI, sin necesidad de servidor MCP externo.

### Concrete Deliverables
- `assets/pt-scripts/auto-connect.pts` - Bootstrap permanente
- `src/bridge/pts-template-generator.ts` - Generador de templates .pts
- `src/tools/topology/generate-script.ts` - Extendido con todos los generadores
- `apps/cli/src/commands/vlan.ts` - CLI para VLANs
- `apps/cli/src/commands/stp.ts` - CLI para STP
- `apps/cli/src/commands/routing.ts` - CLI para OSPF/EIGRP/BGP
- `apps/cli/src/commands/acl.ts` - CLI para ACLs
- `apps/cli/src/commands/services.ts` - CLI para DHCP/NTP/SNMP
- `tests/integration/pt-*.test.ts` - Tests de integración

### Definition of Done
- [ ] `cisco-auto bridge start` inicia el server correctamente
- [ ] `cisco-auto lab vlan create --name VLAN10 --id 10` genera VLAN en PT
- [ ] `cisco-auto lab routing ospf enable --device R1` configura OSPF en PT
- [ ] `cisco-auto lab acl create --name BLOCK_TELNET` genera ACL en PT
- [ ] Bootstrap .pts se carga automáticamente en PT
- [ ] Todos los tests pasan: `bun test`

### Must Have
- Bootstrap permanente que no requiera pegar código manualmente
- Extensión de generate-script para usar TODOS los generadores IOS
- CLI commands para VLAN, STP, routing, ACL, services
- Tests unitarios para cada nuevo componente

### Must NOT Have (Guardrails)
- Servidor MCP externo (ya está integrado en el CLI)
- Modificación del código fuente de Packet Tracer
- Hardcodeo de credentials o tokens
- Bridge server accesible desde non-localhost sin flag explícito
- Features fuera del scope (solo PT integration + CLI commands)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Bun test)
- **Automated tests**: YES - Unit tests para cada componente
- **Framework**: Bun test
- **Test Strategy**: TDD - Tests primero, luego implementación

### QA Policy
Every task MUST include agent-executed QA scenarios.

- **Unit Tests**: `bun test src/**/__tests__/*.test.ts`
- **Integration Tests**: `bun test tests/integration/*.test.ts` (requiere PT instalado)
- **CLI Tests**: `bun test apps/cli/__tests__/commands/*.test.ts`

---

## Execution Strategy

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T0 (Bootstrap) | — | T1, T2 |
| T1 (Extend generate-script) | T0 | T2 |
| T2 (CLI Commands) | T1 | T3 |
| T3 (Integration Tests) | T2 | — |

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── T0: Bootstrap .pts Generator [quick]
├── T1: Device Name Resolver [quick]
└── T1.5: Robust Bootstrap Script [quick]

Wave 2 (After T0 — core integration):
├── T2: Extend generate-script.ts [deep]
└── T2.5: IOS Command Pusher [quick]

Wave 3 (After T2 — CLI commands):
├── T3a: VLAN CLI Command [quick]
├── T3b: STP CLI Command [quick]
├── T3c: Routing CLI Command [deep]
├── T3d: ACL CLI Command [quick]
└── T3e: Services CLI Command [quick]

Wave 4 (After T3 — integration):
├── T4a: PT Bridge Integration Test [unspecified-high]
├── T4b: PT Execute Script Test [unspecified-high]
└── T4c: PT Validate Topology Test [unspecified-high]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
```

### Agent Dispatch Summary

- **Wave 1**: **3** — T0 → `quick`, T1 → `quick`, T1.5 → `quick`
- **Wave 2**: **2** — T2 → `deep`, T2.5 → `quick`
- **Wave 3**: **5** — T3a → `quick`, T3b → `quick`, T3c → `deep`, T3d → `quick`, T3e → `quick`
- **Wave 4**: **3** — T4a → `unspecified-high`, T4b → `unspecified-high`, T4c → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.

- [x] 1. **Bootstrap .pts Generator — Wave 1**

  **What to do**:
  - Crear `assets/pt-scripts/auto-connect.pts` con el bootstrap permanente
  - Crear `src/bridge/pts-template-generator.ts` para generar .pts con topología embebida
  - El archivo .pts debe incluir:
    - Topología serializada (dispositivos, enlaces, configuraciones)
    - Script PTBuilder auto-ejecutable
    - Bootstrap HTTP polling inyectado en WebView

  **Must NOT do**:
  - No modificar el código existente del bridge server
  - No hardcodear URLs o puertos

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (no special skills needed)

  **Parallelization**:
  - **Can Run In Parallel**: NO - Es la fundación para las demás tareas
  - **Parallel Group**: Wave 1
  - **Blocks**: T1, T2
  - **Blocked By**: None (can start immediately)

  **References**:
  - `docs/MCP-Packet-Tracer/WIKI.md:451-472` - Bootstrap script y arquitectura HTTP bridge
  - `src/bridge/server.ts:1-150` - Servidor HTTP existente para referencia
  - `src/tools/topology/generate-script.ts:1-100` - Patrón de generación de scripts

  **Acceptance Criteria**:
  - [ ] `assets/pt-scripts/auto-connect.pts` existe y es válido JavaScript
  - [ ] `src/bridge/pts-template-generator.ts` exporta `generatePtsTemplate(topology: TopologyPlan): string`
  - [ ] Test: `bun test src/bridge/__tests__/pts-template-generator.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Generate bootstrap .pts file
    Tool: Bash
    Preconditions: TopologyPlan válido con2 routers, 1 switch
    Steps:
      1. const template = generatePtsTemplate(topologyPlan)
      2. fs.writeFileSync('test.pts', template)
      3. Verify: template includes "setInterval" and "http://127.0.0.1:54321"
    Expected Result: Template contiene bootstrap válido
    Evidence: .sisyphus/evidence/task-1-generate-pts.pts
  ```

  **Commit**: YES
  - Message: `feat: add pts-template-generator for bootstrap`
  - Files: `assets/pt-scripts/auto-connect.pts`, `src/bridge/pts-template-generator.ts`
  - Pre-commit: `bun test src/bridge/__tests__/pts-template-generator.test.ts`

---

- [x] 2. **Device Name Resolver — Wave 1**

  **What to do**:
  - Crear `src/tools/topology/device-name-resolver.ts`
  - Manejar el caso donde PT auto-modifica nombres (Router1 → Router1(1))
  - Implementar mapeo: nombre original → nombre PT asignado
  - Usar `queryTopology()` para obtener nombres actuales y crear resolver

  **Must NOT do**:
  - No modificar los tipos existentes de DevicePlan
  - No asumir que los nombres son estables

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T0)
  - **Parallel Group**: Wave 1
  - **Blocks**: T1
  - **Blocked By**: None

  **References**:
  - `docs/MCP-Packet-Tracer/WIKI.md:55-57` - "Device names may be auto-modified"
  - `src/tools/deploy/query-topology.ts` - Para obtener dispositivos actuales

  **Acceptance Criteria**:
  - [ ] `src/tools/topology/device-name-resolver.ts` existe
  - [ ] Exporta `resolveDeviceNames(originalPlan: TopologyPlan, currentTopology: DeviceList): ResolvedPlan`
  - [ ] Test: `bun test src/tools/topology/__tests__/device-name-resolver.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: Resolve device names after PT auto-modification
    Tool: Bun test
    Steps:
      1. Create topology with "Router1", "Switch1"
      2. Simulate PT returning "Router1(1)", "Switch1"
      3. Call resolveDeviceNames(originalPlan, currentTopology)
    Expected Result: Returns plan with corrected names
    Evidence: .sisyphus/evidence/task-2-resolver.txt
  ```

  **Commit**: YES
  - Message: `feat: add device name resolver for PT auto-modifications`

---

- [x] 2.5. **Robust Bootstrap Script — Wave 1**

  **What to do**:
  - Crear `assets/pt-scripts/bridge-client.js` - Script robusto para inyectar en WebView
  - Mejoras sobre el script básico:
    - Reconexión automática con backoff exponencial
    - Heartbeat cada5s para verificar conexión
    - Manejo de errores con reintentos
    - Bidireccionalidad: GET/next + POST/result
    - Cola de comandos con límite (100 comandos)
    - Cleanup al cerrar (stop interval)
    - Logs estructurados para debugging

  **Script mejorado**:
  ```javascript
  // Bridge Client v2 - Robust PT Connection
  (function() {
    const BRIDGE_URL = 'http://127.0.0.1:54321';
    const POLL_INTERVAL = 500;
    const HEARTBEAT_INTERVAL = 5000;
    const MAX_RETRIES = 10;
    const MAX_QUEUE = 100;
    
    let retryCount = 0;
    let pollIntervalId = null;
    let heartbeatIntervalId = null;
    let commandQueue = [];
    let isConnected = false;
    
    function log(level, message) {
      console.log('[PT-Bridge][' + level + '] ' + message);
    }
    
    function reconnect() {
      retryCount++;
      if (retryCount > MAX_RETRIES) {
        log('error', 'Max retries reached, stopping');
        stop();
        return;
      }
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
      log('warn', 'Reconnecting in ' + delay + 'ms (attempt ' + retryCount + ')');
      setTimeout(start, delay);
    }
    
    function poll() {
      var x = new XMLHttpRequest();
      x.open('GET', BRIDGE_URL + '/next', true);
      x.timeout = 2000;
      x.onload = function() {
        if (x.status === 200 && x.responseText) {
          retryCount = 0;
          isConnected = true;
          if (commandQueue.length < MAX_QUEUE) {
            try {
              $se('runCode', x.responseText);
            } catch(e) {
              log('error', 'Execution error: ' + e.message);
            }
          } else {
            log('warn', 'Queue full, dropping command');
          }
        }
      };
      x.onerror = function(e) {
        isConnected = false;
        log('error', 'Poll error: ' + e);
        reconnect();
      };
      x.ontimeout = function() {
        log('warn', 'Poll timeout');
      };
      x.send();
    }
    
    function heartbeat() {
      var x = new XMLHttpRequest();
      x.open('GET', BRIDGE_URL + '/ping', true);
      x.timeout = 1000;
      x.onload = function() {
        if (x.status === 200) {
          isConnected = true;
          log('debug', 'Heartbeat OK');
        }
      };
      x.onerror = function() {
        isConnected = false;
        log('warn', 'Heartbeat failed');
      };
      x.send();
    }
    
    function sendResult(commandId, result) {
      var x = new XMLHttpRequest();
      x.open('POST', BRIDGE_URL + '/result', true);
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify({ id: commandId, result: result }));
    }
    
    function start() {
      if (pollIntervalId) return;
      pollIntervalId = setInterval(poll, POLL_INTERVAL);
      heartbeatIntervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL);
      log('info', 'Bridge client started');
    }
    
    function stop() {
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
      pollIntervalId = null;
      heartbeatIntervalId = null;
      log('info', 'Bridge client stopped');
    }
    
    // Auto-start
    start();
    
    // Expose API
    window.PTBridge = { start, stop, sendResult, isConnected: () => isConnected };
  })();
  ```

  **Must NOT do**:
  - No modificar el bridge server existente (solo agregar endpoints si es necesario)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T0, T1)
  - **Parallel Group**: Wave 1
  - **Blocks**: T3 (integration tests)
  - **Blocked By**: None

  **References**:
  - `docs/MCP-Packet-Tracer/WIKI.md:451-472` - Arquitectura del bridge
  - `src/bridge/server.ts:56-106` - CommandQueue existente

  **Acceptance Criteria**:
  - [ ] `assets/pt-scripts/bridge-client.js` existe y es válido JavaScript
  - [ ] Script incluye reconexión con backoff exponencial
  - [ ] Script incluye heartbeat para verificar conexión activa
  - [ ] Script incluye manejo de errores con reintentos
  - [ ] Test: El script se puede inyectar en WebView sin errores

  **QA Scenarios**:
  ```
  Scenario: Script handles connection errors
    Tool: Manual verification in PT Builder Code Editor
    Steps:
      1. Paste bridge-client.js in Builder Code Editor
      2. Run without bridge server running
      3. Verify: Script logs "Reconnecting in 1000ms (attempt 1)"
      4. Start bridge server
      5. Verify: Script logs "Heartbeat OK" and "Bridge client started"
    Expected Result: Script reconnects automatically when bridge starts
    Evidence: .sisyphus/evidence/task-2.5-robust-script.png
  ```

  **Commit**: YES
  - Message: `feat: add robust bridge client with reconnection and heartbeat`

---

- [x] 3. **Extend generate-script.ts — Wave 2**

  **What to do**:
  - Extender `src/tools/topology/generate-script.ts` para usar TODOS los generadores IOS
  - Integrar: vlan-generator, stp.generator, etherchannel.generator, routing-generator, advanced-routing.generator, security-generator, services.generator
  - Crear función `generateIosCommands(device: DevicePlan): string[]` que agregue comandos VLAN, STP, routing, ACL, etc.
  - Actualizar generateJavaScript y generatePython para incluir comandos IOS completos

  **Must NOT do**:
  - No duplicar código de los generadores existentes
  - No modificar la interfaz de TopologyPlan existente

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: T2a-T2e
  - **Blocked By**: T0, T1.1

  **References**:
  - `src/core/config-generators/vlan-generator.ts:1-95` - VLAN generation
  - `src/core/config-generators/stp.generator.ts` - STP generation
  - `src/core/config-generators/security-generator.ts:1-70` - ACL/NAT generation
  - `src/core/config-generators/services.generator.ts:1-100` - DHCP/NTP/SNMP
  - `src/tools/topology/generate-script.ts:100-182` - Patrón actual de generación IOS

  **Acceptance Criteria**:
  - [ ] generateIosCommands(device) genera comandos VLAN, STP, routing, ACL según device
  - [ ] generateJavaScript incluye todos los comandos IOS
  - [ ] Test: `bun test src/tools/topology/__tests__/generate-script.test.ts` → PASS (con tests de VLAN, STP, routing)

  **QA Scenarios**:
  ```
  Scenario: Generate VLAN commands for switch
    Tool: Bun test
    Steps:
      1. Create DevicePlan with vlans: [{id: 10, name: "Sales"}, {id: 20, name: "Engineering"}]
      2. Call generateIosCommands(device)
    Expected Result: Commands include "vlan 10", "name Sales", "vlan 20", "name Engineering"
    Evidence: .sisyphus/evidence/task-3-vlan-commands.txt
  ```

  **Commit**: YES
  - Message: `feat: extend generate-script with all IOS generators`
  - Pre-commit: `bun test src/tools/topology/__tests__/generate-script.test.ts`

---

- [x] 4. **IOS Command Pusher — Wave 2**

  **What to do**:
  - Crear `src/bridge/ios-command-pusher.ts`
  - Implementar función que tome comandos IOS y los envíe al bridge
  - Manejar cola de comandos con timeout
  - Retornar resultado de ejecución

  **Must NOT do**:
  - No modificar el bridge server existente

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T1.2)
  - **Parallel Group**: Wave 2
  - **Blocks**: T2
  - **Blocked By**: T0

  **References**:
  - `src/bridge/server.ts:56-106` - CommandQueue implementation
  - `docs/MCP-Packet-Tracer/WIKI.md:380-387` - configureIosDevice API

  **Acceptance Criteria**:
  - [ ] `iosCommandPusher.pushCommands(deviceId, commands)` envía comandos al bridge
  - [ ] Maneja timeout de30 segundos
  - [ ] Test: `bun test src/bridge/__tests__/ios-command-pusher.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add ios command pusher for bridge`

---

- [x] 5. **VLAN CLI Command — Wave 3**

  **What to do**:
  - Crear `apps/cli/src/commands/vlan.ts`
  - Implementar comandos:
    - `cisco-auto lab vlan create --name <name> --id <id>`
    - `cisco-auto lab vlan apply --device <name> --vlans <ids>`
    - `cisco-auto lab vlan trunk --device <name> --interface <iface> --allowed <vlan-list>`
  - Usar vlan-generator.ts para generar comandos IOS

  **Must NOT do**:
  - No crear nuevas funciones de generación, usar las existentes
  - No modificar el CLI existente sin backward compatibility

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T2b, T2d, T2e)
  - **Parallel Group**: Wave 3
  - **Blocks**: T3
  - **Blocked By**: T1

  **References**:
  - `src/core/config-generators/vlan-generator.ts:1-95`
  - `apps/cli/src/commands/lab/full-build.ts:1-100` - Patrón de comando CLI

  **Acceptance Criteria**:
  - [ ] `cisco-auto lab vlan create --name VLAN10 --id 10` genera comandos válidos
  - [ ] `cisco-auto lab vlan apply --device SW1 --vlans 10,20` funciona
  - [ ] Test: `bun test apps/cli/__tests__/commands/vlan.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add vlan CLI command`

---

- [x] 6. **STP CLI Command — Wave 3**

  **What to do**:
  - Crear `apps/cli/src/commands/stp.ts`
  - Implementar comandos:
    - `cisco-auto lab stp configure --device <name> --mode <mode>`
    - `cisco-auto lab stp set-root --device <name> --vlan <id> --priority <value>`
  - Usar stp.generator.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T2a, T2c, T2d, T2e)
  - **Parallel Group**: Wave 3

  **References**:
  - `src/core/config-generators/stp.generator.ts`

  **Acceptance Criteria**:
  - [ ] Comandos STP generan IOS válido
  - [ ] Test: `bun test apps/cli/__tests__/commands/stp.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add stp CLI command`

---

- [x] 7. **Routing CLI Command — Wave 3**

  **What to do**:
  - Crear `apps/cli/src/commands/routing.ts`
  - Implementar comandos:
    - `cisco-auto lab routing static add --device <name> --network <cidr> --next-hop <ip>`
    - `cisco-auto lab routing ospf enable --device <name> --process-id <id>`
    - `cisco-auto lab routing ospf add-network --device <name> --network <cidr> --area <id>`
    - `cisco-auto lab routing eigrp enable --device <name> --as <number>`
    - `cisco-auto lab routing bgp enable --device <name> --as <number>`
  - Usar routing-generator.ts y advanced-routing.generator.ts

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T2a, T2b, T2d, T2e)
  - **Parallel Group**: Wave 3

  **References**:
  - `src/core/config-generators/routing-generator.ts`
  - `src/core/config-generators/advanced-routing.generator.ts`

  **Acceptance Criteria**:
  - [ ] Comandos OSPF/EIGRP/BGP generan IOS válido
  - [ ] Test: `bun test apps/cli/__tests__/commands/routing.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add routing CLI command`

---

- [x] 8. **ACL CLI Command — Wave 3**

  **What to do**:
  - Crear `apps/cli/src/commands/acl.ts`
  - Implementar comandos:
    - `cisco-auto lab acl create --name <name> --type <standard|extended>`
    - `cisco-auto lab acl add-rule --acl <name> --rule "<action> <protocol> <source> <dest>"`
    - `cisco-auto lab acl apply --acl <name> --device <name> --interface <iface> --direction <in|out>`
  - Usar security-generator.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T2a, T2b, T2c, T2e)
  - **Parallel Group**: Wave 3

  **References**:
  - `src/core/config-generators/security-generator.ts:1-70`

  **Acceptance Criteria**:
  - [ ] ACL commands generan IOS válido
  - [ ] Test: `bun test apps/cli/__tests__/commands/acl.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add acl CLI command`

---

- [x] 9. **Services CLI Command — Wave 3**

  **What to do**:
  - Crear `apps/cli/src/commands/services.ts`
  - Implementar comandos DHCP, NTP, SNMP, Syslog:
    - `cisco-auto lab services dhcp create --device <name> --pool <name> --network <cidr>`
    - `cisco-auto lab services ntp add-server --device <name> --server <ip>`
    - `cisco-auto lab services syslog add-server --device <name> --server <ip>`
  - Usar services.generator.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T2a, T2b, T2c, T2d)
  - **Parallel Group**: Wave 3

  **References**:
  - `src/core/config-generators/services.generator.ts:1-100`

  **Acceptance Criteria**:
  - [ ] DHCP/NTP/Syslog commands generan IOS válido
  - [ ] Test: `bun test apps/cli/__tests__/commands/services.test.ts` → PASS

  **Commit**: YES
  - Message: `feat: add services CLI command`

---

- [x] 10. **PT Bridge Integration Test — Wave 4**

  **What to do**:
  - Crear `tests/integration/pt-bridge.test.ts`
  - Test de conectividad con el bridge server
  - Test de enqueue/dequeue de comandos
  - Test de lifetime del polling loop

  **Must NOT do**:
  - No requiere PT instalado para tests unitarios
  - Tests de integración real son manuales o con mock

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T3b, T3c)
  - **Parallel Group**: Wave 4

  **References**:
  - `src/bridge/server.ts`
  - `docs/MCP-Packet-Tracer/WIKI.md:420-483` - HTTP Bridge Architecture

  **Acceptance Criteria**:
  - [ ] Test verifica que bridge responde en puerto54321
  - [ ] Test verifica enqueue/dequeue de comandos
  - [ ] `bun test tests/integration/pt-bridge.test.ts` → PASS

  **Commit**: YES
  - Message: `test: add PT bridge integration test`

---

- [x] 11. **PT Execute Script Test — Wave 4**

  **What to do**:
  - Crear `tests/integration/pt-execute-script.test.ts`
  - Test de generación de scripts PTBuilder
  - Test de ejecución de comandos IOS
  - Verificar que los comandos generados son válidos

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T3a, T3c)
  - **Parallel Group**: Wave 4

  **References**:
  - `src/tools/topology/generate-script.ts`

  **Acceptance Criteria**:
  - [ ] Script generado contiene comandos válidos
  - [ ] Verificar formato JavaScript y Python
  - [ ] `bun test tests/integration/pt-execute-script.test.ts` → PASS

  **Commit**: YES
  - Message: `test: add PT execute script test`

---

- [x] 12. **PT Validate Topology Test — Wave 4**

  **What to do**:
  - Crear `tests/integration/pt-validate-topology.test.ts`
  - Test de validación de topología después de deploy
  - Verificar que los dispositivos se crearon correctamente
  - Usar queryTopology para verificar estado

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (con T3a, T3b)
  - **Parallel Group**: Wave 4

  **References**:
  - `src/tools/deploy/query-topology.ts`
  - `src/tools/topology/validate-plan.ts`

  **Acceptance Criteria**:
  - [ ] Validación post-deploy funciona
  - [ ] `bun test tests/integration/pt-validate-topology.test.ts` → PASS

  **Commit**: YES
  - Message: `test: add PT validate topology test`

---

## Final Verification Wave (MANDATORY)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

- **T0**: `feat: add pts-template-generator for bootstrap`
- **T1**: `feat: extend generate-script with allIOS generators`
- **T2a**: `feat: add vlan CLI command`
- **T2b**: `feat: add stp CLI command`
- **T2c**: `feat: add routing CLI command`
- **T2d**: `feat: add acl CLI command`
- **T2e**: `feat: add services CLI command`
- **T3**: `test: add PT integration tests`

---

## Success Criteria

### Verification Commands
```bash
bun test src/bridge/__tests__/pts-template-generator.test.ts
bun test src/tools/topology/__tests__/generate-script.test.ts
bun test apps/cli/__tests__/commands/*.test.ts
bun test tests/integration/pt-*.test.ts
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Bootstrap .pts loads automatically in PT
- [ ] CLI commands generate valid IOS output
- [ ] Integration tests pass with PT installed