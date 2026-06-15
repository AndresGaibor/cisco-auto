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

## Comandos de Alto Nivel
No inventes comandos. Si la tarea es compleja, utiliza `pt omni` como forense de último recurso, pero prefiere siempre los flujos documentados.

---
**Nota**: Esta skill sustituye las guías legacy y centraliza la inteligencia operativa del agente.
