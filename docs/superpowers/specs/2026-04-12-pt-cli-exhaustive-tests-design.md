# PT CLI: batería exhaustiva de pruebas manuales con `bun run pt`

**Fecha:** 2026-04-12  
**Estado:** Diseño propuesto  
**Alcance:** documentación de casos de prueba, no implementación  
**Objetivo principal:** cubrir desde lo básico hasta laboratorios complejos, incluyendo errores, límites, lentitud, fallos esperados y comandos aún no implementados.

---

## 1. Objetivo

Definir una batería de pruebas manuales exhaustiva para el CLI de PT Control ejecutado únicamente con `bun run pt`.

La suite debe servir para:

- validar el funcionamiento básico del CLI,
- detectar regresiones funcionales,
- documentar errores conocidos,
- registrar casos que hoy fallan por limitaciones del runtime o de Packet Tracer,
- y dejar explícito qué comandos o flujos todavía no están implementados.

La salida esperada es una **matriz de casos** usable como QA sheet y como hoja de ruta para futuras mejoras.

---

## 2. Contexto del proyecto

El repositorio ya incluye:

- comandos de CLI para `device`, `link`, `config-host`, `config-ios`, `show`, `vlan`, `trunk`, `routing`, `acl`, `services`, `topology`, `logs`, `history` y otros,
- documentación previa de QA con casos ejecutados,
- known issues documentados,
- y un runtime de Packet Tracer que todavía tiene límites en ciertos comandos IOS.

También existen comandos y flags que están parcialmente implementados o directamente no existen todavía. Esta batería no los oculta: los clasifica explícitamente como **not-implemented**, **blocked** o **warning** según corresponda.

---

## 3. Alcance

### Incluye

- Casos smoke.
- Ciclo de vida de dispositivos.
- Creación y eliminación de enlaces.
- Configuración de hosts.
- Configuración IOS.
- Comandos `show`.
- VLAN, trunk, STP y EtherChannel.
- Routing y ACL.
- Servicios de red.
- Topología, logs, history y help/flags/output.
- Errores de validación.
- Casos de lentitud y timeout.
- Escenarios end-to-end de red completa.
- Casos de comandos no implementados.

### No incluye

- Implementación de nuevos comandos.
- Automatización del runner de pruebas.
- Refactor de arquitectura.
- Cambios al runtime para hacer pasar los casos.

---

## 4. Principios de diseño de la batería

1. **Cobertura sobre cantidad de comandos aislados**  
   Cada caso debe probar una sola hipótesis importante.

2. **Fallos explícitos, no ambiguos**  
   Si algo no existe o no puede cumplirse, debe registrarse con una etiqueta clara.

3. **Tiempo como criterio de calidad**  
   La prueba no solo evalúa si funciona, sino también si responde dentro de una ventana razonable.

4. **Escenarios reales primero**  
   La matriz incluye flujos de red completos, no solo validaciones puntuales.

5. **Un resultado por caso**  
   Cada caso termina en una de estas categorías:
   - `pass`
   - `warning`
   - `blocked`
   - `not-implemented`
   - `fail`

---

## 5. Clasificación de resultados

### `pass`
El comando funciona y cumple la expectativa definida.

### `warning`
Funciona, pero con degradación, latencia alta, salida incompleta o comportamiento no ideal.

### `blocked`
El caso no puede completarse por una limitación conocida del entorno actual, por ejemplo:

- el runtime no entra a privileged exec,
- Packet Tracer no expone un estado fiable,
- o el comando depende de un bug ya identificado.

### `not-implemented`
El comando, flag o flujo todavía no existe.

### `fail`
El caso debería ser posible hoy, pero falla por un defecto del CLI o del runtime.

---

## 6. Umbrales de tiempo

Cada caso registra una expectativa temporal.

- **rápido**: menos de 2s
- **normal**: 2–10s
- **lento tolerable**: 10–30s
- **timeout / warning**: más de 30s o sin respuesta estable

Si un caso supera su umbral esperado, no se borra ni se “perdona”: se documenta como problema de rendimiento o resiliencia.

---

## 7. Estructura de la batería

La batería se divide en 5 bloques.

