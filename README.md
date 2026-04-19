# 🚀 cisco-auto

**cisco-auto** es una potente y moderna herramienta de automatización diseñada para simplificar y acelerar la configuración, despliegue y validación de laboratorios y talleres de **Cisco Packet Tracer** y equipos reales. 

Diseñado especialmente para estudiantes de Redes de Computadores (con enfoque en ESPOCH), este proyecto busca reducir drásticamente el tiempo de configuración manual (de 45 a menos de 2 minutos), minimizar errores humanos y garantizar el cumplimiento de los estándares de topología mediante un enfoque declarativo.

**Arquitectura**: Plugin-First, Clean Architecture, Hexagonal (Ports & Adapters) y Domain-Driven Design (DDD).

[![Bun](https://img.shields.io/badge/Bun-1.1%2B-black?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏗️ Arquitectura

El proyecto utiliza una **arquitectura Plugin-First** basada en tres patrones fundamentales:

| Patrón | Aplicación |
|--------|-----------|
| **Clean Architecture** | Capas concéntricas: dominio → aplicación → infraestructura. Las dependencias apuntan hacia adentro. |
| **Hexagonal Architecture** | El dominio define puertos (interfaces), los adaptadores externos los implementan. |
| **Domain-Driven Design (DDD)** | Bounded contexts, aggregates, entities, value objects, domain events. |
| **Plugin-First** | Toda funcionalidad de protocolo es un plugin registrable. El backend (Packet Tracer) también es un plugin. |

### Principios de Diseño

1. **Plugin-First**: VLAN, Routing, Security, Services, Switching e IPv6 son plugins independientes. Agregar un nuevo protocolo solo requiere crear un plugin y registrarlo.
2. **Backend como Plugin**: Packet Tracer es un `BackendPlugin` intercambiable. Se pueden agregar backends alternativos (GNS3, EVE-NG, dispositivos reales).
3. **Dominio Puro**: El núcleo no tiene dependencias externas. Usa Value Objects, Entities y Aggregates con validación incorporada.
4. **Filesystem como IPC**: FileBridge usa el filesystem (`~/pt-dev/`) como medio de comunicación con Packet Tracer — sobrevive a reinicios y permite auditoría completa.

### Estructura del Proyecto (Monorepo)

```
cisco-auto/
├── apps/
│   └── pt-cli/                 # CLI principal (entry point)
│
├── packages/
│   ├── kernel/                 # ★ Núcleo: dominio, aplicación, plugins, backends
│   │   ├── src/domain/         #   Dominio (aggregates, entities, value objects)
│   │   ├── src/application/    #   Casos de uso (use cases, ports)
│   │   ├── src/plugin-api/     #   Interfaces de plugin (contratos)
│   │   ├── src/plugins/        #   Plugins de protocolo (8 plugins)
│   │   └── src/backends/       #   Backends (packet-tracer)
│   │
│   ├── types/                  # Tipos compartidos y schemas Zod
│   ├── core/                   # Lógica de negocio legacy (orquestadores, parsers)
│   ├── pt-control/             # Motor de control en tiempo real de Packet Tracer
│   ├── pt-runtime/             # Generador de runtime JS para Packet Tracer
│   ├── file-bridge/            # Puente de comunicación CLI ↔ Packet Tracer
│   └── ios-domain/             # Dominio IOS (generadores, parsers, schemas)
│
├── labs/                       # Definiciones de laboratorios YAML
├── configs/                    # Configuraciones generadas
└── docs/                       # Documentación técnica
```

---

## 🧩 Plugins Disponibles

El kernel incluye **8 plugins** listos para usar:

| Plugin | ID | Categoría | Descripción |
|--------|-----|-----------|-------------|
| **VLAN** | `vlan` | switching | Configuración de VLANs, trunks y puertos de acceso |
| **Routing** | `routing` | routing | OSPF, EIGRP, BGP y rutas estáticas |
| **Security** | `security` | security | ACLs, NAT (Static, Dynamic, Overload), VPN IPsec |
| **Services** | `services` | services | DHCP, DNS, NTP, Syslog, SNMP |
| **Switching** | `switching` | switching | STP (Rapid-PVST), EtherChannel (LACP/PAgP), Port Security |
| **IPv6** | `ipv6` | routing | Addressing, OSPFv3, EIGRP for IPv6, dual-stack |
| **Port Template** | `port-template` | switching | Plantillas de configuración de puertos |
| **Packet Tracer Backend** | `packet-tracer` | backend | Adaptador para Cisco Packet Tracer |

### Backend: Packet Tracer

El backend de Packet Tracer implementa las siguientes operaciones:

```typescript
interface BackendPort {
  connect(config): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  addDevice(name, model, options): Promise<void>;
  removeDevice(name): Promise<void>;
  configureDevice(name, commands): Promise<void>;
  execShow(name, command): Promise<string>;
  addLink(d1, p1, d2, p2): Promise<void>;
  removeLink(device, port): Promise<void>;
  getTopology(): Promise<Topology>;
}
```

---

## 📦 pt-runtime (Packet Tracer Runtime Generator)

Genera `main.js`, `runtime.js` y `catalog.js` — artefactos ES5 seguros para el motor de scripting QTScript de Packet Tracer 9.x.

### Build Commands

```bash
cd packages/pt-runtime

bun run generate         # Genera artefactos → dist-qtscript/
bun run validate         # Valida patrones PT-safe en los artefactos
bun run deploy           # Deploy a ~/pt-dev/ (copia main.js, runtime.js, catalog.js)
bun run build            # Alias para deploy (runtime built via deploy)
bun run build:watch      # Watch mode para rebuild automático
bun run typecheck        # Verificación TypeScript (solo lectura)
bun run validate:api     # Valida superficie PT API
bun run generate-models  # Regenera mapa de modelos verificados
```

### Deploy

Archivos desplegados a `~/pt-dev/` (macOS/Linux) o `%USERPROFILE%\pt-dev\` (Windows):

| Artefacto | Tamaño | Responsabilidad |
|---|---|---|
| `main.js` | ~45 KB | Kernel: queue, terminal lifecycle, job execution, hot-reload, heartbeat, lease, shutdown |
| `runtime.js` | ~15 KB | Negocio: dispatch, validation, plan building |
| `catalog.js` | ~2.5 KB | Constantes: device types, cable types, module catalog |

Para cargar en PT: **File → Open →** selecciona `~/pt-dev/main.js`

### PT-Safe Validation Rules

Build **falla** si el código generado contiene:

| Pattern | Forbidden Because |
|---|---|
| `import` / `export` | QTScript no soporta ES modules |
| `const` / `let` | Solo `var` soportado |
| Arrow functions (`=>`) | No ES5-compatible |
| `class` declarations | Usar prototype-based |
| `async` / `await` | No soportado |
| `?.` optional chaining | No ES5 |
| `` `${...}` `` template literals | Usar `"str" + var` |
| `globalThis` | No definido en QTScript |
| `console.*` | Usar `dprint()` |
| `require()` | No disponible en sandbox |

### Arquitectura

```
TypeScript source
      ↓
AST Collection (per manifest)
      ↓
AST Transform → ES5 (strip modules, const→var, minify)
      ↓
PT-Safe Validation (regex scan)
      ↓
Assembly (wrap IIFE, inject globals)
      ↓
dist-qtscript/ (main.js, runtime.js, catalog.js)
```

---

## ✨ Características Principales

- **🎮 Control en Tiempo Real de Packet Tracer**: CLI para controlar PT desde TypeScript/Bun sin dependencias externas.
- **⚙️ Despliegue Automático**: Configuración directa a dispositivos Cisco vía SSH/Telnet con ejecución paralela para máxima velocidad.
- **🏗️ Topologías Declarativas**: Define la arquitectura usando archivos **YAML** o **JSON** validados con Zod.
- **🔍 Análisis PKA/PKT**: Ingeniería inversa para decodificar archivos de Packet Tracer (XOR + Twofish CBC + zlib), extrayendo dispositivos y topologías.
- **🛠️ Protocolos Soportados**:
  - **L2 (Switching)**: VLANs, VTP, STP, EtherChannel (LACP/PAgP).
  - **L3 (Routing)**: OSPF (Single/Multi-área, Stub, NSSA), EIGRP, BGP.
  - **Seguridad y Servicios**: ACLs, NAT (Static, Dynamic, Overload), VPN IPsec, IPv6.
- **✅ Validación Automática**: Verificación post-despliegue de conectividad (ping), estado de interfaces, tablas de enrutamiento y vecinos.

---

## 🚀 Inicio Rápido

### Requisitos Previos

- [Bun](https://bun.sh/) (v1.1 o superior) instalado en tu sistema. *No uses Node.js/npm.*
- [Cisco Packet Tracer](https://www.netacad.com/courses/packet-tracer) (opcional, para visualización de labs).

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/AndresGaibor/cisco-auto.git
cd cisco-auto

# 2. Instalar dependencias con Bun
bun install

# 3. Verificar instalación
bun run cisco-auto --help
```

### Uso Básico con Plugins

```typescript
import { vlanPlugin, validateVlanConfig, generateVlanCommands } from '@cisco-auto/kernel/plugins/vlan';
import { getPacketTracerBackend } from './kernel-bridge';

// 1. Validar configuración
const validation = validateVlanConfig({
  switchName: 'SW1',
  vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }],
});

if (!validation.ok) {
  console.error('Errores:', validation.errors);
  process.exit(1);
}

// 2. Generar comandos IOS
const commands = generateVlanCommands({
  switchName: 'SW1',
  vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }],
});

// 3. Aplicar via backend
const backend = getPacketTracerBackend();
await backend.configureDevice('SW1', commands);
```

### Setup de Packet Tracer

```bash
# Setup inicial (solo una vez)
bash scripts/setup-pt-control.sh

# Controlar PT en tiempo real
bun run pt device add R1 2911 100 100
bun run pt device add S1 2960-24TT 300 100
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt snapshot
```

---

## 💻 Referencia de Comandos CLI

### 🎮 Control en Tiempo Real de Packet Tracer

```bash
# Ver estado actual del contexto y Packet Tracer
bun run pt status

# Gestión de dispositivos
bun run pt device list
bun run pt device add R1 2911
bun run pt device remove R1
bun run pt device move R1 --xpos 300 --ypos 200

# Configuración de red
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0 --gateway 192.168.1.254
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0
bun run pt vlan apply Switch1 10 20 30
bun run pt trunk apply Switch1 GigabitEthernet0/1
bun run pt ssh setup Router1 --domain cisco.local --user admin --pass admin

# Diagnóstico y logs
bun run pt doctor
bun run pt logs tail
bun run pt history list
```

### Lab Management

```bash
# Listar labs guardados
bun run pt lab list

# Crear nuevo lab
bun run pt lab create <nombre>

# Levantar lab desde YAML
bun run pt lab lift <archivo>

# Validar lab
bun run pt lab validate <archivo>

# Modo interactivo
bun run pt lab interactive

# Pipeline de labs
bun run pt lab pipeline

# Parsear lab
bun run pt lab parse <archivo>
```

### Configuración de Protocolos (YAML)

```bash
# OSPF
bun run pt config-ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0"

# EIGRP
bun run pt config-eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255"

# BGP
bun run pt config-bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001"

# ACL
bun run pt config-acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any"

# VLAN
bun run pt config-vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS"

# Interface
bun run pt config-interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0

# Aplicar desde archivo YAML/JSON
bun run pt config-apply configs/lab.yaml --dry-run
```

### Historial y Auditoría

```bash
# Historial de comandos
bun run pt history list              # Listar historial
bun run pt history show <id>        # Ver comando específico
bun run pt history last             # Último comando
bun run pt history search "ospf"    # Buscar en historial
bun run pt history failed           # Comandos fallidos
bun run pt history rerun <id>      # Re-ejecutar comando

# Audit log
bun run pt audit-tail               # Ver últimas operaciones
bun run pt audit-tail --lines 50    # Con cantidad de líneas
bun run pt audit-export             # Exportar a archivo
bun run pt audit-export --format json --output audit.json
bun run pt audit-failed            # Operaciones fallidas
bun run pt audit-failed --since "2026-04-01"
```

### Topología

```bash
# Analizar topología
bun run pt topology analyze

# Limpiar topología
bun run pt topology clean

# Exportar topología
bun run pt topology export

# Visualizar topología
bun run pt topology visualize

# Mostrar topología descubierta
bun run pt topology show
```

### Gestión de Enlaces

```bash
bun run pt link add R1 Gi0/0 S1 Fa0/1   # Agregar enlace
bun run pt link list                      # Listar enlaces
bun run pt link remove R1 Gi0/0           # Remover enlace
```

### Servicios de Red

```bash
# DHCP server
bun run pt services dhcp <device>

# NTP server
bun run pt services ntp <device>

# Syslog
bun run pt services syslog <device>
```

### STP y EtherChannel

```bash
# Spanning Tree Protocol
bun run pt stp set Switch1 mode rapid-pvst
bun run pt stp set Switch1 priority 4096

# EtherChannel
bun run pt etherchannel create Switch1 1 Gi0/1 Gi0/2
bun run pt etherchannel list
```

### Routing y ACL

```bash
# Routing
bun run pt routing ospf enable R1
bun run pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1

# ACL
bun run pt acl create 100 permit tcp any any eq 80
bun run pt acl apply ACL-100 R1
```

### Resultados y Logs

```bash
# Resultados de comandos
bun run pt results list                  # Listar resultados
bun run pt results show <id>            # Ver resultado específico
bun run pt results last                  # Último resultado

# Logs
bun run pt logs tail                     # Ver logs
bun run pt logs session <id>            # Logs de sesión
bun run pt logs errors                  # Solo errores
```

### Dispositivos (memoria SQLite)

```bash
bun run pt devices-list                  # Listar dispositivos guardados
bun run pt devices-add R1 --ip 10.0.0.1  # Agregar a memoria
```

### Preferencias

```bash
bun run pt config-prefs set default_router 2911   # Guardar preferencia
bun run pt config-prefs get default_router         # Ver preferencia
```

---

## 📝 Logging, Autonomía y Confirmación

La CLI de cisco-auto (basada en pt-control) implementa:

- **Logging estructurado:** Cada comando ejecutado queda registrado en archivos NDJSON, permitiendo auditoría y análisis histórico. Puedes consultar logs con `pt logs` o desde la skill de IA.
- **Autonomía proactiva:** El sistema ejecuta pasos seguros automáticamente y sugiere acciones recomendadas, minimizando la intervención manual y acelerando flujos repetitivos.
- **Confirmación de acciones destructivas:** Antes de eliminar dispositivos, enlaces o limpiar snapshots, la CLI solicita confirmación interactiva. Para automatización, usa el flag global `--yes` para registrar la aprobación en el log sin prompt.

---

## 🤖 Uso con Asistentes de IA (Skills)

`cisco-auto` incluye la skill especializada **Cisco Networking Assistant**, que convierte a tu CLI de IA favorita en un experto en Packet Tracer y redes Cisco. Esta skill te permite solicitar modificaciones a archivos, consultar teoría de redes, y diagnosticar problemas directamente desde tu terminal.

### Entornos Soportados

1. **[iFlow CLI](https://github.com/iflow/cli) (Recomendado):**
   ```bash
   cd cisco-auto
   iflow
   # La skill se carga automáticamente desde .iflow/skills/cisco-networking-assistant/
   ```

2. **[Gemini CLI](https://www.npmjs.com/package/@google/gemini-cli):**
   ```bash
   cd cisco-auto
   gemini
   # La skill se carga automáticamente desde .gemini/skills/cisco-networking-assistant/
   ```

3. **[Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code):**
   ```bash
   cd cisco-auto
   claude
   # La skill se carga automáticamente desde .claude/skills/
   ```

### Ejemplos de Interacción
- *"Necesito ayuda configurando VLANs en mi taller. Soy principiante, guíame paso a paso."*
- *"Analiza este archivo lab-vlans.pka y complétalo en modo automático para que las PCs tengan conectividad."*
- *"Genera la configuración de Router-on-a-stick para este proyecto."*
- *"Las PCs de la VLAN 10 no pueden hacer ping a la VLAN 20, ayúdame a realizar un troubleshooting."*

---

## 🔧 Desarrollo

### Cómo Agregar un Nuevo Plugin

1. **Crear la estructura de archivos:**
   ```
   packages/kernel/src/plugins/<nombre>/
   ├── index.ts              # Export público
   ├── <nombre>.plugin.ts    # Definición del plugin
   ├── <nombre>.schema.ts    # Schema Zod de validación
   ├── <nombre>.generator.ts # Generador de comandos IOS
   └── <nombre>.plugin.test.ts  # Tests
   ```

2. **Definir el schema Zod:**
   ```typescript
   import { z } from 'zod';
   
   export const miPluginSchema = z.object({
     deviceName: z.string().min(1),
     // ... campos específicos del protocolo
   });
   ```

3. **Implementar validación y plugin:**
   ```typescript
   import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
   
   export const miPlugin: ProtocolPlugin = {
     id: 'mi-protocolo',
     category: 'switching', // o 'routing', 'security', 'services'
     name: 'Mi Protocolo',
     version: '1.0.0',
     description: 'Generates and validates IOS Mi Protocolo configuration.',
     commands: [/* ... */],
     validate: validateConfig,
   };
   ```

4. **Exportar desde el index del plugin:**
   ```typescript
   export { miPlugin } from './mi-plugino.plugin.js';
   export { generateMiProtocoloCommands } from './mi-plugino.generator.js';
   ```

5. **Registrar en `packages/kernel/src/plugins/index.ts`:**
   ```typescript
   export * from './<nombre>/index.js';
   ```

6. **Registrar en el PluginRegistry (kernel-bridge.ts):**
   ```typescript
   import { miPlugin } from '@cisco-auto/kernel/plugins';
   registry.register('protocol', miPlugin);
   ```

### Comandos de Desarrollo

```bash
# Instalar dependencias
bun install

# Ejecutar tests
bun test

# Verificar tipos
bun run typecheck

# Build runtime de PT
bun run pt:build

# Generar runtime
bun run pt:generate

# Validar runtime
bun run pt:validate

# Deploy runtime
bun run pt:deploy
```

### Convenciones de Código

- **Runtime:** Bun (obligatorio, no usar Node.js/npm)
- **Lenguaje:** TypeScript estricto
- **Comentarios:** En español
- **Variables de dominio:** En español (`usuario`, `calcularTotal`)
- **Términos técnicos:** En inglés (`middleware`, `request`, `payload`)
- Ver `CLAUDE.md` para convenciones completas

---

## 📚 Documentación

Para obtener información detallada sobre el uso, la arquitectura y el desarrollo, consulta nuestro [**Centro de Documentación**](./docs/README.md).

### Guías Generales:
- [**Arquitectura General**](./docs/ARCHITECTURE.md)
- [**Instalación**](./docs/INSTALL.md)
- [**Troubleshooting**](./docs/TROUBLESHOOTING.md)
- [**Manual de la CLI para IA**](./docs/CLI_AGENT_SKILL.md)

### Por Paquetes:
- [**@cisco-auto/kernel**](./packages/kernel/README.md)
- [**@cisco-auto/pt-control**](./packages/pt-control/README.md)
- [**@cisco-auto/pt-runtime**](./packages/pt-runtime/README.md)
- [**@cisco-auto/file-bridge**](./packages/file-bridge/README.md)

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. Realiza un Fork del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`).
3. Sigue las convenciones establecidas en `CLAUDE.md`. Recuerda usar siempre `bun` (nunca `npm` o `node`).
4. Ejecuta los tests localmente (`bun test`).
5. Abre un Pull Request.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
Hecho con ❤️ para la comunidad de Redes.<br>
<b>Autor:</b> Andrés Gaibor | <b>Institución:</b> ESPOCH (Escuela Superior Politécnica de Chimborazo)
</p>
