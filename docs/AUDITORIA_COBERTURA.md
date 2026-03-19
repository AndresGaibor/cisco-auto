# Auditoría de Cobertura: cisco-auto vs Packet Tracer

> Análisis técnico detallado del estado actual del proyecto y su cobertura real de funcionalidades de Cisco Packet Tracer.

## Veredicto General

El proyecto **sí tiene base real y valiosa**, pero **no cubre ni cerca de "todo Packet Tracer"** todavía.

Hoy, `cisco-auto` es la mezcla de **tres productos**:

1. Un **parser/generador declarativo YAML → IOS**
2. Un **editor de laboratorios** con entidades de dominio
3. Un **motor experimental de edición de PKA/XML**

Eso lo hace prometedor, pero también genera la principal debilidad actual: **no tienes un solo modelo canónico del laboratorio**. Por eso varias cosas "parecen soportadas" en README, pero no lo están de forma consistente en todo el sistema.

Además, el README promete despliegue por **SSH/Telnet**, multitarea, **BGP**, **VPN IPsec**, **STP** y **EtherChannel**, pero el código muestra que:
- `deploy` sigue siendo un stub
- Los protocolos modelados explícitamente son **OSPF, EIGRP y VTP**
- La seguridad implementada explícitamente es **ACL/NAT**

---

## Qué partes de Packet Tracer deberías considerar si la meta es "automatizar todo"

### 1. Catálogo de dispositivos

Familias principales que importan para automatización:

| Categoría | Dispositivos |
|-----------|-------------|
| **Infraestructura de red** | routers, switches L2, switches multicapa, hubs, access points, wireless routers, firewalls, cloud, modems |
| **End devices** | PC, laptop, server, printer, IP phone, clientes móviles |
| **Wireless** | APs, routers inalámbricos, clientes Wi-Fi |
| **Servicios** | Server-PT con DNS, DHCP, HTTP, FTP, Email, etc. |
| **IoT / Embedded** | sensores, actuadores, home gateway, MCU/SBC, dispositivos inteligentes |
| **Assessment/Activity** | actividades `.pka`, instrucciones, scoring, validación |
| **Workspace físico** | ciudades, edificios, wiring closets, racks |
| **Simulation** | PDUs, event list, filtros, capture/forward, inspección por capas |

### 2. Funcionalidades de red

- Cableado y tipos de enlace
- Módulos/slots/puertos
- Configuración por CLI / Config tab / Desktop apps
- VLAN, trunk, VTP, STP, EtherChannel, port-security
- Rutas estáticas, OSPF, EIGRP, RIP, BGP, IPv6
- ACL, NAT, firewall, VPN
- DHCP, DNS, HTTP, FTP, Email, NTP, etc.
- Wi-Fi: SSID, seguridad, asociación
- Validación de conectividad real
- Simulación y troubleshooting
- Edición de actividades `.pka`
- Importación/exportación de `.pkt` y `.pka`

---

## Estado Actual de Cobertura

### ✅ Sí cubre, pero de forma parcial

| Funcionalidad | Archivos/Implementación |
|---------------|------------------------|
| CLI real con varios comandos | `parse`, `config`, `validate`, `devices`, `deploy`, `parse-pka`, `mod-test`, modo interactivo |
| Definición declarativa en YAML | Labs y generación de IOS básica |
| L2 básico | VLANs, trunks, VTP, puertos access en generador YAML/IOS |
| L3 básico | Estático, OSPF y EIGRP en el generador |
| Seguridad básica | ACL y NAT en el generador |
| Parseo/importación PKA | Vía `pka2xml` externo, con fallback interno experimental |
| Edición programática XML PKA | PC, Switch, Router, Server, WirelessRouter, Activity |

### ❌ Muy incompleto o no implementado

| Funcionalidad | Estado |
|---------------|--------|
| Despliegue real por SSH/Telnet | Stub, no implementado |
| Paralelismo real de despliegue | No implementado |
| Validación real por ping/estado de interfaces | No implementado |
| BGP | No implementado |
| VPN IPsec | No implementado |
| STP | No implementado |
| EtherChannel | No implementado |
| IoT | No implementado |
| Teléfonos/IP phones | No implementado |
| Laptops/móviles/tablets | No implementado |
| Simulation mode | No implementado |
| Physical workspace | No implementado |
| Multiuser | No implementado |
| `.pkt` como flujo de trabajo | No implementado |
| Catálogo real por modelo de PT | No implementado |

---

## El Problema Central: Falta de Unificación de Modelo

### Tres stacks incompatibles

