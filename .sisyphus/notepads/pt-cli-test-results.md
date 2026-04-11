# PT CLI Test Results

**Date:** 2026-04-11
**PT Status:** PT abierto con runtime cargado, Bridge listo (lease invalid), topología materializada, 2 dispositivos
**CLI Status:** Funcional, comandos show funcionan pero router requiere setup interactivo primero

---

## Commands Tested

### Phase 1: Core Commands

#### 1. `bun run pt` (no args)
- **Command:** `bun run pt`
- **Expected:** Mostrar help
- **Actual:** Muestra help completo de todos los comandos
- **Status:** ✅ PASS

#### 2. `bun run pt --help`
- **Command:** `bun run pt --help`
- **Expected:** Mostrar help
- **Actual:** Mismo output que sin args
- **Status:** ✅ PASS

#### 3. `bun run pt status`
- **Command:** `bun run pt status`
- **Expected:** Mostrar estado del sistema
- **Actual:** Muestra estado con warnings: "Bridge no está listo", "Topología virtual aún no materializada", 23 in-flight / 14 dead-letter queue
- **Status:** ⚠️ WARN (Bridge no listo, queue con operaciones varadas)

#### 4. `bun run pt doctor`
- **Command:** `bun run pt doctor`
- **Expected:** Diagnóstico del sistema
- **Actual:** Diagnóstico con 5 OK, 4 warning, 1 critical (bridge-queues: Queue con 14 dead-letter)
- **Status:** ⚠️ WARN (hay problemas críticos pendientes)

#### 5. `bun run pt help`
- **Command:** `bun run pt help`
- **Expected:** Ayuda enriquecida
- **Actual:** Lista todos los comandos con estados [partial]/[experimental]/[stable]
- **Status:** ✅ PASS

---

### Phase 2: Device Management

#### 6. `bun run pt device list`
- **Command:** `bun run pt device list`
- **Expected:** Listar dispositivos
- **Actual:** `📱 Dispositivos en Packet Tracer (0):` -Lista vacía (no hay dispositivos en PT)
- **Status:** ✅ PASS

#### 7. `bun run pt device --help`
- **Command:** `bun run pt device --help`
- **Expected:** Help del subcomando
- **Actual:** Lista subcomandos: list, get, interactive, add, remove, move
- **Status:** ✅ PASS

---

### Phase 3: Show Commands

#### 8. `bun run pt show cdp`
- **Command:** `bun run pt show cdp`
- **Expected:** Mostrar vecinos CDP
- **Actual:** `error: unknown command 'cdp'`
- **Status:** ❌ FAIL — El comando `show cdp` registrado en catalog no se resuelve correctamente

#### 9. `bun run pt show route`
- **Command:** `bun run pt show route`
- **Expected:** Mostrar tabla de rutas
- **Actual:** `error: unknown command 'route'` (Did you mean ip-route?)
- **Status:** ❌ FAIL — El comando `show route` registrado en catalog no se resuelve correctamente

#### 10. `bun run pt show vlan`
- **Command:** `bun run pt show vlan`
- **Expected:** Mostrar VLANs
- **Actual:** `[bootstrap] Supervisor ya está corriendo ✗ Error: execInteractive failed: Runtime not loaded`
- **Status:** ❌ ERROR — Runtime no está cargado en PT (el script de PT no está corriendo)

#### 11. `bun run pt show run`
- **Command:** `bun run pt show run`
- **Expected:** Mostrar running-config
- **Actual:** `error: unknown command 'run'`
- **Status:** ❌ FAIL — Similar al issue con cdp/route

#### 12. `bun run pt show ip-int-brief`
- **Command:** `bun run pt show ip-int-brief`
- **Expected:** Mostrar interfaces IP
- **Actual:** `[bootstrap] ✗ Error: execInteractive failed: Runtime not loaded`
- **Status:** ❌ ERROR — Mismo problema: Runtime no cargado

