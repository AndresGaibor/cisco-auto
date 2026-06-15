---
name: pt-troubleshooting
description: |
  Especialista en Diagnóstico de Fallas (Troubleshooting) en Packet Tracer.
  Implementa una metodología basada en el modelo OSI.
---

# pt-troubleshooting — Experto en Resolución de Fallas

Esta skill guía al agente a través de un diagnóstico sistémico para identificar el punto exacto de falla.

## Flujo de Diagnóstico Proactivo

Antes de empezar, ejecuta la auditoría automática:
1. `bun run pt inspect audit`: Busca conflictos de IP, Hostnames duplicados, VLAN mismatch, comunidades SNMP inseguras o errores de Layer 2.
2. `bun run pt inspect topology`: Revisa el direccionamiento, estado de puertos y modo STP de toda la red.

## Metodología OSI (Bottom-Up)

### Capa 1: Capa Física
- ¿Están los cables conectados? `bun run pt link list`
- ¿Están las interfaces encendidas? `bun run pt cmd <device> "show ip interface brief"`
- ¿Hay cables cruzados/directos correctos? `bun run pt link doctor <A> <B>`

### Capa 2: Enlace de Datos
- ¿Coinciden las VLANs en los puertos de acceso? `bun run pt cmd <SW> "show interfaces switchport"`
- ¿Están los Trunks permitiendo las VLANs correctas? `bun run pt cmd <SW> "show interfaces trunk"`
- ¿Hay bloqueos por STP? `bun run pt verify stp <SW>`
- ¿Se ven los vecinos? `bun run pt verify cdp <device>`

### Capa 3: Red
- ¿Tienen los hosts la IP correcta? `bun run pt verify dhcp <HOST>` o `ipconfig`
- ¿El Default Gateway es alcanzable? `bun run pt verify ping <HOST> <GW>`
- ¿Está HSRP estable? `bun run pt verify hsrp <RT>`
- ¿La tabla de rutas tiene el destino? `bun run pt verify routing <RT> <RED_DESTINO>`
- ¿OSPF ha formado adyacencias? `bun run pt verify ospf <RT>`

### Capa 4 a 7: Aplicación y Seguridad
- ¿Hay ACLs bloqueando el tráfico? `bun run pt cmd <RT> "show access-lists"`
- ¿Está NAT funcionando correctamente? `bun run pt verify nat <RT>`
- ¿El servicio (HTTP/DNS) está habilitado en el servidor? `bun run pt omni inspect env`

## Comandos de Diagnóstico Rápido

```bash
# Diagnóstico general del entorno
bun run pt doctor

# Auditoría de mejores prácticas (detecta errores de diseño)
bun run pt inspect audit

# Forense profundo del dispositivo
bun run pt omni device genome <device>

# Ver trazas de errores en el bridge
bun run pt runtime logs --errors
```

## Reglas de Oro
1. Nunca asumas. Valida cada capa antes de pasar a la siguiente.
2. Si cambias algo, vuelve a verificar desde el inicio del flujo afectado.
3. Usa `--json` para que el análisis de la evidencia sea preciso.