```
┌─────────────────────────────────────────────────────────────┐
│ Comandos parse/config/validate/devices                      │
│ → core/types + yaml-parser                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓ ¿No conectado con?
┌─────────────────────────────────────────────────────────────┐
│ Modo interactivo + shell commands                           │
│ → SessionManager + LabSessionService + YamlLabRepository    │
│ → core/domain                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ ¿No conectado con?
┌─────────────────────────────────────────────────────────────┐
│ Motor PKA                                                   │
│ → core/models/*                                             │
└─────────────────────────────────────────────────────────────┘
```

**Resultado:** Tienes un schema declarativo, un modelo de dominio y un modelo XML/PKA, pero **no están alineados**.

---

## Inconsistencias Concretas Encontradas

### 1. El README promete más de lo que el código implementa

El README habla de:
- SSH/Telnet directo
- Multitarea
- BGP, IPsec, STP, EtherChannel

Pero:
- `deploy` dice explícitamente que falta implementar el módulo SSH
- No hay implementación real de despliegue
- No hay schema/generador de BGP ni de IPsec
- Sólo hay OSPF/EIGRP/VTP y ACL/NAT

### 2. Catálogo de dispositivos demasiado pequeño

El schema y la entidad de dominio sólo reconocen **11 tipos**:
- router, switch, multilayer-switch, pc, server, access-point, firewall, cloud, modem, printer, wireless-router

**Deja fuera:**
- laptop
- hub
- IP phone
- tablet / smartphone
- home gateway / IoT gateway
- sensores y actuadores IoT
- MCU/SBC
- dispositivos multimedia

### 3. Tipos desconocidos se degradan mal

```typescript
// PKAtoYAML.mapDeviceType() → manda a 'router' por defecto
// Network.initDevices() → manda a 'PC' por defecto
```

**Riesgo:** Un dispositivo no soportado no debería "adivinarse". Debería quedar como `unknown` o `unsupported`.

### 4. Dos formatos de conexión incompatibles

**Schema "nuevo"** (`labs/vlan-basico.yaml`, `core/types/lab.ts`):
```yaml
connections:
  - fromInterface: Fa0/1
    toInterface: Fa0/1
    type: straight-through
```

**YamlLabRepository espera:**
```yaml
connections:
  - fromPort: Fa0/1
    toPort: Fa0/1
    cable: straight-through
```

**Impacto:** El mismo lab no funciona igual en `parse/config/validate` vs `interactive` vs `session service`.

### 5. El modo interactivo dice YAML/PKA, pero sólo carga YAML

`createInteractiveCommand()` dice recibir "Archivo YAML/PKA", pero `SessionManager.loadFile()` usa `YamlLabRepository` que está hecho para YAML, no para PKA.

### 6. El round-trip pierde información

`DeviceSchema` soporta campos ricos:
- management, credentials, ssh/telnet, VLANs, routing, ACLs, NAT, lines, etc.

Pero `YamlLabRepository.serializeDevice()` sólo persiste:
- nombre, tipo, modelo, hostname, management, interfaces, ports

**Se pierde:**
- credentials, ssh, telnet, vlans, vtp, routing, acls, nat, lines, etc.

---

## Bugs Técnicos Encontrados

### a) `PortType.ETHERNET` no existe

En `port.vo.ts` el enum no define `ETHERNET`, pero `parsePortName()` lo usa en el caso por defecto.

```typescript
// Revisar con tsconfig.json strict: true
```

### b) Validación con tipos inconsistentes

En `DomainValidationService`:
- Compara contra `hub`, aunque `hub` no está en `DeviceType` del dominio
- Usa `type: 'configuration'` en warnings, aunque `ValidationWarning` no lo declara

### c) No puedes crear interfaz nueva con IP en un solo paso

`configureInterface()` valida la IP llamando a `validateIpConfiguration()` **antes** de decidir si la interfaz existe o debe agregarse. Pero `validateIpConfiguration()` falla si la interfaz no existe.

**Problema de diseño:** La operación "crear interfaz + ponerle IP" queda mal diseñada.

### d) Puertos por defecto del switch arrancan en `Fa0/0`

`YamlLabRepository.getDefaultPorts()` para switches genera `FastEthernet0/0` hasta `FastEthernet0/23`.

En Packet Tracer, los 2960 normalmente son `Fa0/1` a `Fa0/24`. Ese desfase rompe validaciones y sugerencias.

---

## Cobertura Real por Área

### ✅ Cobertura Buena