### Bloque A — Smoke y preparación
Verifica que el entorno está listo y que el CLI responde.

### Bloque B — Casos atómicos por comando
Valida operaciones aisladas de device, link, config, show, VLAN, routing, ACL, services y tooling.

### Bloque C — Errores, límites y comandos no implementados
Cubre entradas inválidas, flags incorrectos, duplicados, dispositivos ausentes, y comandos todavía no soportados.

### Bloque D — Resiliencia y tiempo
Cubre saturación, reintentos, resets, timeouts y caída parcial del entorno.

### Bloque E — Escenarios end-to-end
Prueba laboratorios completos desde cero hasta topologías más complejas.

---

## 8. Matriz propuesta de casos

> Nota: esta matriz está pensada para crecer sin perder trazabilidad. No depende de una implementación nueva; documenta lo que debe pasar hoy y lo que falta.

### A. Smoke / base

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-001 | `pt doctor` responde | `bun run pt doctor` | Informe de salud con checks básicos | rápido |
| TC-002 | `pt --help` global | `bun run pt --help` | Lista completa de subcomandos y flags | rápido |
| TC-003 | `device list` en canvas vacío | `bun run pt device list` | Lista vacía coherente, sin crash | rápido |

### B. Device lifecycle

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-010 | Agregar router | `bun run pt device add R1 2911` | R1 aparece en canvas y en list | normal |
| TC-011 | Agregar switch genérico | `bun run pt device add S1 2960` | S1 aparece; si PT normaliza modelo, se documenta | normal |
| TC-012 | Agregar PC | `bun run pt device add PC1 pc` | PC1 aparece correctamente | normal |
| TC-013 | Agregar con coordenadas | `bun run pt device add R2 2911 --xpos 250 --ypos 150` | Posición respetada | normal |
| TC-014 | `device get` de router | `bun run pt device get R1` | Devuelve nombre, modelo y tipo | normal |
| TC-015 | `device list` con 3 nodos | `bun run pt device list` | Enumera todos los dispositivos activos | rápido |
| TC-016 | Mover dispositivo | `bun run pt device move R1 --xpos 300 --ypos 200` | Coordenadas actualizadas | normal |
| TC-017 | Duplicado de nombre | `bun run pt device add R1 2911` | Error claro por nombre repetido | rápido |
| TC-018 | Modelo inválido | `bun run pt device add X9 modelo-inexistente` | Error claro con lista o sugerencia de modelos | rápido |
| TC-019 | Remover dispositivo | `bun run pt device remove PC1` | PC1 desaparece de canvas y list | normal |
| TC-020 | `device get` eliminado | `bun run pt device get PC1` | Error claro, no `undefined` | rápido |

### C. Links

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-030 | Link router-switch | `bun run pt link add R1 GigabitEthernet0/0 S1 GigabitEthernet0/1` | Enlace creado | normal |
| TC-031 | Link PC-switch | `bun run pt link add PC1 FastEthernet0 S1 FastEthernet0/2` | Enlace creado | normal |
| TC-032 | `link list` | `bun run pt link list` | Muestra enlaces activos | rápido |
| TC-033 | Link duplicado | Repetir TC-030 | Error o idempotencia explícita | rápido |
| TC-034 | Puerto inválido | `bun run pt link add R1 Gi0/99 S1 Fa0/1` | Error claro por puerto inexistente | rápido |
| TC-035 | Dispositivo inexistente | `bun run pt link add X9 Gi0/0 S1 Fa0/1` | Error claro por dispositivo ausente | rápido |
| TC-036 | `link remove` | `bun run pt link remove R1 GigabitEthernet0/0` | Enlace eliminado, puertos libres | normal |
| TC-037 | `link add` interactivo | `bun run pt link add` | Flujo interactivo usable o marcado como not-implemented | lento tolerable |
| TC-038 | Verify en link | `bun run pt link add R1 Gi0/0 S1 Gi0/1 --verify` | Verificación pasa o reporta limitación | normal |

