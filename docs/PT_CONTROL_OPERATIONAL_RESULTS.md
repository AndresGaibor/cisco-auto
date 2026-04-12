# PT Control — Operational QA Results Log

> Fuente de verdad para registrar ejecuciones manuales de `bun run pt`.
>
> Base de referencia: `docs/PT_CONTROL_OPERATIONAL_CHECKLIST.md`
>
> Convenciones de estado:
> - `PASS` = cumple
> - `WARN` = funciona con degradación o limitación
> - `BLOCKED` = no se puede completar por limitación conocida
> - `N/I` = not implemented
> - `FAIL` = comportamiento incorrecto
>
> Cada entrada debe incluir, cuando aplique:
> - fecha
> - comando exacto
> - resultado observado
> - causa probable
> - evidencia / captura / log

---

## Baseline conocido

Estos resultados provienen de la sesión QA previa y sirven como referencia histórica.

| Fase | Tests | PASS | FAIL | SKIP / BLOCKED |
|---|---:|---:|---:|---:|
| Smoke | 3 | 3 | 0 | 0 |
| Device Lifecycle | 10 | 10 | 0 | 0 |
| Links | 9 | 6 | 0 | 3 |
| Config Host | 5 | 5 | 0 | 0 |
| Config IOS | 8 | 1 | 1 | 6 |
| Show Commands | 7 | 0 | 7 | 0 |
| VLANs | 5 | 2 | 0 | 3 |
| EtherChannel | 3 | 0 | 1 | 2 |
| Routing | 4 | 0 | 1 | 3 |
| Topology | 8 | 2 | 0 | 6 |
| History | 5 | 1 | 0 | 4 |

### Known issues históricas

- `show` commands pueden devolver `raw: ""` por limitación del runtime.
- `device add S1 2960` puede reflejar `2960-24TT` por naming interno de Packet Tracer.
- `link list` / snapshot pueden no reflejar algunos links aunque la creación haya sido exitosa.
- `topology visualize` fue corregido para no exigir argumento obligatorio.

---

## Registro de ejecuciones nuevas

### Formato recomendado por entrada

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | TC-000 | `bun run pt ...` | PASS/WARN/BLOCKED/N/I/FAIL | resumen corto | si aplica | ruta o nota |

---

## Fase 1 — Smoke / base

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
|  | TC-001 | `bun run pt doctor` |  |  |  |  |
|  | TC-002 | `bun run pt --help` |  |  |  |  |
|  | TC-003 | `bun run pt device list` |  |  |  |  |

---

## Fase 2 — Device lifecycle

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
|  | TC-010 | `bun run pt device add R1 2911` |  |  |  |  |
|  | TC-011 | `bun run pt device add S1 2960` |  |  |  |  |
|  | TC-012 | `bun run pt device add PC1 pc` |  |  |  |  |
|  | TC-013 | `bun run pt device add R2 2911 --xpos 250 --ypos 150` |  |  |  |  |
|  | TC-014 | `bun run pt device get R1` |  |  |  |  |
|  | TC-015 | `bun run pt device list` |  |  |  |  |
|  | TC-016 | `bun run pt device move R1 --xpos 300 --ypos 200` |  |  |  |  |
|  | TC-017 | `bun run pt device add R1 2911` |  |  |  |  |
|  | TC-018 | `bun run pt device add X9 modelo-inexistente` |  |  |  |  |
|  | TC-019 | `bun run pt device remove PC1` |  |  |  |  |
|  | TC-020 | `bun run pt device get PC1` |  |  |  |  |

---

## Fase 3 — Links

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
|  | TC-030 | `bun run pt link add R1 GigabitEthernet0/0 S1 GigabitEthernet0/1` |  |  |  |  |
|  | TC-031 | `bun run pt link add PC1 FastEthernet0 S1 FastEthernet0/2` |  |  |  |  |
|  | TC-032 | `bun run pt link list` |  |  |  |  |
|  | TC-033 | repetir TC-030 |  |  |  |  |
|  | TC-034 | `bun run pt link add R1 Gi0/99 S1 Fa0/1` |  |  |  |  |
|  | TC-035 | `bun run pt link add X9 Gi0/0 S1 Fa0/1` |  |  |  |  |
|  | TC-036 | `bun run pt link remove R1 GigabitEthernet0/0` |  |  |  |  |
|  | TC-037 | `bun run pt link add` |  |  |  |  |
|  | TC-038 | `bun run pt link add R1 Gi0/0 S1 Gi0/1 --verify` |  |  |  |  |

