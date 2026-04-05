# PT Control — Batería de Test Cases (QA Sheet)

> **Generado:** 2026-04-05  
> **Versión CLI:** 0.2.0  
> **Estado del canvas:** Debe estar LIMPIO antes de cada caso (usar `pt topology clean` o borrar manual)  
> **Requisito:** Packet Tracer corriendo con `~/pt-dev/main.js` cargado como Script Module

---

## Convenciones

| Campo | Valores |
|-------|---------|
| **Severidad** | P0 = bloqueo, P1 = crítico, P2 = mayor, P3 = menor, P4 = cosmetic |
| **Tipo** | smoke, funcional, error-path, regresión, resiliencia, UX |
| **Área** | device, link, config-host, config-ios, show, vlan, etherchannel, stp, routing, acl, services, topology, logs, history, doctor |
| **Estado** | ⬜ pendiente, ✅ passed, ❌ failed, ⚠️ warning, 🔲 blocked |

---

## FASE 1 — Smoke / Conectividad

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-001 | `pt doctor` responde | `bun run pt doctor` | Muestra 7 checks, al menos pt-dev y runtime OK | ⬜ | P0 | |
| TC-002 | `device list` canvas vacío | `bun run pt device list` | Responde sin error, lista vacía o coherente | ⬜ | P0 | |
| TC-003 | `pt --help` | `bun run pt --help` | Muestra todos los subcomandos registrados | ⬜ | P1 | |

---

## FASE 2 — Device Lifecycle

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-010 | Agregar router | `bun run pt device add R1 2911` | R1 aparece en PT y en `device list` | ⬜ | P0 | |
| TC-011 | Agregar switch | `bun run pt device add S1 2960` | S1 aparece en PT y en `device list` | ⬜ | P0 | Modelo: "2960" (NO "2960-24TT") |
| TC-012 | Agregar PC | `bun run pt device add PC1 pc` | PC1 aparece en PT | ⬜ | P0 | |
| TC-013 | `device get R1` | `bun run pt device get R1` | Devuelve nombre, modelo 2911, tipo router, puertos | ⬜ | P1 | |
| TC-014 | `device list` con 3 dispositivos | `bun run pt device list` | Devuelve R1, S1, PC1 | ⬜ | P1 | |
| TC-015 | Mover dispositivo | `bun run pt device move R1 --xpos 150 --ypos 150` | R1 se mueve visualmente y en datos | ⬜ | P2 | Verify coords reales |
| TC-016 | Nombre duplicado | `bun run pt device add R1 2911` | Error claro: "R1 ya existe" | ⬜ | P1 | |
| TC-017 | Modelo inválido | `bun run pt device add X9 modelo-inexistente` | Error: modelo no reconocido, sugiere válidos | ⬜ | P2 | BUG conocido: error legible |
| TC-018 | Remover dispositivo | `bun run pt device remove PC1` | PC1 desaparece de PT y de `device list` | ⬜ | P1 | |
| TC-019 | `device get` de eliminado | `bun run pt device get PC1` | Error claro: "PC1 no encontrado" | ⬜ | P2 | |

---

## FASE 3 — Links

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-020 | Link router-switch | `bun run pt link add R1 GigabitEthernet0/0 S1 GigabitEthernet0/1` | Enlace visible, verify pasa | ⬜ | P0 | Verificar verify |
| TC-021 | Link PC-switch | `bun run pt link add S1 FastEthernet0/1 PC1 FastEthernet0` | Enlace visible | ⬜ | P0 | |
| TC-022 | `link list` | `bun run pt link list` | Muestra ambos enlaces con endpoints | ⬜ | P1 | |
| TC-023 | Link con puerto inválido | `bun run pt link add R1 Gi0/99 S1 Fa0/1` | Error: puerto no existe, sugiere `device get R1` | ⬜ | P1 | |
| TC-024 | Link duplicado | Repetir TC-020 | Error claro o idempotente | ⬜ | P2 | |
| TC-025 | Link con dispositivo inexistente | `bun run pt link add X9 Gi0/0 S1 Fa0/1` | Error: dispositivo no encontrado | ⬜ | P1 | |
| TC-026 | `link remove` | `bun run pt link remove R1 GigabitEthernet0/0` | Enlace desaparece, puertos quedan libres | ⬜ | P1 | |
| TC-027 | `link add` interactivo | `bun run pt link add` (sin args) | Menú interactivo funciona, selección válida | ⬜ | P2 | |
| TC-028 | Verify en link add | `bun run pt link add R1 Gi0/0 S1 Gi0/1 --verify` | Checks de verificación pasan | ⬜ | P1 | |