### D. Config host / config IOS / show

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-040 | IP estática en PC | `bun run pt config-host PC1 192.168.1.10 255.255.255.0 192.168.1.1` | Host configurado | normal |
| TC-041 | Verificación post-config host | `bun run pt device get PC1` | Muestra IP/mask/gateway | rápido |
| TC-042 | DHCP en host | `bun run pt config-host PC1 --dhcp` | Modo DHCP o not-implemented explícito | normal |
| TC-043 | Host inexistente | `bun run pt config-host X9 10.0.0.1 255.0.0.0` | Error claro por dispositivo ausente | rápido |
| TC-044 | IP inválida | `bun run pt config-host PC1 999.999.999.999 255.255.255.0` | Validación rechaza IP | rápido |
| TC-045 | Show simple | `bun run pt config-ios R1 "show version"` | Output IOS real o blocked por runtime | lento tolerable |
| TC-046 | Config interfaz IOS | `bun run pt config-ios R1 "enable" "configure terminal" "interface GigabitEthernet0/0" "ip address 192.168.1.1 255.255.255.0" "no shutdown"` | Config aplicada o bloqueo documentado | normal |
| TC-047 | Hostname IOS | `bun run pt config-ios R1 "enable" "configure terminal" "hostname MiRouter"` | Hostname actualizado o blocked | normal |
| TC-048 | IOS inválido | `bun run pt config-ios R1 "comando-inexistente"` | Error claro, sin falso positivo | rápido |
| TC-049 | `config-ios` sin dispositivo | `bun run pt config-ios` | Error de uso | rápido |
| TC-050 | `config-ios` sobre PC | `bun run pt config-ios PC1 "show version"` | Error por tipo incompatible | rápido |
| TC-051 | `config-ios --examples` | `bun run pt config-ios --examples` | Imprime ejemplos, no ejecuta | rápido |
| TC-052 | `config-ios --plan` | `bun run pt config-ios R1 --plan "show version"` | Muestra plan, no ejecuta | rápido |
| TC-053 | `show ip-int-brief` | `bun run pt show ip-int-brief R1` | Tabla/JSON coherente o blocked si runtime falla | normal |
| TC-054 | `show vlan` | `bun run pt show vlan S1` | VLANs visibles o blocked | normal |
| TC-055 | `show ip-route` | `bun run pt show ip-route R1` | Rutas visibles o blocked | normal |
| TC-056 | `show run-config` | `bun run pt show run-config R1` | Running config visible o blocked | normal |
| TC-057 | `show --json` | `bun run pt show ip-int-brief R1 --json` | JSON parseable | rápido |
| TC-058 | `show` sin dispositivo | `bun run pt show ip-int-brief` | Error definido o comportamiento explícito | rápido |

### E. VLAN / trunk / switching

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-060 | Crear VLAN | `bun run pt vlan create --name ADMIN --id 10` | Genera comandos o salida planificada | rápido |
| TC-061 | Aplicar VLANs | `bun run pt vlan apply Switch1 10 20 30` | Aplica o deja claro que es dry-run/generación | normal |
| TC-062 | Trunk apply | `bun run pt trunk apply Switch1 GigabitEthernet0/1` | Trunk configurado o no implementado explícito | normal |
| TC-063 | EtherChannel create | `bun run pt etherchannel create --device S1 --group-id 1 --interfaces Gi0/1,Gi0/2` | Comandos generados | normal |
| TC-064 | EtherChannel list | `bun run pt etherchannel list S1` | Lista grupos o indica falta de soporte | rápido |
| TC-065 | EtherChannel remove | `bun run pt etherchannel remove S1 --group-id 1` | Remoción o not-implemented | rápido |
| TC-066 | VLAN ID inválido | `bun run pt vlan create --name X --id 9999` | Rechazo por rango | rápido |
| TC-067 | VLAN vacía | `bun run pt vlan apply Switch1` | Error por parámetros incompletos | rápido |
| TC-068 | STP configure | `bun run pt stp configure --device S1 --mode rapid-pvst --dry-run` | Genera plan/comandos o not-implemented | rápido |
| TC-069 | STP root | `bun run pt stp set-root --device S1 --vlan 1` | Genera comando de root bridge o not-implemented | rápido |