---

## Fase 4 — Config host / IOS / show

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
|  | TC-040 | `bun run pt config-host PC1 192.168.1.10 255.255.255.0 192.168.1.1` |  |  |  |  |
|  | TC-041 | `bun run pt device get PC1` |  |  |  |  |
|  | TC-042 | `bun run pt config-host PC1 --dhcp` |  |  |  |  |
|  | TC-043 | `bun run pt config-host X9 10.0.0.1 255.0.0.0` |  |  |  |  |
|  | TC-044 | `bun run pt config-host PC1 999.999.999.999 255.255.255.0` |  |  |  |  |
|  | TC-045 | `bun run pt config-ios R1 "show version"` |  |  |  |  |
|  | TC-046 | `bun run pt config-ios R1 "enable" "configure terminal" "interface GigabitEthernet0/0" "ip address 192.168.1.1 255.255.255.0" "no shutdown"` |  |  |  |  |
|  | TC-047 | `bun run pt config-ios R1 "enable" "configure terminal" "hostname MiRouter"` |  |  |  |  |
|  | TC-048 | `bun run pt config-ios R1 "comando-inexistente"` |  |  |  |  |
|  | TC-049 | `bun run pt config-ios` |  |  |  |  |
|  | TC-050 | `bun run pt config-ios PC1 "show version"` |  |  |  |  |
|  | TC-051 | `bun run pt config-ios --examples` |  |  |  |  |
|  | TC-052 | `bun run pt config-ios R1 --plan "show version"` |  |  |  |  |
|  | TC-053 | `bun run pt show ip-int-brief R1` |  |  |  |  |
|  | TC-054 | `bun run pt show vlan S1` |  |  |  |  |
|  | TC-055 | `bun run pt show ip-route R1` |  |  |  |  |
|  | TC-056 | `bun run pt show run-config R1` |  |  |  |  |
|  | TC-057 | `bun run pt show ip-int-brief R1 --json` |  |  |  |  |
|  | TC-058 | `bun run pt show ip-int-brief` |  |  |  |  |

---

## Fase 5 — VLAN / trunk / switching

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
|  | TC-060 | `bun run pt vlan create --name ADMIN --id 10` |  |  |  |  |
|  | TC-061 | `bun run pt vlan apply --device S1 --vlans 10,20,30` |  |  |  |  |
|  | TC-062 | `bun run pt vlan trunk --device S1 --interface Gi0/1 --allowed 10,20` |  |  |  |  |
|  | TC-063 | `bun run pt etherchannel create --device S1 --group-id 1 --interfaces Gi0/1,Gi0/2` |  |  |  |  |
|  | TC-064 | `bun run pt etherchannel list S1` |  |  |  |  |
|  | TC-065 | `bun run pt etherchannel remove S1 --group-id 1` |  |  |  |  |
|  | TC-066 | `bun run pt vlan create --name X --id 9999` |  |  |  |  |
|  | TC-067 | `bun run pt vlan apply --device S1` |  |  |  |  |
|  | TC-068 | `bun run pt stp configure --device S1 --mode rapid-pvst --dry-run` |  |  |  |  |
|  | TC-069 | `bun run pt stp set-root --device S1 --vlan 1` |  |  |  |  |

---

## Cómo usarlo

1. Ejecuta un caso.
2. Completa la fila correspondiente.
3. Si falla, anota el error exacto en `Observado` y la causa probable.
4. Si está bloqueado o no existe, marca `BLOCKED` o `N/I`.
5. Si quieres, yo puedo ir normalizando tus notas y devolviéndote el resultado en formato limpio.

---