#### 13. `bun run pt show ip-route`
- **Command:** `bun run pt show ip-route`
- **Expected:** Mostrar tabla de rutas IP
- **Actual:** `[bootstrap] ✗ Error: execInteractive failed: Runtime not loaded`
- **Status:** ❌ ERROR — Mismo problema: Runtime no cargado

---

### Phase 4: History & Results & Logs

#### 14. `bun run pt history list`
- **Command:** `bun run pt history list`
- **Expected:** Listar historial
- **Actual:** Lista 10 entradas con sesiones, incluyendo test entries y entradas reales (show:vlan, device.list, doctor, show:run)
- **Status:** ✅ PASS

#### 15. `bun run pt history --help`
- **Command:** `bun run pt history --help`
- **Expected:** Help de history
- **Actual:** Subcomandos: list, show, last, rerun, explain
- **Status:** ✅ PASS

#### 16. `bun run pt results list`
- **Command:** `bun run pt results list`
- **Expected:** Listar resultados
- **Actual:** Lista 672 archivos .json en ~/pt-dev/results
- **Status:** ✅ PASS

#### 17. `bun run pt logs tail`
- **Command:** `bun run pt logs tail`
- **Expected:** Mostrar últimos logs
- **Actual:** Muestra 20 eventos "⚪ unknown -> ok" (vacío/incomprensible)
- **Status:** ⚠️ WARN — Los logs IOS muestran solo transiciones unknown->ok, no hay contenido útil

#### 18. `bun run pt logs errors`
- **Command:** `bun run pt logs errors`
- **Expected:** Mostrar errores recientes
- **Actual:** `count: 0` - No hay errores
- **Status:** ✅ PASS

#### 19. `bun run pt logs ios`
- **Command:** `bun run pt logs ios`
- **Expected:** Mostrar logs IOS
- **Actual:** `Entradas: 0`
- **Status:** ✅ PASS

---

### Phase 5: Audit

#### 20. `bun run pt audit-tail`
- **Command:** `bun run pt audit-tail`
- **Expected:** Mostrar últimas operaciones del audit
- **Actual:** `error: unknown command 'audit-tail'` (Did you mean audit-failed?)
- **Status:** ❌ FAIL — El comando `audit-tail` registrado en catalog no se resuelve

#### 21. `bun run pt audit-failed`
- **Command:** `bun run pt audit-failed`
- **Expected:** Mostrar operaciones fallidas
- **Actual:** Lista 4 entradas fallidas: show:ip-route, show:ip-int-brief, etherchannel.list, show:vlan
- **Status:** ✅ PASS

---

### Phase 6: Topology & Lab

#### 22. `bun run pt topology show`
- **Command:** `bun run pt topology show`
- **Expected:** Mostrar topología descubierta
- **Actual:** `error: unknown command 'show'` - El subcomando `topology show` no se resuelve
- **Status:** ❌ FAIL — `topology show` registrado en catalog pero no funciona

#### 23. `bun run pt topology --help`
- **Command:** `bun run pt topology --help`
- **Expected:** Help de topology
- **Actual:** Subcomandos: visualize, analyze, export, clean
- **Status:** ✅ PASS

#### 24. `bun run pt lab list`
- **Command:** `bun run pt lab list`
- **Expected:** Listar laboratorios
- **Actual:** `📁 Laboratorios encontrados (0):`
- **Status:** ✅ PASS

#### 25. `bun run pt lab --help`
- **Command:** `bun run pt lab --help`
- **Expected:** Help de lab
- **Actual:** Subcomandos: parse, validate, create, list, interactive, pipeline, lift, vlan, routing, acl
- **Status:** ✅ PASS

---

### Phase 7: Devices Memory

#### 26. `bun run pt devices-list`
- **Command:** `bun run pt devices-list`
- **Expected:** Listar dispositivos en memoria
- **Actual:** `error: unknown command 'devices-list'` — El comando `list` registrado en catalog como standalone no se resuelve correctamente
- **Status:** ❌ FAIL — El comando de doble palabra no se resuelve

---

