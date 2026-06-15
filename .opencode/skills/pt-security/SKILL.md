---
name: pt-security
description: |
  Especialista en Seguridad de Red y Hardening en Cisco Packet Tracer.
  Cubre ACLs, SSH, Port-Security, NAT y Firewalls.
---

# pt-security — Experto en Seguridad y Hardening

Esta skill proporciona pautas para asegurar la infraestructura de red y controlar el acceso.

## Flujos de Trabajo de Seguridad

### 1. Hardening de Dispositivo (IOS)
- [ ] Contraseña de Enable: `enable secret <pass>`
- [ ] SSH (reemplaza Telnet): `ip domain-name <dominio>`, `crypto key generate rsa`, `line vty 0 4` -> `transport input ssh`.
- [ ] Banner de advertencia: `banner motd #ACCESO RESTRINGIDO#`

### 2. Listas de Control de Acceso (ACL)
- [ ] ACL Estándar (Cerca del destino): `access-list <1-99> permit/deny <IP>`
- [ ] ACL Extendida (Cerca del origen): `ip access-list extended <NOMBRE>`
- [ ] **Validación**: `bun run pt cmd <RT> "show access-lists"` y pruebas de tráfico.

### 3. Port-Security (Seguridad de Puerto)
- [ ] Activar: `switchport port-security`
- [ ] Limitar MACs: `switchport port-security maximum <N>`
- [ ] Acción ante violación: `switchport port-security violation shutdown`
- [ ] **Validación**: `bun run pt cmd <SW> "show port-security interface <INT>"`

### 4. NAT/PAT (Network Address Translation)
- [ ] Definir interfaces: `ip nat inside` / `ip nat outside`
- [ ] Configurar Overload: `ip nat inside source list <ACL> interface <OUT_INT> overload`
- [ ] **Validación**: `bun run pt verify nat <RT>`

### 5. Auditoría de Seguridad
- [ ] **Escaneo de Vulnerabilidades**: `bun run pt inspect audit`
- [ ] **Hardening SNMP**: Eliminar comunidades `public` y `private`.
- [ ] **Service Encryption**: Activar `service password-encryption`.

## Mejores Prácticas de Seguridad
- Nunca uses contraseñas por defecto (`cisco/cisco`).
- Deshabilita servicios innecesarios (`no ip http server`).
- Aplica ACLs con lógica de "mínimo privilegio".
- Monitoriza los intentos de acceso en los logs: `bun run pt logs`.