## Sesión ejecutada 2026-04-12

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-001 | `bun run pt doctor` | WARN | 5 OK, 4 warnings, 1 critical. Bridge no listo, lease inválido, cola con dead-letter. | Estado parcial del bridge / lease | salida CLI |
| 2026-04-12 | TC-002 | `bun run pt --help` | PASS | Muestra comandos y flags correctamente. | - | salida CLI |
| 2026-04-12 | TC-003 | `bun run pt device list` | PASS | Canvas vacío tras limpieza; 0 dispositivos. | - | salida CLI |
| 2026-04-12 | TC-010 | `bun run pt device add R1 2911` | WARN | Dispositivo creado; verificación de posición incompleta por contexto parcial. | Bridge no listo / topología no materializada | salida CLI |
| 2026-04-12 | TC-011 | `bun run pt device add S1 2960` | WARN | Acepta el alias pero normaliza a `2960-24TT`; verificación de posición incompleta. | Normalización interna de PT + contexto parcial | salida CLI |
| 2026-04-12 | TC-012 | `bun run pt device add PC1 pc` | WARN | Dispositivo creado como `PC-PT`; verificación de posición incompleta. | Normalización interna de PT + contexto parcial | salida CLI |
| 2026-04-12 | TC-014 | `bun run pt device get R1` | PASS | Devuelve tipo, modelo e interfaces esperadas. | - | salida CLI |
| 2026-04-12 | TC-017 | `bun run pt device add R1 2911` | PASS | Error claro: `Device 'R1' already exists in topology`. | Validación correcta de duplicado | salida CLI |
| 2026-04-12 | TC-018 | `bun run pt device add X9 modelo-inexistente` | PASS | Error claro de modelo inválido con lista de alias válidos. | Validación correcta de catálogo | salida CLI |
| 2026-04-12 | TC-030 | `bun run pt link add R1 GigabitEthernet0/0 S1 GigabitEthernet0/1` | WARN | Enlace aceptado pero `link-visible` falla; bridge/topología aún parciales. | Contexto parcial del bridge | salida CLI |
| 2026-04-12 | TC-031 | `bun run pt link add PC1 FastEthernet0 S1 FastEthernet0/2` | WARN | Enlace aceptado pero no aparece como visible todavía. | Contexto parcial del bridge | salida CLI |
| 2026-04-12 | TC-032 | `bun run pt link list` | BLOCKED | El comando informa que requiere PT corriendo en el host para ver la topología. | Limitación actual del comando / entorno | salida CLI |
| 2026-04-12 | TC-040 | `bun run pt config-host PC1 192.168.1.10 255.255.255.0 192.168.1.1` | FAIL | IP y máscara aplicadas, pero gateway queda vacío y `config-applied` falla. | Fallo parcial de configuración host | salida CLI |
| 2026-04-12 | TC-041 | `bun run pt device get PC1` | FAIL | Muestra IP/máscara pero no gateway; confirma la falla anterior. | Gateway no persistido | salida CLI |
| 2026-04-12 | TC-045 | `bun run pt config-ios R1 "show version"` | BLOCKED | `IOS configuration failed`. | Runtime/privileged exec no funcional | salida CLI |
| 2026-04-12 | TC-053 | `bun run pt show ip-int-brief R1` | BLOCKED | JSON con `raw: ""` e interfaces vacías. | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-054 | `bun run pt show vlan S1` | BLOCKED | JSON con `raw: ""` y VLANs vacías. | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-055 | `bun run pt show ip-route R1` | BLOCKED | JSON con `raw: ""` y rutas vacías. | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-056 | `bun run pt show run-config R1` | BLOCKED | JSON con `raw: ""` y sin secciones. | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-057 | `bun run pt show ip-int-brief R1 --json` | BLOCKED | JSON parseable pero vacío (`raw: ""`, `interfaces: []`). | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-060 | `bun run pt vlan create --name ADMIN --id 10` | PASS | Genera comandos VLAN correctos en dry-run. | - | salida CLI |
| 2026-04-12 | TC-070 | `bun run pt routing static add --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1` | BLOCKED | `Failed to enter configuration mode`. | Runtime IOS/config mode no estable | salida CLI |
| 2026-04-12 | TC-074 | `bun run pt acl create --name BLOCK_NET --type standard` | FAIL | Error de esquema: faltan reglas ACL mínimas. | Sintaxis real requiere reglas o payload más completo | salida CLI |
| 2026-04-12 | TC-075 | `bun run pt config-acl --device R1 --name BLOCK_NET --type standard --rule "deny,ip,any,any" --dry-run` | PASS | Genera ACL dry-run correcto: `access-list BLOCK_NET deny any any`. | - | salida CLI |
| 2026-04-12 | TC-080 | `bun run pt topology clean --list` | PASS | Dry-run muestra 0 dispositivos a eliminar. | - | salida CLI |
| 2026-04-12 | TC-086 | `bun run pt logs tail` | WARN | Muestra eventos pero aparecen como `unknown -> ok`. | Telemetría/logs incompletos | salida CLI |
| 2026-04-12 | TC-089 | `bun run pt history last` | PASS | Devuelve la última acción registrada (`topology.clean --list`). | - | salida CLI |