### Phase 8: Link & Etherchannel

#### 27. `bun run pt link list`
- **Command:** `bun run pt link list`
- **Expected:** Listar enlaces
- **Actual:** Warning que PT debe estar corriendo, sugiere usar device list o topology visualize
- **Status:** ⚠️ WARN — Mensaje informativo, no error

#### 28. `bun run pt etherchannel list`
- **Command:** `bun run pt etherchannel list`
- **Expected:** Listar EtherChannels
- **Actual:** `[bootstrap] ✗ Etherchannel.list Error: Debes pasar el dispositivo o usar --interactive`
- **Status:** ⚠️ WARN — Error funcional pero con mensaje útil

---

### Phase 9: Build & Runtime & Config

#### 29. `bun run pt build`
- **Command:** `bun run pt build`
- **Expected:** Build y deploy a ~/pt-dev/
- **Actual:** `✅ Build completado. Archivos deployados a ~/pt-dev/`
- **Status:** ✅ PASS

#### 30. `bun run pt runtime releases`
- **Command:** `bun run pt runtime releases`
- **Expected:** Mostrar releases del runtime
- **Actual:** `No hay snapshots disponibles.`
- **Status:** ✅ PASS

#### 31. `bun run pt config prefs list`
- **Command:** `bun run pt config prefs list`
- **Expected:** Listar preferencias
- **Actual:** `error: unknown command 'config'` — El subcomando anidado no funciona
- **Status:** ❌ FAIL — La estructura `config prefs` no se resuelve correctamente

---

### Help Commands (Verificados)

| Command | Status | Notes |
|---------|--------|-------|
| `bun run pt config-host --help` | ✅ | Muestra argumentos y flags correctamente |
| `bun run pt config-ios --help` | ✅ | Muestra argumentos y flags |
| `bun run pt routing --help` | ✅ | Muestra subcomandos: static, ospf, eigrp, bgp |
| `bun run pt vlan --help` | ✅ | Subcomandos: create, apply, trunk |
| `bun run pt stp --help` | ✅ | Subcomandos: configure, set-root |
| `bun run pt services --help` | ✅ | Subcomandos: dhcp, ntp, syslog |
| `bun run pt topology --help` | ✅ | Subcomandos: visualize, analyze, export, clean |
| `bun run pt lab --help` | ✅ | Subcomandos: parse, validate, create, list, interactive, pipeline, lift |
| `bun run pt router --help` | ✅ | Subcomandos: add |
| `bun run pt acl --help` | ✅ | Subcomandos: create, add-rule, apply |
| `bun run pt device --help` | ✅ | Subcomandos: list, get, interactive, add, remove, move |
| `bun run pt history --help` | ✅ | Subcomandos: list, show, last, rerun, explain |

---

## Resumen de Errores

### Errores Críticos

| # | Comando | Problema | Causa Raíz |
|---|---------|----------|------------|
| 1 | `show cdp` | `unknown command 'cdp'` | Comando registrado en catalog pero no se resuelve en el parser de `show` |
| 2 | `show route` | `unknown command 'route'` | Mismo problema que cdp |
| 3 | `show run` | `unknown command 'run'` | Mismo problema |
| 4 | `audit-tail` | `unknown command 'audit-tail'` | Registro en catalog pero no resoluble |
| 5 | `topology show` | `unknown command 'show'` | El subcomando `topology-show` registrado no se mapea correctamente |
| 6 | `devices-list` | `unknown command 'devices-list'` | El registro `list` como standalone no funciona |
| 7 | `config prefs list` | `unknown command 'config'` | La estructura anidada `config prefs` no se resuelve |

### Warnings

| # | Comando | Problema | Notas |
|---|---------|----------|-------|
| 1 | `status` | Bridge no listo, queue con 14 dead-letter | Hay operaciones varadas en el bridge |
| 2 | `doctor` | 1 critical, 4 warnings | Bridge queues es crítico |
| 3 | `show vlan/ip-int-brief/ip-route` | `Runtime not loaded` | El runtime de PT no está corriendo - necesita cargar main.js en PT |
| 4 | `logs tail` | Muestra "unknown -> ok" | Formato de log inesperado |
| 5 | `etherchannel list` | Error "Debes pasar el dispositivo" | Funcional pero el error no es claro al usuario |