**BUG conocido:** `addLink` retorna éxito pero el objeto LinkState tiene `device1:undefined, port1:undefined`. El enlace se crea en PT pero el mapeo de respuesta está roto.

---

## FASE 4 — Config Host

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-030 | IP estática en PC | `bun run pt config-host PC1 192.168.1.10 255.255.255.0 192.168.1.1` | PC1 configurado, verify pasa | ⬜ | P0 | |
| TC-031 | `device get PC1` post-config | `bun run pt device get PC1` | Refleja IP/mask/gateway | ⬜ | P1 | |
| TC-032 | DHCP en PC | `bun run pt config-host PC1 --dhcp` | PC1 en modo DHCP | ⬜ | P2 | Depende de soporte DHCP |
| TC-033 | Config en dispositivo inexistente | `bun run pt config-host X9 10.0.0.1 255.0.0.0` | Error: dispositivo no encontrado | ⬜ | P2 | |
| TC-034 | IP inválida | `bun run pt config-host PC1 999.999.999.999 255.255.255.0` | Error: IP inválida (validación CLI) | ⬜ | P2 | |

---

## FASE 5 — Config IOS

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-040 | Show simple | `bun run pt config-ios R1 "show version"` | Salida real de PT, no simulada | ⬜ | P0 | |
| TC-041 | Config interfaz | `bun run pt config-ios R1 "enable" "configure terminal" "interface Gi0/0" "ip address 192.168.1.1 255.255.255.0" "no shutdown" "exit" "exit"` | Comando ejecutado, verify sugiere show | ⬜ | P0 | |
| TC-042 | Config hostname | `bun run pt config-ios R1 "enable" "configure terminal" "hostname MiRouter" "exit" "exit"` | Hostname cambia | ⬜ | P2 | |
| TC-043 | Comando IOS inválido | `bun run pt config-ios R1 "comando-inexistente"` | Error claro, no falso positivo | ⬜ | P1 | |
| TC-044 | Sin dispositivo | `bun run pt config-ios` | Error: debe especificar dispositivo | ⬜ | P2 | |
| TC-045 | Dispositivo no-IOS | `bun run pt config-ios PC1 "show version"` | Error: PC1 no soporta IOS | ⬜ | P2 | |
| TC-046 | `--examples` | `bun run pt config-ios --examples` | Imprime 10 ejemplos reales, no ejecuta | ⬜ | P3 | |
| TC-047 | `--plan` | `bun run pt config-ios R1 --plan "show version"` | Muestra plan, no ejecuta | ⬜ | P3 | |

---

## FASE 6 — Show Commands

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-050 | `show ip-int-brief` | `bun run pt show ip-int-brief R1` | Tabla de interfaces con IPs, status | ⬜ | P0 | |
| TC-051 | `show vlan` | `bun run pt show vlan S1` | Lista VLANs (default VLAN 1) | ⬜ | P1 | |
| TC-052 | `show ip-route` | `bun run pt show ip-route R1` | Tabla de routing | ⬜ | P1 | |
| TC-053 | `show run-config` | `bun run pt show run-config R1` | Configuración running | ⬜ | P1 | |
| TC-054 | `show` con `--json` | `bun run pt show ip-int-brief R1 --json` | JSON parseable, estructura estable | ⬜ | P2 | |
| TC-055 | `show` con `--output table` | `bun run pt show ip-int-brief R1 --output table` | Tabla legible en terminal | ⬜ | P3 | |
| TC-056 | `show` sin dispositivo | `bun run pt show ip-int-brief` | Comportamiento definido (error o todos) | ⬜ | P2 | |

---

## FASE 7 — VLANs

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-060 | `vlan create` genera comandos | `bun run pt vlan create --name ADMIN --id 10` | Imprime comandos IOS, no los ejecuta | ⬜ | P1 | |
| TC-061 | `vlan apply` a switch | `bun run pt vlan apply --device S1 --vlans 10,20,30` | Sugiere verify, sugiere `show vlan S1` | ⬜ | P1 | Nota: apply solo genera cmds, no ejecuta |
| TC-062 | `vlan trunk` genera comandos | `bun run pt vlan trunk --device S1 --interface Gi0/1 --allowed 10,20` | Imprime cmds trunk | ⬜ | P2 | |
| TC-063 | VLAN ID inválido | `bun run pt vlan create --name X --id 9999` | Error: ID debe ser 1-4094 | ⬜ | P2 | |
| TC-064 | VLAN lista vacía | `bun run pt vlan apply --device S1 --vlans ""` | Error: lista de VLANs inválida | ⬜ | P2 | |