### Sesión ejecutada 2026-04-12 — segunda tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-051 | `bun run pt config-ios --examples` | PASS | Muestra 10 ejemplos reales y el comando sale sin error. | - | salida CLI |
| 2026-04-12 | TC-052 | `bun run pt config-ios R1 --plan "show version"` | PASS | Muestra el plan de 1 paso con verificación. | - | salida CLI |
| 2026-04-12 | TC-019 | `bun run pt device remove PC1` | PASS | PC1 removido correctamente. | - | salida CLI |
| 2026-04-12 | TC-036 | `bun run pt link remove R1 GigabitEthernet0/0` | PASS | Conexión removida exitosamente. | - | salida CLI |
| 2026-04-12 | TC-020 | `bun run pt device get PC1` | PASS | Error claro `Dispositivo 'PC1' no encontrado`. | Validación correcta post-eliminación | salida CLI |
| 2026-04-12 | TC-010 | `bun run pt device list` | PASS | Tras eliminar PC1, la lista queda en 2 dispositivos (R1, S1). | - | salida CLI |

### Sesión ejecutada 2026-04-12 — tercera tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-060 | `bun run pt vlan apply --device S1 --vlans 10,20,30` | PASS | Genera 9 comandos VLAN correctamente. | - | salida CLI |
| 2026-04-12 | TC-061 | `bun run pt vlan trunk --device S1 --interface GigabitEthernet0/1 --allowed 10,20` | FAIL | Falla con `IOS configuration failed`. | Runtime/bridge parcial al aplicar trunk | salida CLI |
| 2026-04-12 | TC-062 | `bun run pt vlan ensure S1 --vlan 10,ADMIN --vlan 20,USERS` | PASS | Crea VLANs 10 y 20 correctamente. | - | salida CLI |
| 2026-04-12 | TC-063 | `bun run pt vlan config-interfaces S1 --interface 10,192.168.10.1,255.255.255.0 --interface 20,192.168.20.1,255.255.255.0` | PASS | Genera SVIs correctas para VLAN 10/20. | - | salida CLI |
| 2026-04-12 | TC-063 | `bun run pt etherchannel create S1 --group-id 1 --interfaces Gi0/1,Gi0/2 --protocol lacp --mode active --trunk --allowed-vlans 10,20 --dry-run` | PASS | Genera comandos EtherChannel dry-run correctos. | - | salida CLI |
| 2026-04-12 | TC-064 | `bun run pt etherchannel list S1` | PASS | Devuelve salida vacía pero sin error. | No hay bundles definidos | salida CLI |
| 2026-04-12 | TC-065 | `bun run pt etherchannel remove S1 --group-id 1 --dry-run` | PASS | Genera comandos de remoción correctos. | - | salida CLI |
| 2026-04-12 | TC-068 | `bun run pt stp configure --device S1 --mode rapid-pvst --dry-run` | PASS | Genera comando `spanning-tree mode rapid-pvst`. | - | salida CLI |
| 2026-04-12 | TC-069 | `bun run pt stp set-root --device S1 --vlan 1` | PASS | Genera plan de root bridge para VLAN 1. | - | salida CLI |
| 2026-04-12 | TC-070 | `bun run pt routing static add --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1` | PASS | Genera `ip route 192.168.10.0 255.255.255.0 10.0.0.1`. | - | salida CLI |
| 2026-04-12 | TC-071 | `bun run pt routing ospf enable --device R1 --process-id 1` | PASS | Genera `router ospf 1`. | - | salida CLI |
| 2026-04-12 | TC-072 | `bun run pt routing ospf add-network --device R1 --network 192.168.10.0/24 --area 0` | FAIL | Error: `El área debe ser un número entero válido`. | Parser/validation del área OSPF | salida CLI |
| 2026-04-12 | TC-073 | `bun run pt routing eigrp enable --device R1 --as 100` | PASS | Genera `router eigrp 100` y `no auto-summary`. | - | salida CLI |
| 2026-04-12 | TC-077 | `bun run pt services dhcp create --device R1 --pool LAN10 --network 192.168.10.0/24` | PASS | Genera 4 comandos DHCP. | - | salida CLI |
| 2026-04-12 | TC-078 | `bun run pt services ntp add-server --device R1 --server 192.168.1.100` | PASS | Genera 2 comandos NTP. | - | salida CLI |
| 2026-04-12 | TC-079 | `bun run pt services syslog add-server --device R1 --server 192.168.1.200` | PASS | Genera 2 comandos Syslog. | - | salida CLI |
| 2026-04-12 | TC-083 | `bun run pt topology analyze` | PASS | Reporta 3 dispositivos y 8 conexiones; densidad 266.7%. | - | salida CLI |
| 2026-04-12 | TC-084 | `bun run pt topology export` | PASS | Exporta un grafo Mermaid/graph TD correcto. | - | salida CLI |
| 2026-04-12 | TC-085 | `bun run pt topology visualize` | PASS | Stub correcto: indica que la visualización del canvas aún no está implementada. | Funcionalidad pendiente, pero mensaje claro | salida CLI |
| 2026-04-12 | TC-091 | `bun run pt logs errors` | PASS | 0 errores recientes. | - | salida CLI |
| 2026-04-12 | TC-088 | `bun run pt history list` | PASS | Lista las últimas ejecuciones con duración y estado. | - | salida CLI |
| 2026-04-12 | TC-093 | `bun run pt device list` | PASS | Actualmente quedan R1 y S1; PC1 fue removido. | - | salida CLI |

