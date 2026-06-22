---
name: pt-cli
description: |
  Skill maestra y orquestadora de redes para Cisco Packet Tracer.
  Actúa como un arquitecto senior que delega a especialistas.
---

# pt-cli — Arquitecto de Redes Experto (Hub)

Esta skill es el punto de entrada principal para cualquier tarea de redes. Como experto, tu objetivo es diseñar, implementar y validar soluciones robustas siguiendo las mejores prácticas de Cisco.

## Mentalidad del Experto
1. **Diseño antes que Implementación**: Define direccionamiento y VLANs antes de tocar la CLI.
2. **Validación Continua**: Cada cambio de configuración requiere un comando `verify` asociado.
3. **Delegación Inteligente**: Para tareas específicas, consulta las sub-skills especializadas.

## Mapa de Especialidades

Para una ejecución experta, invoca la skill correspondiente:

| Especialidad | Cuándo usarla |
|---|---|
| **`pt-switching`** | VLANs, Trunks, STP, EtherChannel, Capa 2. |
| **`pt-routing`** | OSPF, Rutas Estáticas, Routing Inter-VLAN, DHCP, Capa 3. |
| **`pt-security`** | ACLs, SSH, Port-Security, NAT, Hardening. |
| **`pt-troubleshooting`** | Fallas de conectividad, diagnósticos complejos, modelo OSI. |

## Flujo Experto de Trabajo

1. **Reconocimiento y Auditoría**
   - `bun run pt doctor --json` para salud del sistema.
   - `bun run pt inspect topology --json` para la topología física.
   - `bun run pt inspect audit` para detectar errores de diseño proactivamente.

2. **Implementación por Capas**
   - **Capa 2**: VLANs, Trunks y EtherChannel.
   - **Capa 3**: Direccionamiento y Routing Dinámico.
   - **Servicios**: DHCP, ACLs y Hardening.

3. **Verificación Estricta**
   Cada cambio debe ser validado con su contraparte experta:
   - `pt verify vlan` -> `pt verify stp`
   - `pt verify ospf` -> `pt verify routing`
   - `pt set host` -> `pt verify dhcp`
   - Redundancia L3 -> `pt verify hsrp`
   - Acceso Internet -> `pt verify nat`
   - Topología L2 -> `pt verify cdp`
   - Next-Gen -> `pt verify ipv6`
   - Mobility -> `pt verify wlc`

4. **Persistencia**
   - Siempre guarda la configuración después de configurar un dispositivo: `bun run pt save <device>` o `bun run pt save --all`.

## Encadenar comandos IOS con ;

El comando `pt cmd` soporta el separador `;` para ejecutar múltiples comandos en un solo plan terminal:

```bash
# Múltiples show en un solo call
bun run pt cmd R1 "show version ; show ip interface brief ; show ip route"

# Configuración secuencial
bun run pt cmd R1 "interface g0/0 ; ip address 192.168.1.1 255.255.255.0 ; no shutdown"

# Diagnóstico completo de capa 2
bun run pt cmd SW1 "show vlan brief ; show interfaces trunk ; show spanning-tree summary"
```

El backend (`splitCommandLines`) divide por `;` y construye un plan con múltiples pasos. Esto reduce latencia drásticamente vs. ejecutar comandos uno por uno.

## Lectura IOS explícita

Cuando sólo necesitas leer estado IOS y quieres evitar errores del preámbulo de paginador, usa `pt cmd read`:

```bash
bun run pt cmd read R1 "show running-config"
bun run pt cmd read SW1 "show ip route"
```

Reglas:
- Úsalo para lecturas IOS, no para cambios.
- El orden importa: primero `read`, luego el dispositivo y luego el comando.
- `pt cmd R1 read` no es válido; `read` no va como comando final.
- `pt cmd read` sin dispositivo/comando falla con un mensaje de uso claro.
- No lo fuerces a `raw`; eso puede dejarte en `R2>` y romper `show running-config`.
- Si `pt cmd` falla por `terminal length 0` con `Invalid input`, el flujo correcto es `pt cmd read` o el retry automático del executor.

## Configuración de hosts

Cuando configures IP/DHCP en PCs o servers con `pt set host`, ten en cuenta:

- La mutación puede tardar más de lo esperado y devolver `HOST_CONFIG_FAILED` por timeout aunque la configuración sí haya quedado aplicada.
- Si eso ocurre, reintenta el mismo comando una vez antes de cambiar de estrategia.
- La verificación de verdad es `pt inspect topology --json` o `pt cmd <host> "ipconfig"`, no sólo el resultado del mutador.
- `pt inspect topology` es la referencia canónica para confirmar si la topología y las IPs visibles quedaron sincronizadas.

## Limitación conocida: CME / telefonía IP

En algunos laboratorios de Packet Tracer, `telephony-service` puede colgar o terminar en `IOS_EXEC_FAILED` aunque el lab esté abierto y el resto de IOS siga respondiendo.

Reglas para no perder tiempo:
- Primero confirma el archivo activo con `pt project status --json` y el estado de la app con `pt app status --json`.
- Si `show running-config | section telephony-service` o `show ephone` fallan de forma repetida, no sigas insistiendo con `pt cmd`.
- Mantén la configuración de datos/voz en switch y DHCP por CLI sólo si ya responde.
- Para cerrar telefonía, guía al usuario a terminarlo en la GUI del laboratorio de Packet Tracer y valida desde las ventanas de los teléfonos/IP Phone y del router.
- Documenta explícitamente cuando la validación de CME dependa de GUI para que el siguiente agente no reintente el mismo bloqueo.

## Comandos de Alto Nivel
No inventes comandos. Si la tarea es compleja, utiliza `pt omni` como forense de último recurso, pero prefiere siempre los flujos documentados. Para lectura IOS, prioriza `pt cmd read` antes que hacks con `raw`.

---
**Nota**: Esta skill sustituye las guías legacy y centraliza la inteligencia operativa del agente.