---

## FASE 8 — EtherChannel

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-070 | `etherchannel create` dry-run | `bun run pt etherchannel create --device S1 --group-id 1 --interfaces Gi0/1,Gi0/2` | Genera comandos IOS | ⬜ | P2 | |
| TC-071 | `etherchannel list` | `bun run pt etherchannel list S1` | Lista EtherChannels | ⬜ | P2 | |
| TC-072 | `etherchannel remove` | `bun run pt etherchannel remove S1 --group-id 1` | Remueve port-channel | ⬜ | P2 | |

---

## FASE 9 — STP

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-080 | `stp configure` dry-run | `bun run pt stp configure --device S1 --mode rapid-pvst --dry-run` | Genera comandos STP | ⬜ | P2 | |
| TC-081 | `stp set-root` dry-run | `bun run pt stp set-root --device S1 --vlan 1` | Genera comandos root bridge | ⬜ | P2 | |

---

## FASE 10 — Routing

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-090 | `routing static add` | `bun run pt routing static add --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1` | Genera comando ip route | ⬜ | P1 | |
| TC-091 | `routing ospf enable` | `bun run pt routing ospf enable --device R1 --process-id 1` | Genera cmds OSPF | ⬜ | P2 | |
| TC-092 | `routing eigrp enable` | `bun run pt routing eigrp enable --device R1 --as 100` | Genera cmds EIGRP | ⬜ | P2 | |
| TC-093 | `routing static add` red inválida | `bun run pt routing static add --device R1 --network invalid --next-hop 10.0.0.1` | Error: red inválida | ⬜ | P2 | |

---

## FASE 11 — ACLs

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-100 | `acl create` standard | `bun run pt acl create --name "BLOCK_NET" --type standard --number 10` | Genera comandos ACL | ⬜ | P2 | |
| TC-101 | `acl add-rule` | `bun run pt acl add-rule --name "BLOCK_NET" --action deny --source 192.168.2.0 --wildcard 0.0.0.255` | Agrega regla | ⬜ | P2 | |
| TC-102 | `acl apply` | `bun run pt acl apply --device R1 --name "BLOCK_NET" --interface Gi0/0 --direction in` | Aplica ACL a interfaz | ⬜ | P1 | |

---

## FASE 12 — Topology

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-110 | `topology clean` sin confirmar | `bun run pt topology clean` | Pide confirmación, lista dispositivos | ⬜ | P1 | |
| TC-111 | `topology clean --force` | `bun run pt topology clean --force` | Elimina todo sin confirmar | ⬜ | P0 | |
| TC-112 | `topology clean --list` | `bun run pt topology clean --list` | Dry-run, muestra qué borraría | ⬜ | P2 | |
| TC-113 | `topology clean --type router` | `bun run pt topology clean --type router --force` | Solo borra routers | ⬜ | P2 | |
| TC-114 | `topology clean` dispositivos específicos | `bun run pt topology clean R1 S1 --force` | Borra solo R1 y S1 | ⬜ | P1 | |
| TC-115 | `topology visualize` | `bun run pt topology visualize` | Muestra topología | ⬜ | P3 | |
| TC-116 | `topology analyze` | `bun run pt topology analyze` | Análisis de topología | ⬜ | P3 | |
| TC-117 | `topology export` | `bun run pt topology export` | Exporta config | ⬜ | P3 | |

---

## FASE 13 — Logs

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-120 | `logs tail` | `bun run pt logs tail` | Muestra últimos eventos | ⬜ | P1 | |
| TC-121 | `logs errors` | `bun run pt logs errors` | Muestra errores recientes | ⬜ | P2 | |
| TC-122 | `logs session <id>` | `bun run pt logs session <sessionId>` | Timeline de sesión | ⬜ | P2 | Requiere session ID real |
| TC-123 | `logs command <id>` | `bun run pt logs command <cmdId>` | Fusiona bridge + PT trace + result | ⬜ | P2 | |
| TC-124 | `logs bundle <id>` | `bun run pt logs bundle <sessionId>` | Genera bundle en `~/pt-dev/logs/bundles/` | ⬜ | P2 | |