### Sesión ejecutada 2026-04-12 — cuarta tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-042 | `bun run pt config-host PC1 --dhcp` | PASS | Marca DHCP Sí correctamente tras revalidar con pausa. | - | salida CLI |
| 2026-04-12 | TC-041 | `bun run pt device get PC1` | PASS | PC1 muestra DHCP Sí; IP sigue en 0.0.0.0 como era esperado para el modo DHCP sin lease. | - | salida CLI |
| 2026-04-12 | TC-093 | `bun run pt show ip-int-brief PC1 --json` | BLOCKED | JSON con `raw: ""` e interfaces vacías. | Limitación conocida del runtime show | salida CLI |
| 2026-04-12 | TC-088 | `bun run pt results list` | PASS | Lista 20 archivos de resultados recientes correctamente. | - | salida CLI |
| 2026-04-12 | TC-089 | `bun run pt results last` | N/I | El comando no existe (`unknown command 'last'`). | Subcomando no implementado / no expuesto | salida CLI |
| 2026-04-12 | TC-090 | `bun run pt logs tail` | WARN | Últimos eventos aparecen como `unknown -> ok`, señal de telemetría poco descriptiva. | Logs poco enriquecidos | salida CLI |
| 2026-04-12 | TC-134 | `bun run pt history show s-1775982486561-fcafca52` | PASS | Muestra el timeline completo de la sesión de topology.clean. | - | salida CLI |
| 2026-04-12 | TC-135 | `bun run pt history explain s-1775982486561-fcafca52` | PASS | Devuelve correctamente que la sesión fue exitosa y no hay error que explicar. | - | salida CLI |