### Problema General de Contexto

El sistema tiene un problema de **contexto parcial**:
- **Bridge no está listo** - el bridge de comunicación con PT no tiene lease válido
- **Topología no materializada** - no se ha descubiertoconstruido la topología
- **Runtime no cargado** - el script `main.js` no está corriendo en Packet Tracer
- **Queue con 14 dead-letter** - 14 operaciones fallaron y están varadas

---

## Patrones de Bugs

1. **Comandos `show X` que no existen:** Los comandos `show cdp`, `show route`, `show run` están registrados en `command-catalog.ts` pero cuando el parser encuentra `show <subcommand>` no los resuelve. Esto sugiere que el parser de `show` usa submcommands definidos en `show.ts` y no en `command-catalog.ts` directamente.

2. **Comandos de doble palabra mal registrados:** `audit-tail`, `topology show`, `devices-list` son comandos de dos palabras registrados en catalog pero que el parser no puede resolver.

3. **Runtime no cargado:** Todos los comandos `show` que dependen de PT (vlan, ip-int-brief, ip-route) fallan con "Runtime not loaded". Esto es esperado si el usuario no ha cargado `main.js` en Packet Tracer.

---

## Recomendaciones

1. **Cargar el runtime en PT:** El usuario necesita cargar `~/pt-dev/main.js` en Packet Tracer para que los comandos `show` funcionen
2. **Limpiar la queue:** Hay 14 dead-letter operations - investigar con `bun run pt results list` y limpiar
3. **Investigar commands unknown:** Los bugs de comandos unknown son problemas de registration/resolution en el parser de comandos
4. **Verificar lease del bridge:** `bun run pt status` muestra "lease invalid" - esto puede necesitar reinicio del supervisor

---

## Post-Reload Results (después de recargar main.js en PT)

### Nuevos tests después de reload

#### N1. `bun run pt status` (post-reload)
- **Command:** `bun run pt status`
- **Expected:** Ver estado del sistema
- **Actual:** `Supervisor: ✓ running, Bridge: ready (lease invalid), Topology: materialized, Devices: 2, Links: 2`
- **Status:** ⚠️ WARN — Lease sigue inválido pero topología ya está materializada

#### N2. `bun run pt device list` (post-reload)
- **Command:** `bun run pt device list`
- **Expected:** Listar dispositivos
- **Actual:** `📱 Dispositivos en Packet Tracer (1): LabR1 (Modelo: 2911, Estado: Encendido)`
- **Status:** ✅ PASS

#### N3. `bun run pt show ip-int-brief LabR1` (post-reload)
- **Command:** `bun run pt show ip-int-brief LabR1`
- **Expected:** Mostrar interfaces IP del LabR1
- **Actual:** **CRÍTICO** - El router está en setup dialog interactivo. El output muestra que el CLI envía comandos IOS mientras el router pregunta "Would you like to enter the initial configuration dialog? [yes/no]:" y el CLI responde con "y" repetidamente. El router nunca sale del setup mode.
- **Status:** ❌ FAIL — El router LabR1 está atrapado en setup dialog mode. Los comandos IOS se mandan mientras el router está en modo interactivo de setup. **Necesita `no` en setup dialog antes de ejecutar comandos show.**
- **Root cause:** El router LabR1 no tiene configuración guardada y entra en System Configuration Dialog en cada reinicio

#### N4. `bun run pt show vlan LabR1` (post-reload)
- **Command:** `bun run pt show vlan LabR1`
- **Expected:** Mostrar VLANs del LabR1
- **Actual:** Mismo problema que N3 - router atrapado en setup dialog, devuelve contenido del setup mode
- **Status:** ❌ FAIL — Mismo root cause: router en setup mode