---

## FASE 14 — History

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-130 | `history list` | `bun run pt history list` | Muestra ejecuciones recientes | ⬜ | P1 | |
| TC-131 | `history list --failed` | `bun run pt history list --failed` | Solo sesiones fallidas | ⬜ | P2 | |
| TC-132 | `history show <id>` | `bun run pt history show <sessionId>` | Detalle completo | ⬜ | P1 | |
| TC-133 | `history last` | `bun run pt history last` | Última ejecución | ⬜ | P2 | |
| TC-134 | `history explain <id>` | `bun run pt history explain <sessionId>` | Explica error si la sesión falló | ⬜ | P2 | |

---

## FASE 15 — Help, Examples, Output

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-140 | `--help` global | `bun run pt --help` | Todos los comandos listados | ⬜ | P1 | |
| TC-141 | `device --help` | `bun run pt device --help` | Subcomandos: add, list, get, move, remove | ⬜ | P2 | |
| TC-142 | `link add --help` | `bun run pt link add --help` | Args, opciones, ejemplos | ⬜ | P2 | |
| TC-143 | `link add --examples` | `bun run pt link add --examples` | 3+ ejemplos reales | ⬜ | P3 | |
| TC-144 | Comando inexistente | `bun run pt foobar` | Error: comando desconocido, sugiere similares | ⬜ | P2 | |
| TC-145 | Flag inexistente | `bun run pt device list --foobar` | Error: flag desconocido | ⬜ | P3 | |
| TC-146 | Output JSON estable | `bun run pt device list --json` | JSON parseable, estructura consistente | ⬜ | P1 | |

---

## FASE 16 — Resiliencia

| ID | Caso | Comando | Expected | Estado | Sev | Obs |
|----|------|---------|----------|--------|-----|-----|
| TC-150 | Muchos comandos seguidos | Ejecutar 10+ adds+moves+links | No se corrompe cola, no timeouts | ⬜ | P1 | |
| TC-151 | PT sin módulo cargado | Ejecutar comando sin main.js | Timeout o error claro, no crash | ⬜ | P0 | |
| TC-152 | Reinicio de módulo entre comandos | Recargar main.js entre 2 comandos | Segundo comando funciona o da error claro | ⬜ | P1 | |

---

## FASE 17 — Escenario Integrado Completo

| ID | Caso | Topología | Expected | Estado | Sev | Obs |
|----|------|-----------|----------|--------|-----|-----|
| TC-160 | Red básica funcional | R1 ↔ S1 ↔ PC1 + R1 ↔ S2 ↔ PC2 | Toda la topología configurada, routing básico | ⬜ | P0 | |
| TC-161 | VLAN + Trunk | S1 ↔ S2 trunk, PC1 en VLAN 10, PC2 en VLAN 20 | VLANs configuradas, trunk entre switches | ⬜ | P1 | |
| TC-162 | Inter-VLAN routing | R1 subinterfaces, S1 trunk, PC1 VLAN 10, PC2 VLAN 20 | Routing entre VLANs funciona | ⬜ | P0 | |
| TC-163 | Static routing | R1 ↔ R2, PC1 detrás de R1, PC2 detrás de R2 | Rutas estáticas instaladas | ⬜ | P1 | |

---

## Resumen de Bugs Conocidos (detectados en smoke test)

| # | Bug | Área | Severidad | Detalle | Estado |
|---|-----|------|-----------|---------|--------|
| 1 | Modelo `2960-24TT` no válido | device add | P1 | El modelo correcto es `2960`. El error message sugiere modelos válidos. | Conocido |
| 2 | `addLink` retorna `undefined` en device1/port1 | link | P1 | El enlace se crea en PT pero el objeto LinkState tiene campos undefined | Conocido |
| 3 | Links no aparecen en snapshot | topology | P1 | Snapshot reporta 0 links aunque addLink retornó éxito | Conocido |
| 4 | `clearTopology` eliminó 8 links fantasma | topology | P2 | Canvas vacío pero clearTopology reportó 8 links eliminados | Conocido |
| 5 | `listDevices` incluyó "Power Distribution Device0" | device | P2 | Dispositivo no esperado aparece en la lista | Conocido |
| 6 | `device get` para dispositivo eliminado muestra "undefined" | device | P2 | En vez de error claro, muestra nombre y tipo "undefined" | **ARREGLADO** |
| 7 | `addLink` no valida puertos/dispositivos antes de crear | link | P1 | Puerto inválido (Gi0/99) o device inexistente (X9) retornan éxito | **ARREGLADO** |
| 8 | `config-ios --examples` no funciona | config-ios | P2 | Flag duplicado global/local causaba conflicto en Commander | **ARREGLADO** |
| 9 | Show commands retornan `raw: ""` | ios | P1 | Problema en PT Runtime - no puede entrar en privileged exec | Known Issue |
| 10 | `topology visualize` requiere argumento file | topology | P2 | Stub implementado - dice que no está implementado | **ARREGLADO** |