### Sesión ejecutada 2026-04-12 — quinta tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-061 | `bun run pt routing static --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-071 | `bun run pt routing ospf --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-077 | `bun run pt services dhcp --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-078 | `bun run pt services ntp --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-079 | `bun run pt services syslog --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-074 | `bun run pt acl create --examples` | FAIL | Requiere `--name` aunque solo se pidió ejemplos. | UX/CLI conflictivo con flags de ayuda | salida CLI |
| 2026-04-12 | TC-075 | `bun run pt acl apply --examples` | FAIL | Requiere `--acl` aunque solo se pidió ejemplos. | UX/CLI conflictivo con flags de ayuda | salida CLI |
| 2026-04-12 | TC-080 | `bun run pt etherchannel --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-081 | `bun run pt stp --examples` | N/I | Muestra ayuda del subcomando y sale con error de uso; no entrega ejemplos. | Flag no implementado en este nivel | salida CLI |
| 2026-04-12 | TC-076 | `bun run pt config-acl --device R1 --name BLOCK_NET --type standard --rule "deny,ip,any,any" --apply` | FAIL | `IOS configuration failed`. | Runtime IOS/config mode aún no estable para aplicar ACL | salida CLI |
| 2026-04-12 | TC-072 | `bun run pt routing ospf add-network --device R1 --network 192.168.10.0/24 --area 0` | FAIL | Sigue reportando que el área debe ser entero válido. | Parser/validation del área OSPF | salida CLI |
| 2026-04-12 | TC-074 | `bun run pt acl apply --acl BLOCK_NET --device R1 --interface GigabitEthernet0/0 --direction in --plan` | PASS | Muestra plan de aplicación correcto. | - | salida CLI |
| 2026-04-12 | TC-071 | `bun run pt routing ospf enable --plan --device R1 --process-id 1` | PASS | Muestra plan de habilitación OSPF correcto. | - | salida CLI |
| 2026-04-12 | TC-077 | `bun run pt services dhcp create --plan --device R1 --pool LAN10 --network 192.168.10.0/24` | PASS | Muestra plan de creación de pool DHCP correcto. | - | salida CLI |

### Sesión ejecutada 2026-04-12 — sexta tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-061 | `bun run pt routing static add --explain --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1` | PASS | Explica que es routing estático para varias familias de protocolos. | - | salida CLI |
| 2026-04-12 | TC-077 | `bun run pt services dhcp create --explain --device R1 --pool LAN10 --network 192.168.10.0/24` | PASS | Explica que son comandos de servicios básicos DHCP/NTP/Syslog. | - | salida CLI |
| 2026-04-12 | TC-074 | `bun run pt acl create --explain --name BLOCK_NET --type standard` | PASS | Explica que sirve para crear/agregar/aplicar ACLs. | - | salida CLI |
| 2026-04-12 | TC-080 | `bun run pt etherchannel create --explain S1 --group-id 1 --interfaces Gi0/1,Gi0/2` | PASS | Explica bundles EtherChannel en switches Cisco. | - | salida CLI |
| 2026-04-12 | TC-069 | `bun run pt stp set-root --explain --device S1 --vlan 1` | PASS | Muestra explicación/plan del root bridge para VLAN 1. | - | salida CLI |
| 2026-04-12 | TC-000 | `bun run pt status` | WARN | Bridge ready pero lease invalid; topology stale; 4 devices / 8 links. | Estado parcial del bridge | salida CLI |
| 2026-04-12 | TC-000 | `bun run pt inspect topology` | WARN | Reporta 4 dispositivos, 8 conexiones; incluye Power Distribution Device0 y enlaces heredados. | Contexto mixto / topología heredada | salida CLI |

### Sesión ejecutada 2026-04-12 — séptima tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-140 | `bun run pt help device` | PASS | Devuelve help enriquecido para device con ejemplos y notas de estado parcial. | - | salida CLI |
| 2026-04-12 | TC-141 | `bun run pt help link` | PASS | Devuelve help enriquecido para link con ejemplos. | - | salida CLI |
| 2026-04-12 | TC-142 | `bun run pt help routing static add` | FAIL | `help` no acepta 3 argumentos; demasiados argumentos. | Límite del dispatcher help | salida CLI |
| 2026-04-12 | TC-143 | `bun run pt help services dhcp create` | FAIL | `help` no acepta 3 argumentos; demasiados argumentos. | Límite del dispatcher help | salida CLI |
| 2026-04-12 | TC-144 | `bun run pt help acl create` | PASS | Reporta que no encuentra el comando compuesto y sugiere usar `pt help`. | Límite/UX del helper, pero comportamiento claro | salida CLI |
| 2026-04-12 | TC-145 | `bun run pt bridge` | PASS | Bridge running, lease valid, TTL visible. | - | salida CLI |
| 2026-04-12 | TC-146 | `bun run pt results pending` | PASS | Muestra 1 queued, 0 in-flight, 40 dead-letter. | - | salida CLI |
| 2026-04-12 | TC-147 | `bun run pt results failed --limit 5` | PASS | Lista resultados fallidos recientes. | - | salida CLI |
| 2026-04-12 | TC-148 | `bun run pt search topology.clean --limit 5` | PASS | Devuelve 5 resultados del historial relacionados. | - | salida CLI |
| 2026-04-12 | TC-149 | `bun run pt host inspect PC1` | PASS | Muestra host PC1 con DHCP Sí y datos básicos. | - | salida CLI |
| 2026-04-12 | TC-150 | `bun run pt host config PC1 --ip 192.168.1.50 --mask 255.255.255.0 --gateway 192.168.1.1` | PASS | Configura host PC1 correctamente por la sintaxis real del subcomando. | - | salida CLI |
| 2026-04-12 | TC-151 | `bun run pt host inspect PC1 --json` | WARN | JSON correcto pero reporta IP 0.0.0.0 y DHCP true en el contexto parcial. | Contexto parcial / lease no reflejado en host inspect | salida CLI |
| 2026-04-12 | TC-152 | `bun run pt results show cmd_000000002025.json` | FAIL | Resultado no encontrado. | ID no existe o ya fue rotado | salida CLI |
| 2026-04-12 | TC-153 | `bun run pt failed --limit 5` | PASS | Lista los 5 comandos fallidos recientes. | - | salida CLI |
| 2026-04-12 | TC-154 | `bun run pt status` | WARN | Bridge running con lease valid, pero topology stale y 4 devices / 8 links. | Contexto mixto / parcial | salida CLI |
| 2026-04-12 | TC-155 | `bun run pt inspect topology` | WARN | Reporta 4 dispositivos y 8 conexiones, incluyendo un Power Distribution Device0 heredado. | Contexto mixto / topología heredada | salida CLI |

### Sesión ejecutada 2026-04-12 — octava tanda

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-156 | `bun run pt results view cmd_000000001979.json` | PASS | Expone el envelope completo del resultado con protocolo v3, timestamps y value. | - | salida CLI |
| 2026-04-12 | TC-157 | `bun run pt results show cmd_000000001979` | FAIL | Revienta con `ReferenceError: join is not defined` en `results.ts:446`. | Bug real en el subcomando results.show | salida CLI |
| 2026-04-12 | TC-158 | `bun run pt results show cmd_000000001979 --json` | FAIL | Mismo `ReferenceError: join is not defined`. | Bug real en el subcomando results.show | salida CLI |
| 2026-04-12 | TC-159 | `bun run pt device list --json` | FAIL | Imprime salida textual normal, no JSON. | Flag JSON ignorado o no aplicado en device list | salida CLI |
| 2026-04-12 | TC-160 | `bun run pt host inspect PC1 --schema` | PASS | Devuelve schema JSON del comando host.inspect. | - | salida CLI |
| 2026-04-12 | TC-161 | `bun run pt failed --device R1 --limit 5` | PASS | No hay comandos fallidos para el dispositivo R1. | - | salida CLI |
| 2026-04-12 | TC-162 | `bun run pt search --device R1 topology.clean` | PASS | No se encontraron comandos con ese texto para R1. | - | salida CLI |
| 2026-04-12 | TC-163 | `bun run pt inspect neighbors PC1` | PASS | Muestra vecinos SW1 y S1 para PC1. | - | salida CLI |
| 2026-04-12 | TC-164 | `bun run pt inspect free-ports PC1` | PASS | Muestra puertos libres FastEthernet0 y Bluetooth. | - | salida CLI |
| 2026-04-12 | TC-165 | `bun run pt inspect drift` | PASS | Drift de contexto: no. Snapshot y sistema coinciden 4/8. | - | salida CLI |
