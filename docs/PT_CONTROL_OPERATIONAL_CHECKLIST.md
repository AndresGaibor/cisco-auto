# PT Control — Operational QA Checklist

> Basado en `docs/superpowers/specs/2026-04-12-pt-cli-exhaustive-tests-design.md`
>
> Uso: marca cada caso con `x` cuando esté validado, o anota el error/limitación en la columna de observaciones.
>
> Estados sugeridos: `TODO`, `PASS`, `WARN`, `BLOCKED`, `N/I` (not implemented), `FAIL`.

---

## Preflight

- [ ] PT está corriendo.
- [ ] `~/pt-dev/main.js` está cargado como Script Module.
- [ ] El canvas está limpio antes de empezar.
- [ ] `bun run pt --help` responde.
- [ ] `bun run pt doctor` muestra estado saludable.
- [ ] Se conoce la versión/estado del CLI antes de iniciar la tanda.

---

## Fase 1 — Smoke / base

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-001 | `pt doctor` responde | |
| [ ] | TC-002 | `pt --help` global | |
| [ ] | TC-003 | `device list` en canvas vacío | |

---

## Fase 2 — Device lifecycle

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-010 | Agregar router | |
| [ ] | TC-011 | Agregar switch genérico | |
| [ ] | TC-012 | Agregar PC | |
| [ ] | TC-013 | Agregar con coordenadas | |
| [ ] | TC-014 | `device get` de router | |
| [ ] | TC-015 | `device list` con 3 nodos | |
| [ ] | TC-016 | Mover dispositivo | |
| [ ] | TC-017 | Duplicado de nombre | |
| [ ] | TC-018 | Modelo inválido | |
| [ ] | TC-019 | Remover dispositivo | |
| [ ] | TC-020 | `device get` eliminado | |

---

## Fase 3 — Links

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-030 | Link router-switch | |
| [ ] | TC-031 | Link PC-switch | |
| [ ] | TC-032 | `link list` | |
| [ ] | TC-033 | Link duplicado | |
| [ ] | TC-034 | Puerto inválido | |
| [ ] | TC-035 | Dispositivo inexistente | |
| [ ] | TC-036 | `link remove` | |
| [ ] | TC-037 | `link add` interactivo | |
| [ ] | TC-038 | Verify en link | |

---

## Fase 4 — Config host / IOS / show

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-040 | IP estática en PC | |
| [ ] | TC-041 | Verificación post-config host | |
| [ ] | TC-042 | DHCP en host | |
| [ ] | TC-043 | Host inexistente | |
| [ ] | TC-044 | IP inválida | |
| [ ] | TC-045 | Show simple | |
| [ ] | TC-046 | Config interfaz IOS | |
| [ ] | TC-047 | Hostname IOS | |
| [ ] | TC-048 | IOS inválido | |
| [ ] | TC-049 | `config-ios` sin dispositivo | |
| [ ] | TC-050 | `config-ios` sobre PC | |
| [ ] | TC-051 | `config-ios --examples` | |
| [ ] | TC-052 | `config-ios --plan` | |
| [ ] | TC-053 | `show ip-int-brief` | |
| [ ] | TC-054 | `show vlan` | |
| [ ] | TC-055 | `show ip-route` | |
| [ ] | TC-056 | `show run-config` | |
| [ ] | TC-057 | `show --json` | |
| [ ] | TC-058 | `show` sin dispositivo | |

---

## Fase 5 — VLAN / trunk / switching

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-060 | Crear VLAN | |
| [ ] | TC-061 | Aplicar VLANs | |
| [ ] | TC-062 | Trunk apply | |
| [ ] | TC-063 | EtherChannel create | |
| [ ] | TC-064 | EtherChannel list | |
| [ ] | TC-065 | EtherChannel remove | |
| [ ] | TC-066 | VLAN ID inválido | |
| [ ] | TC-067 | VLAN vacía | |
| [ ] | TC-068 | STP configure | |
| [ ] | TC-069 | STP root | |

---

## Fase 6 — Routing / ACL / services

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-070 | Ruta estática | |
| [ ] | TC-071 | OSPF enable | |
| [ ] | TC-072 | EIGRP enable | |
| [ ] | TC-073 | Red inválida | |
| [ ] | TC-074 | ACL estándar | |
| [ ] | TC-075 | ACL add-rule | |
| [ ] | TC-076 | ACL apply | |
| [ ] | TC-077 | DHCP service | |
| [ ] | TC-078 | NTP service | |
| [ ] | TC-079 | Syslog service | |

---