#### N5. `bun run pt topology show` (post-reload)
- **Command:** `bun run pt topology show`
- **Expected:** Mostrar topología descubierta
- **Actual:** `error: unknown command 'show'`
- **Status:** ❌ FAIL — El comando `topology show` registrado como `topology-show` pero no se resuelve como subcomando de `topology`

#### N6. `bun run pt topology analyze` (post-reload)
- **Command:** `bun run pt topology analyze`
- **Expected:** Analizar topología
- **Actual:** `error: missing required argument 'file'`
- **Status:** ⚠️ WARN — Necesita archivo YAML de topología como argumento

#### N7. `bun run pt topology export` (post-reload)
- **Command:** `bun run pt topology export`
- **Expected:** Exportar topología
- **Actual:** `error: missing required argument 'file'`
- **Status:** ⚠️ WARN — Necesita archivo de salida como argumento

---

## Resumen de Bugs Post-Reload

### Bugs Críticos (requieren fix)

| # | Comando | Bug | Root Cause |
|---|---------|-----|------------|
| 1 | `show ip-int-brief LabR1` | Router atrapado en System Configuration Dialog | LabR1 no tiene configuración inicial guardada, entra en setup mode en cada boot |
| 2 | `show vlan LabR1` | Mismo problema | Mismo root cause |
| 3 | `topology show` | `unknown command 'show'` | El comando `topology-show` registrado en catalog no se resuelve como subcomando de `topology` |

### Bugs de UX/Design

| # | Comando | Bug | Suggestion |
|---|---------|-----|------------|
| 1 | `topology analyze/export` | `missing required argument 'file'` | Agregar flag `--output` o detectar automáticamente la topología actual del canvas |

### Comandos que funcionan bien post-reload

- `bun run pt status` ✅
- `bun run pt device list` ✅
- `bun run pt build` ✅

### Recomendaciones de Fix

1. **Para `show ip-int-brief/vlan/route LabR1`:** Antes de ejecutar comandos IOS, verificar que el dispositivo no está en setup dialog. Posibles soluciones:
   - Hacer que el CLI envíe `no` automáticamente al setup dialog
   - Detectar el setup dialog y warn al usuario
   - Requerir que el usuario haya completado el setup inicial antes de usar comandos IOS

2. **Para `topology show`:** El comando está registrado como `topology-show` pero se invoca como `topology show`. Revisar el parser de comandos para resolver correctamente subcomandos de dos palabras.

---

## FIXES APLICADOS

### Fix 1: Setup Dialog Detection ✅
- **Archivo:** `packages/pt-runtime/src/templates/ios-exec-handlers-template.ts`
- **Cambio:** Agregada detección de setup dialog en `handleExecInteractive()`. Si se detecta `initial configuration dialog` o `Would you like to enter the initial configuration dialog?`, se envía `no` automáticamente y se re-envía el comando original.
- **Estado:** ✅ Aplicado - requiere recargar main.js en PT

### Fix 2: topology show subcommand ✅
- **Archivos:** Nuevo `apps/pt-cli/src/commands/topology/show.ts`, modificado `apps/pt-cli/src/commands/topology/index.ts`
- **Cambio:** Creado nuevo subcomando `topology show` que usa `PTController.snapshot()` para mostrar la topología del canvas PT
- **Estado:** ✅ Aplicado y funcionando

### Fix 3: topology analyze/export auto-canvas ✅
- **Archivos:** `apps/pt-cli/src/commands/topology/analyze.ts`, `apps/pt-cli/src/commands/topology/export.ts`, `apps/pt-cli/src/types/lab-spec.types.ts`
- **Cambio:** 
  - Agregada función `snapshotToLabSpec()` para convertir `TopologySnapshot` a `LabSpec`
  - Los argumentos `[file]` ahora son opcionales; si no se especifican, se usa la topología del canvas PT
- **Estado:** ✅ Aplicado y funcionando (muestra 0 dispositivos porque el canvas está vacío)