### F. Routing / ACL / services

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-070 | Ruta estática | `bun run pt routing static add --device R1 --network 192.168.10.0/24 --next-hop 10.0.0.1` | Genera `ip route` o aplica según modo | rápido |
| TC-071 | OSPF enable | `bun run pt routing ospf enable --device R1 --process-id 1` | Genera OSPF o not-implemented | rápido |
| TC-072 | EIGRP enable | `bun run pt routing eigrp enable --device R1 --as 100` | Genera EIGRP o not-implemented | rápido |
| TC-073 | Red inválida | `bun run pt routing static add --device R1 --network invalid --next-hop 10.0.0.1` | Error de validación | rápido |
| TC-074 | ACL estándar | `bun run pt acl create --name BLOCK_NET --type standard --number 10` | Genera ACL | rápido |
| TC-075 | ACL add-rule | `bun run pt acl add-rule --name BLOCK_NET --action deny --source 192.168.2.0 --wildcard 0.0.0.255` | Regla agregada o not-implemented | rápido |
| TC-076 | ACL apply | `bun run pt acl apply --device R1 --name BLOCK_NET --interface GigabitEthernet0/0 --direction in` | ACL aplicada o blocked | normal |
| TC-077 | DHCP service | `bun run pt services dhcp R1` | Asistente/servicio generado o no implementado | normal |
| TC-078 | NTP service | `bun run pt services ntp R1` | Config o no implementado | normal |
| TC-079 | Syslog service | `bun run pt services syslog R1` | Config o no implementado | normal |

### G. Topology / logs / history / help

| ID | Caso | Comando | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-080 | `topology clean` con confirmación | `bun run pt topology clean` | Pide confirmación o muestra plan | rápido |
| TC-081 | `topology clean --force` | `bun run pt topology clean --force` | Elimina según alcance | normal |
| TC-082 | `topology clean --list` | `bun run pt topology clean --list` | Dry-run descriptivo | rápido |
| TC-083 | `topology analyze` | `bun run pt topology analyze` | Análisis de topología | rápido |
| TC-084 | `topology export` | `bun run pt topology export` | Export coherente | rápido |
| TC-085 | `topology visualize` | `bun run pt topology visualize` | Stub claro o visualización real | rápido |
| TC-086 | `logs tail` | `bun run pt logs tail` | Últimos eventos | rápido |
| TC-087 | `logs errors` | `bun run pt logs errors` | Solo errores | rápido |
| TC-088 | `history list` | `bun run pt history list` | Historial reciente | rápido |
| TC-089 | `history last` | `bun run pt history last` | Última ejecución | rápido |
| TC-090 | `--help` por subcomando | `bun run pt device --help` | Subcomandos correctos | rápido |
| TC-091 | Comando desconocido | `bun run pt foobar` | Error claro con sugerencia si existe | rápido |
| TC-092 | Flag desconocido | `bun run pt device list --foobar` | Error claro por flag inválido | rápido |
| TC-093 | Output JSON estable | `bun run pt device list --json` | JSON parseable y consistente | rápido |

### H. Resiliencia, lentitud y límites

| ID | Caso | Comando / situación | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-100 | 10+ comandos seguidos | Serie de add/move/link/config | No se corrompe la cola | normal |
| TC-101 | PT sin módulo cargado | Ejecutar cualquier comando sin `main.js` | Error o timeout explícito | timeout / warning |
| TC-102 | Reinicio entre comandos | Recargar módulo entre dos comandos | Segundo comando responde o falla claramente | normal |
| TC-103 | Cola saturada | Emitir muchos comandos seguidos | Backpressure o bloqueo documentado | lento tolerable |
| TC-104 | Respuesta lenta | Cualquier comando >30s | Se marca warning/timeout | timeout |
| TC-105 | Estado parcial/corrupto | Operación interrumpida a mitad | Resultado recuperable o error explícito | warning |

### I. Escenarios end-to-end