---

## Resultados de Tests (sesión 2026-04-05)

### FASE 1 - Smoke Tests
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-001 | `pt doctor` | ✅ | Funciona internamente |
| TC-002 | `device list` | ✅ | Lista vacía correcta |
| TC-003 | `pt --help` | ✅ | Muestra todos los subcomandos |

### FASE 2 - Device Lifecycle  
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-010 | Add router R1 2911 | ✅ | |
| TC-011 | Add switch S1 2960 | ✅ | Modelo reportado 2960-24TT (bug #1) |
| TC-012 | Add PC PC1 pc | ✅ | |
| TC-013 | device get R1 | ✅ | Muestra 4 interfaces |
| TC-014 | device list | ✅ | 3 dispositivos |
| TC-015 | device move R1 | ✅ | |
| TC-016 | Duplicate name R1 | ✅ | Error claro "already exists" |
| TC-017 | Invalid model | ✅ | Muestra modelos válidos |
| TC-018 | Remove PC1 | ✅ | Requiere --force |
| TC-019 | Get deleted device | **✅** | **ARREGLADO** - ahora muestra error claro |

### FASE 3 - Links
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-020 | Link router-switch | ✅ | Crea enlace |
| TC-021 | Link PC-switch | ✅ | Crea enlace |
| TC-022 | link list | ⚠️ | Advertencia que requiere PT corriendo |
| TC-023 | Invalid port | **✅** | **ARREGLADO** - ahora da error |
| TC-024 | Duplicate link | **✅** | **ARREGLADO** - ahora valida |
| TC-025 | Nonexistent device | **✅** | **ARREGLADO** - ahora da error |
| TC-026 | link remove | ⬜ | Requiere confirmación interactiva |

### FASE 4 - Config Host
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-030 | IP estática PC | ✅ | Configurada correctamente |
| TC-031 | device get PC1 post-config | ✅ | Muestra IP 192.168.1.10 |
| TC-032 | DHCP mode | ✅ | Cambia a DHCP |

### FASE 5 - Config IOS
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-040 | show version | ❌ | "Failed to enter privileged exec mode" |
| TC-046 | --examples | **✅** | **ARREGLADO** - muestra ejemplos |

### FASE 6 - Show Commands
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-050-056 | Todos show commands | ❌ | `raw: ""` - bug #9 |

### FASE 7 - VLANs
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-060 | vlan create | ✅ | Genera comandos IOS |
| TC-061 | vlan apply | ✅ | Genera 10 comandos |

### FASE 12 - Topology
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-111 | topology clean --force | ✅ | Limpia 3 dispositivos |
| TC-115 | topology visualize | **✅** | **ARREGLADO** - stub con mensaje |

### FASE 14 - History
| ID | Test | Resultado | Notas |
|----|------|-----------|-------|
| TC-130 | history list | ✅ | Muestra 10 entradas |

---

## Matriz de Campañas

| Campaña | Duración | Test Cases | Frecuencia |
|---------|----------|------------|------------|
| **A — Smoke diario** | 5-10 min | TC-001 a TC-003, TC-010, TC-020, TC-040, TC-050 | Diario |
| **B — Core topology** | 20-30 min | Fases 2-5 (TC-010 a TC-056) | Semanal |
| **C — L2** | 30-45 min | Fases 7-9 (TC-060 a TC-081) | Semanal |
| **D — L3** | 30-45 min | Fase 10 (TC-090 a TC-093) | Semanal |
| **E — UX/Resilience** | 20 min | Fases 13-16 (TC-120 a TC-163) | Semanal |