- YAML declarativo básico
- Generación IOS para VLAN/VTP/interfaces/OSPF/EIGRP/ACL/NAT
- Parseo PKA con ayuda externa
- Modificación XML de algunos dispositivos
- Edición básica de instrucciones de actividad

### ⚠️ Cobertura Parcial

| Área | Estado |
|------|--------|
| routers | Implementado pero sin catálogo sólido por modelo |
| switches | Implementado pero sin catálogo sólido por modelo |
| PCs | Implementado |
| servers | Implementado |
| wireless router | Implementado |
| access point | Nivel declarativo, sin catálogo por modelo |
| servicios DNS/HTTP/FTP/Email | En motor XML, no unificado en dominio |
| wireless | Muy básico |

### ❌ Cobertura Ausente

- hubs
- laptops y clientes móviles
- IP phones / voz
- firewall real por capacidades
- IoT completo
- módulos/slots por modelo real
- STP
- EtherChannel
- BGP
- RIP
- IPsec
- DHCP server declarativo completo
- simulation mode
- physical workspace
- multiuser
- PDUs
- scoring/assessment fuerte
- despliegue real a equipos
- validación real de estado

---

## Roadmap de Mejoras

### Prioridad 1: Unificar el modelo

Definir un solo modelo canónico:

```typescript
interface LabSpec {
  devices: Device[];
  links: Link[];
  services: Service[];
  protocols: Protocol[];
  assessment?: Assessment;
  wireless?: Wireless;
  activity?: Activity;
}
```

Y que **todo** use eso:
- YAML parser
- interactive/session
- PKA importer
- PKA exporter
- config generators
- deploy

### Prioridad 2: Crear catálogo de Packet Tracer

Necesitas un `device-catalog.ts/json` por versión de Packet Tracer con:

```typescript
interface DeviceCatalogEntry {
  family: string;
  model: string;
  ports: PortDefinition[];
  modules: ModuleDefinition[];
  capabilities: {
    supportsVlans: boolean;
    supportsRouting: boolean;
    supportsWireless: boolean;
    supportsDhcp: boolean;
    // ...
  };
  commands: string[];
  restrictions: string[];
}
```

Sin eso, nunca vas a automatizar "todo".

### Prioridad 3: Separar "intent" de "render"

Capas claras:

```
Intent → Canonical model → Renderer (YAML | IOS | PKA/XML) → Executor (SSH/Telnet) → Validator
```

### Prioridad 4: Declarar cobertura por módulo

```
devices/core      → routers, switches, hubs
devices/endpoints → pc, laptop, server, printer
devices/wireless  → ap, wireless-router
devices/iot       → sensores, actuadores
protocols/l2      → vlan, vtp, stp, etherchannel
protocols/l3      → static, ospf, eigrp, rip, bgp
security          → acl, nat, firewall, vpn
services          → dhcp, dns, http, ftp, email
activity          → pka, scoring
simulation        → pdus, events
physical          → workspace
deploy            → ssh, telnet
```

### Prioridad 5: Pruebas de round-trip

Tests necesarios:

- YAML → canonical → YAML (sin pérdida)
- PKA → canonical → PKA (sin pérdida)
- canonical → IOS (correcto)
- Same lab across all commands

---

## Recomendaciones Directas

1. **Arreglar la incompatibilidad entre schemas y repositorios** → Mayor bloqueo actual

2. **Bajar el README a lo que hoy es cierto** → Mejor honesto que ambicioso

3. **No usar defaults peligrosos** → `unknown` en lugar de `router`/`pc` por defecto

4. **Hacer un catálogo por modelos de PT** → Corazón del proyecto

5. **Convertir `deploy` en módulo real** o marcar como roadmap

6. **Hacer lossless round-trip** → No perder VLANs, ACLs, routing, credentials al guardar

7. **Añadir familias faltantes de alto valor:**
   - hub
   - laptop
   - firewall/ASA
   - IP phone
   - home gateway / wireless
   - server services
   - DHCP
   - RIP/BGP
   - STP/EtherChannel

---

## Conclusión

**No, el proyecto no cubre todo Packet Tracer.** Ni está cerca todavía.

Pero sí tiene una base muy buena para convertirse en algo más serio, porque ya tiene:
- CLI
- schemas
- generadores
- dominio
- parser PKA
- motor de mutación XML
- skill/IA alrededor

**El problema no es que esté mal; el problema es que todavía está partido en varias direcciones.**

El siguiente paso útil sería convertir este diagnóstico en un **backlog técnico priorizado**, con issues concretos y una arquitectura objetivo para llevar `cisco-auto` de "herramienta prometedora" a "plataforma seria de automatización de Packet Tracer".