| ID | Caso | Topología / flujo | Resultado esperado | Tiempo |
|---|---|---|---|---|
| TC-120 | Red básica | R1 ↔ S1 ↔ PC1 | Topología creada y verificable | normal |
| TC-121 | Red doble acceso | R1 ↔ S1 ↔ PC1 y R1 ↔ S2 ↔ PC2 | Dos ramas independientes | normal |
| TC-122 | VLAN + trunk | S1 ↔ S2 trunk, PCs en VLAN distintas | VLANs separadas y trunk activo | normal |
| TC-123 | Inter-VLAN routing | Router-on-a-stick + 2 VLANs | Conectividad entre VLANs | normal |
| TC-124 | Routing estático | R1 ↔ R2, LAN por lado | Rutas manuales operativas | normal |
| TC-125 | Escenario con errores intencionales | modelo inválido + puerto incorrecto + link duplicado | Cada error queda documentado | normal |
| TC-126 | Escenario de estrés | múltiples add/link/config/show seguidos | Sin corrupción, con tiempos medidos | lento tolerable |
| TC-127 | Limpieza y reconstrucción | crear red → limpiar → recrear | `topology clean` deja canvas reutilizable | normal |

---

## 9. Casos de comandos no implementados

Estos casos se registran con la expectativa de que hoy pueden fallar o quedar bloqueados, pero deben estar visibles en la batería.

Ejemplos:

- `topology apply` si todavía no existe.
- `services dns` si no está implementado.
- `services snmp` si no está implementado.
- `acl vpn` o variantes no soportadas.
- `stp` con modos o flags aún inexistentes.
- `link add --interactive` si el flujo interactivo todavía no está cerrado.
- `config-ios --schema` / `--plan` / `--explain` si el parser no los admite de forma uniforme.

Cada uno debe documentarse con:

- comando exacto,
- estado esperado `not-implemented`,
- y nota de la funcionalidad que falta.

---

## 10. Manejo de errores esperado

La batería debe verificar mensajes de error claros en estos casos:

- dispositivo no encontrado,
- nombre duplicado,
- modelo no reconocido,
- puerto inexistente,
- comando inválido,
- flag inválido,
- sintaxis incompleta,
- timeout,
- y salida vacía donde debería haber contenido.

Cuando exista un bug conocido, la prueba no lo oculta: lo registra con una nota concreta.

---

## 11. Relación con issues conocidos

La batería debe mantener referencias explícitas a problemas ya observados, por ejemplo:

- links que se crean pero no se reflejan bien en snapshot,
- `show` que depende de privileged exec y hoy puede devolver salida vacía,
- discrepancias entre nombres de modelo esperados por QA y nombres reales de PT,
- o casos donde el runtime devuelve campos incompletos.

Esto sirve para distinguir entre:

- regresión nueva,
- bug viejo,
- y limitación del entorno.

---

## 12. Criterios de aceptación

Este diseño se considera correcto si:

1. cubre al menos 40 casos atómicos,
2. incluye escenarios end-to-end,
3. documenta errores y no-implementados sin esconderlos,
4. registra umbrales de tiempo,
5. y es usable como checklist QA para validar `bun run pt` manualmente.

---

## 13. Resultado esperado

Al finalizar, existirá una especificación de pruebas que permita responder con claridad:

- qué funciona,
- qué falla,
- qué está bloqueado por el runtime/PT,
- qué falta implementar,
- y qué escenarios tardan demasiado.

La intención no es solo “hacer pasar” la suite, sino tener un mapa completo del estado real del CLI.

---

## 14. Mapa ampliado de práctica Packet Tracer

> Esta sección amplía la batería con dominios de práctica más serios para CCNA/Packet Tracer. No redefine el alcance del documento: lo extiende con escenarios que se irán desglosando en lotes de casos más finos conforme el usuario los envíe.

### 14.1 Fundamentos absolutos

Para cada práctica de fundamentos, la batería debe permitir validar: direccionamiento, máscara, gateway, ARP, ping, traceroute, tabla MAC, puertos up/down y errores básicos de topología.

Escenarios representativos:
- 2 PCs y 1 switch en la misma red con IP estática.
- 3 PCs y 1 switch para observar ARP y flooding inicial.
- PC + switch + router + otra PC en otra red.
- Red con máscara correcta e incorrecta para comparar comportamiento.
- Gateway correcto vs gateway incorrecto.
- Host con IP duplicada.
- Host con DNS correcto e incorrecto.
- Pruebas de `ping`, `tracert/traceroute`, `ipconfig` y `arp -a`.
- Capa física: puerto down/down, administratively down y cable desconectado.
- Tabla MAC del switch y aprendizaje por puerto.
- Loop lógico pequeño para justificar STP.
- VLSM para varias LANs pequeñas.

