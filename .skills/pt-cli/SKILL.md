---
name: pt-cli
description: |
  Skill operativa para usar cisco-auto/pt-cli como agente autónomo de Cisco Packet Tracer.

  Actívala cuando el usuario mencione Packet Tracer, PT, cisco-auto, bun run pt, pt-cli,
  automatización de laboratorios Cisco, VLAN, trunk, STP, EtherChannel, routing, OSPF,
  EIGRP, DHCP, DNS, ACL, NAT, HSRP, WLC, troubleshooting o validación de labs.

  Objetivo: resolver talleres de redes con evidencias, sin inventar comandos, usando la CLI
  pública real y referencias de red antes de aplicar cambios.
---

# pt-cli — Skill operativa para talleres Cisco/Packet Tracer

## Principio no negociable

No inventes comandos. La fuente de verdad de la CLI es el código actual del repo:

1. `apps/pt-cli/src/commands/command-registry.ts` para comandos públicos registrados.
2. `apps/pt-cli/src/commands/*` para argumentos, flags y subcomandos reales.
3. `bun run pt <comando> --help` para confirmar uso en tiempo de ejecución.

En este repo, usa `bun run pt ...`. Si el usuario ya tiene binario global instalado, `pt ...` es equivalente, pero la skill debe preferir `bun run pt ...` para ser reproducible.

## Comandos públicos reales actuales

Usa estos comandos como API primaria:

| Área | Comandos |
|---|---|
| Salud/runtime | `bun run pt doctor`, `bun run pt runtime status`, `bun run pt runtime logs`, `bun run pt runtime reload` |
| Topología | `bun run pt device list/get/ports/add/move/remove`, `bun run pt device module slots/add`, `bun run pt link list/add/remove/suggest/verify/doctor` |
| Terminal | `bun run pt cmd <device> "<comando>"`, `bun run pt cmd <device> --config ...`, `bun run pt cmd each --devices A,B "<comando>"` |
| Hosts GUI/API | `bun run pt set host <PC|Server> ip ...`, `bun run pt set host <PC|Server> dhcp` |
| Verificación | `bun run pt verify ping <source> <target>`, `bun run pt verify vlan <switch> <vlan>`, `bun run pt verify ios <device> <command...>` |
| Forense/último recurso | `bun run pt omni status`, `bun run pt omni inspect env`, `bun run pt omni topology physical`, `bun run pt omni device genome <device>`, `bun run pt omni raw ... --dry-run/--yes` |
| UX | `bun run pt completion <bash|zsh|fish|powershell>` |

`lab` está oculto en la CLI pública. No lo uses en autonomía normal salvo que el usuario active explícitamente el modo legacy y confirmes que aparece en `bun run pt --help`.

## Comandos que NO debes usar porque están obsoletos o no públicos

No uses `pt status`, `pt canvas clear`, `pt config ip`, `pt config-ios`, `pt show-mac`, `pt ping`, `pt audit full`, `pt lab validate`, `pt ospf`, `pt vlan`, `pt routing`, `pt acl`, `pt stp`, `pt services`, `pt logs`, `pt history`, `pt results`, `pt topology`, `pt omni audit`, `pt omni genome`, ni `pt omni env --no-anim` como si fueran públicos, salvo que primero confirmes con `bun run pt --help` que existen en esta versión.

Si una referencia antigua menciona esos comandos, tradúcelos así:

| Antiguo | Reemplazo actual |
|---|---|
| `pt status` | `bun run pt doctor` + `bun run pt runtime status` |
| `pt config ip PC1 ...` | `bun run pt set host PC1 ip ...` |
| `pt config-ios R1 ...` | `bun run pt cmd R1 --config ...` |
| `pt show ...` | `bun run pt cmd <device> "show ..."` |
| `pt ping PC1 X` | `bun run pt verify ping PC1 X` o `bun run pt cmd PC1 "ping X"` |
| `pt show-mac SW1` | `bun run pt cmd SW1 "show mac address-table"` |
| `pt omni genome R1` | `bun run pt omni device genome R1` |
| `pt omni audit` | `bun run pt omni assessment ...` si aplica, o `bun run pt omni capability list` |

## Referencias internas obligatorias

Antes de configurar o diagnosticar una tecnología, consulta el archivo correspondiente:

- [CLI actual y patrones seguros](references/cli-current.md)
- [Flujos autónomos de laboratorio](references/lab-workflows.md)
- [Cookbook de red: VLAN, DHCP, routing, ACL, NAT, HSRP](references/network-cookbook.md)
- [Switching L2: VLAN, trunks, STP, EtherChannel](references/switching-L2.md)
- [Routing L3 y servicios](references/routing-L3.md)
- [Seguridad y hardening](references/security-hardening.md)
- [Verificación y evidencias](references/verification-playbook.md)
- [Troubleshooting](references/troubleshooting.md)
- [WLC y wireless](references/wlc.md)

## Flujo autónomo obligatorio

1. **Inventario**
   - Ejecuta `bun run pt doctor --json` si algo falla o si no sabes si PT está listo.
   - Ejecuta `bun run pt runtime status --json` antes de operaciones grandes.
   - Ejecuta `bun run pt device list --json --links` y, para puertos, `bun run pt device ports <device> --json`.

