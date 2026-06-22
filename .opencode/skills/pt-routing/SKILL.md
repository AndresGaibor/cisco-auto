---
name: pt-routing
description: |
  Especialista en Routing de Capa 3 para Cisco Packet Tracer.
  Cubre OSPF, EIGRP, Rutas Estáticas, Inter-VLAN routing y DHCP.
---

# pt-routing — Experto en Enrutamiento L3

Esta skill proporciona flujos de trabajo expertos para la conectividad entre subredes y protocolos de enrutamiento dinámico.

## Flujos de Trabajo

### 1. Enrutamiento Estático
- [ ] Configurar ruta: `ip route <red> <mask> <next-hop|exit-int>`
- [ ] **Validación**: `bun run pt verify routing <RT> <red>`

### 2. OSPF (Open Shortest Path First)
- [ ] Iniciar proceso: `router ospf <ID>`
- [ ] Anunciar redes: `network <red> <wildcard> area <area>`
- [ ] **Validación**: `bun run pt verify ospf <RT>`
- [ ] **Rutas aprendidas**: `bun run pt cmd <RT> "show ip route ospf"`

### 3. Inter-VLAN Routing (Router-on-a-Stick)
- [ ] Crear subinterfaz: `interface <INT>.<VLAN>`
- [ ] Encapsulación: `encapsulation dot1Q <VLAN>`
- [ ] IP: `ip address <IP> <mask>`
- [ ] **Validación**: `bun run pt verify ping <RT> <IP_GATEWAY>`

### 4. DHCP (Servidor y Relay)
- [ ] Configurar Pool: `ip dhcp pool <NOMBRE>`, `network <RED>`, `default-router <GW>`
- [ ] Configurar Relay: `interface <INT>`, `ip helper-address <IP_SERVER>`
- [ ] **Validación**: `bun run pt verify dhcp <HOST>`

### 5. Redundancia de Gateway (HSRP)
- [ ] Configurar VIP: `standby <G> ip <VIP>`, `standby <G> priority <P>`, `standby <G> preempt`
- [ ] **Validación**: `bun run pt verify hsrp <RT> <G>`

### 6. IPv6 (SLAAC y DHCPv6)
- [ ] Habilitar Routing: `ipv6 unicast-routing`
- [ ] Configurar IP: `ipv6 address <IP/64>` o `ipv6 address autoconfig`
- [ ] **Validación**: `bun run pt verify ipv6 <RT>`

## Encadenar comandos con ;

Puedes pasar múltiples comandos separados por `;` en un solo `pt cmd`:
```bash
bun run pt cmd R1 "show ip interface brief ; show ip route ; show ip ospf neighbor"
bun run pt cmd R1 "show running-config | section ospf ; show ip protocols"
bun run pt cmd R1 "ping 192.168.1.1 ; traceroute 192.168.2.1"
```
El backend los ejecuta secuencialmente en un mismo plan terminal, reduciendo latencia.

## Diagnóstico L3 Experto

Si el ping falla entre subredes:
1. Verifica la tabla de rutas en ambos extremos: `bun run pt verify routing <RT>`.
2. Verifica que las interfaces estén UP/UP: `bun run pt cmd <RT> "show ip interface brief"`.
3. Valida el Default Gateway en los hosts: `bun run pt cmd <HOST> "ipconfig"`.
4. Si usas OSPF, valida adyacencias: `bun run pt verify ospf <RT>`.

## Mejores Prácticas
- Usa `passive-interface` en interfaces hacia los hosts.
- Resume rutas cuando sea posible para optimizar la tabla de enrutamiento.
- Prefiere OSPF sobre EIGRP para interoperabilidad.