### 14.2 Switching capa 2

Escenarios representativos:
- VLAN 10 y VLAN 20 en un solo switch.
- VLANs extendidas entre dos switches.
- Trunk 802.1Q entre switches.
- Native VLAN distinta de la predeterminada.
- Allowed VLANs restringidas.
- DTP dinámico y modos de trunk.
- Error por mismatch trunk/access.
- Error por native VLAN mismatch.
- VLAN de administración separada.
- Voz + datos en puerto de acceso.
- SVI de management en switch.
- VLAN por departamentos: TI, Ventas, RRHH, Invitados.
- VLAN de servidores separada de usuarios.
- VLAN de impresoras.
- Troubleshooting de una sola VLAN caída.

### 14.3 STP y redundancia

Escenarios representativos:
- Tres switches formando un triángulo con STP.
- Elección manual de root bridge por prioridad.
- Root secundario preparado para failover.
- PortFast en puertos de usuario.
- BPDU Guard en puertos de acceso.
- Reconvergencia al caer un enlace activo.
- Loop intencional y corrección.
- Diseño de campus pequeño con redundancia L2.

### 14.4 EtherChannel

Escenarios representativos:
- EtherChannel LACP entre dos switches.
- EtherChannel PAgP entre dos switches.
- EtherChannel troncal transportando varias VLANs.
- EtherChannel en capa 2 y capa 3.
- Comparación LACP vs PAgP.
- Mismatch de trunk/access en un miembro del canal.
- Allowed VLANs diferentes entre miembros.
- Un puerto miembro administratively down.
- STP viendo el Port-Channel como enlace lógico.

### 14.5 Inter-VLAN y switching capa 3

Escenarios representativos:
- Router-on-a-stick para 2, 3 o más VLANs.
- Subinterfaces con encapsulación 802.1Q.
- Error de encapsulación en una subinterfaz.
- Switch capa 3 con SVIs y `ip routing`.
- Migración de router-on-a-stick a MLS.
- Inter-VLAN con una VLAN caída para troubleshooting.
- VLAN de management separada.

### 14.6 Routing IPv4 e IPv6

Escenarios representativos:
- Rutas estáticas simples y default route.
- Rutas estáticas flotantes.
- OSPF single-area.
- OSPF multiárea básico.
- Route summary y troubleshooting de next-hop y wildcard.
- Dual stack.
- SLAAC.
- Stateless DHCPv6.
- Stateful DHCPv6.
- DHCPv6 relay.
- OSPFv3 básico.

### 14.7 DHCP y relay

Escenarios representativos:
- Router como servidor DHCP para una LAN.
- DHCP con excluded addresses.
- DHCP por VLAN con router-on-a-stick.
- DHCP relay hacia servidor central.
- Pools separados por VLAN.
- DHCP centralizado para varias VLANs y sucursales.
- Troubleshooting de pools, gateway y máscara incorrecta.

### 14.8 Servicios de servidor

Escenarios representativos:
- DNS local con A records.
- Web interna por nombre.
- FTP y TFTP.
- Mail/SMTP/POP3.
- NTP centralizado.
- Syslog centralizado.
- SNMP conceptual/operacional básico.
- Servidor combinado DNS + DHCP.
- Data center pequeño con múltiples servicios.

### 14.9 ACL, NAT y borde

Escenarios representativos:
- ACL estándar y extendida.
- ACL aplicada inbound/outbound.
- ACL para bloquear web o permitir solo TI.
- ACL para proteger VTY/SSH.
- NAT estático, dinámico y PAT.
- NAT overload con varias VLANs.
- NAT + ACL.
- Publicación de servidor interno hacia Internet simulada.

### 14.10 HSRP y alta disponibilidad

Escenarios representativos:
- HSRP básico con dos routers.
- Active/standby con prioridad y preempt.
- Failover y retorno del activo.
- HSRP por VLAN.
- HSRP junto con DHCP por VLAN y NAT.