## Fase 7 — Topology / logs / history / help

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-080 | `topology clean` con confirmación | |
| [ ] | TC-081 | `topology clean --force` | |
| [ ] | TC-082 | `topology clean --list` | |
| [ ] | TC-083 | `topology analyze` | |
| [ ] | TC-084 | `topology export` | |
| [ ] | TC-085 | `topology visualize` | |
| [ ] | TC-086 | `logs tail` | |
| [ ] | TC-087 | `logs errors` | |
| [ ] | TC-088 | `history list` | |
| [ ] | TC-089 | `history last` | |
| [ ] | TC-090 | `device --help` | |
| [ ] | TC-091 | Comando desconocido | |
| [ ] | TC-092 | Flag desconocido | |
| [ ] | TC-093 | Output JSON estable | |

---

## Fase 8 — Resiliencia, lentitud y límites

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-100 | Muchos comandos seguidos | |
| [ ] | TC-101 | PT sin módulo cargado | |
| [ ] | TC-102 | Reinicio entre comandos | |
| [ ] | TC-103 | Cola saturada | |
| [ ] | TC-104 | Respuesta lenta | |
| [ ] | TC-105 | Estado parcial/corrupto | |

---

## Fase 9 — Escenarios end-to-end

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-120 | Red básica | |
| [ ] | TC-121 | Red doble acceso | |
| [ ] | TC-122 | VLAN + trunk | |
| [ ] | TC-123 | Inter-VLAN routing | |
| [ ] | TC-124 | Routing estático | |
| [ ] | TC-125 | Escenario con errores intencionales | |
| [ ] | TC-126 | Escenario de estrés | |
| [ ] | TC-127 | Limpieza y reconstrucción | |

---

## Fase 10 — DHCP avanzado

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-039 | DHCP por VLAN usando switch capa 3 | |
| [ ] | TC-040 | DHCP centralizado para varias VLANs con relay | |
| [ ] | TC-041 | DHCP con DNS entregado al cliente | |
| [ ] | TC-042 | DHCP con exclusiones correctas | |
| [ ] | TC-043 | DHCP mal entregando gateway | |
| [ ] | TC-044 | DHCP con máscara incorrecta | |
| [ ] | TC-045 | DHCP agotado por rango pequeño | |
| [ ] | TC-046 | DHCP por VLAN con un puerto en VLAN equivocada | |

---

## Fase 11 — ACLs IPv4

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-047 | ACL estándar bloqueando una red origen | |
| [ ] | TC-048 | ACL estándar permitiendo solo TI a la administración | |
| [ ] | TC-049 | ACL extendida bloqueando HTTP | |
| [ ] | TC-050 | ACL extendida bloqueando FTP y permitiendo web | |
| [ ] | TC-051 | ACL inbound vs outbound | |
| [ ] | TC-052 | ACL para proteger VTY | |
| [ ] | TC-053 | ACL entre VLANs en router-on-a-stick | |
| [ ] | TC-054 | ACL de invitados | |
| [ ] | TC-055 | ACL con deny implícito mal entendido | |
| [ ] | TC-056 | ACL de troubleshooting puro | |

---

## Fase 12 — NAT / PAT

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-057 | PAT básico para una oficina | |
| [ ] | TC-058 | NAT estático para servidor web | |
| [ ] | TC-059 | NAT estático + PAT simultáneos | |
| [ ] | TC-060 | NAT dinámico con pool | |
| [ ] | TC-061 | NAT con ACL incorrecta | |
| [ ] | TC-062 | NAT con inside/outside invertidos | |
| [ ] | TC-063 | NAT con DNS y servidor publicado | |
| [ ] | TC-064 | PAT para varias VLANs internas | |
| [ ] | TC-065 | NAT + ACL perimetral | |
| [ ] | TC-066 | NAT de diagnóstico completo | |

---

## Fase 13 — SSH y hardening

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-067 | SSH básico en un router | |
| [ ] | TC-068 | SSH en switch de acceso | |
| [ ] | TC-069 | Solo SSH, sin Telnet | |
| [ ] | TC-070 | Hardening básico de router | |
| [ ] | TC-071 | Hardening básico de switch | |
| [ ] | TC-072 | Acceso administrativo solo desde TI | |

---

## Fase 14 — HSRP

| Estado | ID | Caso | Observaciones |
|---|---|---|---|
| [ ] | TC-073 | HSRP básico con dos routers | |
| [ ] | TC-074 | HSRP con `preempt` | |
| [ ] | TC-075 | HSRP con fallo del activo | |
| [ ] | TC-076 | HSRP + diagnóstico de gateway redundante | |

---

## Notas operativas

- Registrar siempre la fecha, el entorno y la versión del CLI.
- Si un caso falla por una limitación conocida, marcarlo como `BLOCKED` o `N/I` en observaciones.
- Si un caso pasa pero es lento o incompleto, marcar `WARN`.
- Si un caso muestra comportamiento inesperado, anotar comando exacto, salida y causa probable.
- El spec maestro sigue siendo la referencia principal: esta checklist solo operacionaliza la ejecución.