2. **Plan determinista**
   - Si faltan nombres, puertos, modelos, VLANs, subredes o objetivo del lab, pregunta antes de mutar.
   - No asumas interfaces. Usa `device ports` y `link suggest`.
   - Para cambios de topología usa `--plan` si el comando lo soporta.

3. **Aplicación segura**
   - Topología: `device add`, `device module add`, `link add`.
   - Hosts/servers por API: `set host`.
   - IOS/terminal: `cmd`, preferiblemente con `--config` para bloques de configuración.
   - Omni: último recurso, siempre `--dry-run` antes de `--yes`.

4. **Verificación con evidencia**
   - Nunca digas que un lab está listo solo porque un comando terminó OK.
   - Guarda o cita evidences: `show`, `ipconfig`, `verify ping`, `verify vlan`, `link verify`, `device list --links`.
   - Si la evidencia contradice el plan, detente y diagnostica por capas OSI.

5. **Corrección iterativa**
   - Corrige una causa probable a la vez.
   - Repite la verificación afectada.
   - Si PT queda inestable, usa `doctor`, `runtime logs` y pide reinicio de PT cuando el runtime no responda.

## Comandos IOS útiles por tecnología

Usa estos comandos mediante `bun run pt cmd <device> "..."` o `bun run pt cmd <device> --config ...`:

| Tecnología | Configuración típica | Verificación mínima |
|---|---|---|
| Interfaces router | `interface g0/0`, `ip address A.B.C.D MASK`, `no shutdown` | `show ip interface brief`, `show interfaces g0/0` |
| VLANs | `vlan 10`, `name USERS`; en puerto: `switchport mode access`, `switchport access vlan 10` | `show vlan brief`, `show interfaces switchport` |
| Trunk | `switchport mode trunk`, `switchport trunk allowed vlan 10,20`, `switchport trunk native vlan 99` | `show interfaces trunk`, `show spanning-tree vlan <id>` |
| Router-on-a-stick | `interface g0/0.10`, `encapsulation dot1Q 10`, `ip address ...` | `show ip interface brief`, `show running-config interface g0/0.10` |
| DHCP IOS | `ip dhcp excluded-address ...`, `ip dhcp pool NAME`, `network ...`, `default-router ...`, `dns-server ...` | `show ip dhcp pool`, `show ip dhcp binding`, host `ipconfig` |
| DHCP relay | En SVI/subinterfaz: `ip helper-address <server>` | `show running-config interface ...`, host `ipconfig` |
| Ruta estática | `ip route <net> <mask> <next-hop|exit-int>` | `show ip route`, `ping`, `traceroute` |
| OSPF | `router ospf 1`, `network <net> <wildcard> area 0` | `show ip ospf neighbor`, `show ip route ospf` |
| EIGRP | `router eigrp <AS>`, `network <net> <wildcard>`, `no auto-summary` | `show ip eigrp neighbors`, `show ip route eigrp` |
| ACL | `ip access-list extended NAME`, reglas `permit/deny`; aplicar con `ip access-group NAME in|out` | `show access-lists`, `show ip interface <int>` |
| NAT/PAT | `ip nat inside/outside`, ACL de origen, `ip nat inside source list ACL interface OUT overload` | `show ip nat translations`, `show ip nat statistics` |
| STP | `spanning-tree mode rapid-pvst`, root: `spanning-tree vlan X priority 4096` | `show spanning-tree`, `show spanning-tree vlan X` |
| EtherChannel | `channel-group 1 mode active`, `interface port-channel 1` | `show etherchannel summary`, `show interfaces trunk` |
| HSRP | `standby 1 ip VIP`, `standby 1 priority 110`, `standby 1 preempt` | `show standby brief`, `show standby` |

## Reglas para talleres inteligentes

- Diseña por intención: objetivos, VLANs, direccionamiento, gateway, servicios, rutas, políticas y pruebas esperadas.
- Separa topología física de configuración lógica.
- Cada cambio debe tener una prueba asociada.
- En Packet Tracer, espera convergencia L2 antes de concluir fallo de IP. Links ámbar/STP pueden tardar.
- Para MAC table, primero genera tráfico: `verify ping` o `cmd PC "ping ..."`; luego `show mac address-table`.
- Para DHCP, valida en tres puntos: pool en servidor/router, relay/default-gateway, lease en cliente.
- Para routing, valida: interfaz up/up, red anunciada/conectada, tabla de rutas, ping extremo a extremo.
- Para ACL/NAT, valida dirección de aplicación (`in/out`, `inside/outside`) antes de cambiar reglas.

## Política de seguridad operacional

- No uses `--allow-destructive`, `--unsafe`, `omni raw --yes` ni borrados masivos sin confirmación explícita.
- No modifiques `~/pt-dev` directamente salvo instrucciones explícitas de mantenimiento del proyecto.
- No prometas que algo quedó perfecto sin evidencia.
- Si el usuario pide autonomía completa, aún debes reportar incertidumbre cuando la CLI no pueda verificar.

## Historial de cambios

| Versión | Fecha | cambios |
|--------|-------|--------|
| 2.0 | 2026-04 | Rewritten: CLI commands, flujos autónomos, referencias separating |
| 1.0 | 2024-... | Original CCIE-style skill |