### 14.11 Seguridad y acceso remoto

Escenarios representativos:
- Contraseñas locales y `enable secret`.
- SSH en router y switch.
- VTY solo SSH.
- Telnet deshabilitado.
- AAA básico.
- Hardening de management VLAN.
- Port security por sticky MAC.
- Violaciones shutdown/restrict/protect.

### 14.12 Wireless, IoT y automatización

Escenarios representativos:
- Wireless router doméstico con DHCP.
- WLAN corporativa con SSID e invitados.
- WPA2-PSK y WPA2-Enterprise.
- AP/WLC básico en Packet Tracer.
- Dispositivos IoT conectados a registration server.
- Casa inteligente / smart office.
- Automatización conceptual de cambios repetitivos.
- Baseline config por rol y sitio.

### 14.13 Observabilidad y administración

Escenarios representativos:
- NTP cliente-servidor.
- Syslog con timestamps.
- SNMP de monitoreo.
- Logs centralizados de varios equipos.
- Verificación de cambios y correlación de hora con eventos.

### 14.14 Troubleshooting total

Cada escenario importante debe tener su variante rota intencional:
- IP duplicada.
- gateway incorrecto.
- máscara incorrecta.
- VLAN equivocada.
- trunk mal configurado.
- EtherChannel que no forma.
- OSPF sin vecindad.
- DHCP relay ausente.
- NAT sin inside/outside.
- ACL demasiado restrictiva.
- SSH roto por VTY o credenciales.
- HSRP sin takeover esperado.
- Wireless con clave incorrecta.
- IoT sin registro.

Esta capa de troubleshooting se considera parte del mapa serio de práctica y no un apéndice opcional.

---

## 15. Parte 2: Escenarios 39 al 76

> Esta sección consolida la segunda tanda de laboratorios reales aportada por el usuario. Mantiene el mismo criterio de evaluación: objetivo, topología, validación, criterio de corrección y fallo intencional de troubleshooting.

### 15.1 DHCP avanzado

| ID | Caso | Enfoque | Resultado esperado |
|---|---|---|---|
| TC-039 | DHCP por VLAN usando switch capa 3 | SVIs + `ip routing` + pools por VLAN | Cada VLAN recibe IP de su pool y enruta entre VLANs |
| TC-040 | DHCP centralizado para varias VLANs con relay | helper/relay hacia servidor central | Las VLANs remotas reciben leases correctos |
| TC-041 | DHCP con DNS entregado al cliente | DHCP + DNS + validación por nombre | El cliente navega por nombre sin config manual |
| TC-042 | DHCP con exclusiones correctas | Excluded addresses para infraestructura | Ningún cliente toma IP reservada |
| TC-043 | DHCP mal entregando gateway | `default-router` erróneo | El cliente obtiene IP pero no tiene salida correcta |
| TC-044 | DHCP con máscara incorrecta | Máscara del pool equivocada | El lease es válido pero la red queda lógicamente mal |
| TC-045 | DHCP agotado por rango pequeño | Pool insuficiente para la cantidad de clientes | Algunos clientes quedan sin lease o con APIPA |
| TC-046 | DHCP por VLAN con un puerto en VLAN equivocada | Puerto mal asignado | El cliente recibe IP del pool incorrecto y el fallo se diagnostica por puerto |

### 15.2 ACLs IPv4

| ID | Caso | Enfoque | Resultado esperado |
|---|---|---|---|
| TC-047 | ACL estándar bloqueando una red origen | Control por origen | Una red no llega a la otra según política |
| TC-048 | ACL estándar permitiendo solo TI a la administración | Restricción administrativa | TI entra, usuarios normales no |
| TC-049 | ACL extendida bloqueando HTTP | Filtrado por protocolo/destino | Ping sí, HTTP no |
| TC-050 | ACL extendida bloqueando FTP y permitiendo web | Separación de aplicaciones | Web sí, FTP no |
| TC-051 | ACL inbound vs outbound | Comparación de dirección de aplicación | La política funciona donde se aplique correctamente |
| TC-052 | ACL para proteger VTY | Acceso remoto restringido | Solo una red autorizada entra por SSH/Telnet según política |
| TC-053 | ACL entre VLANs en router-on-a-stick | Política interna entre VLANs | Usuarios alcanzan algunos servicios pero no otros |
| TC-054 | ACL de invitados | Aislamiento de guest network | Invitados navegan fuera, no entran a la red corporativa |
| TC-055 | ACL con deny implícito mal entendido | Regla incompleta | Solo se bloquea lo deseado si el resto está permitido explícitamente |
| TC-056 | ACL de troubleshooting puro | Diagnóstico de red rota por ACL | Se identifica regla, interfaz y dirección que rompen el tráfico |

