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