### 15.3 NAT y PAT

| ID | Caso | Enfoque | Resultado esperado |
|---|---|---|---|
| TC-057 | PAT básico para una oficina | Overload con una IP pública | Todos los hosts salen a la red externa |
| TC-058 | NAT estático para servidor web | Publicación de servidor interno | La PC externa abre la web pública y llega al servidor |
| TC-059 | NAT estático + PAT simultáneos | Borde mixto realista | Usuarios salen y el servidor entra desde afuera |
| TC-060 | NAT dinámico con pool | Pool de direcciones públicas | Los clientes usan IPs del pool correctamente |
| TC-061 | NAT con ACL incorrecta | Selección de tráfico errónea | Solo algunas redes se traducen |
| TC-062 | NAT con inside/outside invertidos | Error de roles de interfaz | No hay traducciones correctas hasta corregir el lado inside/outside |
| TC-063 | NAT con DNS y servidor publicado | DNS público + NAT estático | El usuario externo entra por nombre |
| TC-064 | PAT para varias VLANs internas | Varias subredes detrás del borde | Todas las VLANs salen a Internet |
| TC-065 | NAT + ACL perimetral | Traducción + filtrado | Solo el servicio publicado entra |
| TC-066 | NAT de diagnóstico completo | Borde roto a corregir | Se identifica ruta, ACL, inside/outside y mapeos erróneos |

### 15.4 SSH y hardening

| ID | Caso | Enfoque | Resultado esperado |
|---|---|---|---|
| TC-067 | SSH básico en un router | Acceso remoto seguro | SSH exitoso desde la PC admin |
| TC-068 | SSH en switch de acceso | Management por SVI | SSH al switch funcional |
| TC-069 | Solo SSH, sin Telnet | Endurecimiento VTY | SSH sí, Telnet no |
| TC-070 | Hardening básico de router | Passwords, banner, usuario, SSH | Acceso seguro y configuración consistente |
| TC-071 | Hardening básico de switch | Management VLAN + SSH | Acceso administrativo seguro en capa 2 |
| TC-072 | Acceso administrativo solo desde TI | ACL sobre VTY | TI entra por SSH, usuarios normales no |

### 15.5 HSRP

| ID | Caso | Enfoque | Resultado esperado |
|---|---|---|---|
| TC-073 | HSRP básico con dos routers | Gateway redundante | Los hosts usan la IP virtual como gateway |
| TC-074 | HSRP con `preempt` | Retomar rol activo al volver | El router preferido recupera el rol activo |
| TC-075 | HSRP con fallo del activo | Continuidad operativa | El standby toma el rol y mantiene la salida |
| TC-076 | HSRP + diagnóstico de gateway redundante | Lab roto a corregir | Se detectan grupo, prioridad, preempt y gateway incorrectos |

### 15.6 WLAN (puente para la parte siguiente)

Esta tanda deja preparado el bloque inalámbrico para seguir ampliando luego con mayor profundidad:
- wireless router doméstico con DHCP,
- laptop conectada por Wi-Fi,
- WPA2-Personal,
- invitados vs corporativo,
- WLAN + DHCP + DNS + web,
- troubleshooting de autenticación e IP.

### 15.7 Criterio de cierre de la Parte 2

Cada uno de estos escenarios debe poder registrarse con:
- topología usada,
- direccionamiento,
- configuración esperada,
- pruebas de verificación,
- resultado final,
- y variante rota para troubleshooting.

La Parte 2 queda incorporada al mapa maestro y se mantiene lista para recibir la siguiente tanda sin perder trazabilidad.
