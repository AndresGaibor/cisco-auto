# Arquitectura General — cisco-auto

## ¿Qué es este proyecto?

**cisco-auto** es un toolkit de automatización para Cisco Packet Tracer y equipos de red reales. Permite definir topologías de red de forma declarativa (YAML/JSON), generar configuraciones IOS automáticamente y desplegarlas tanto en Packet Tracer (control en tiempo real) como en dispositivos físicos vía SSH/Telnet.

**Objetivo principal**: Reducir el tiempo de configuración de laboratorios de 30-45 minutos a menos de 2 minutos.

## Estilo de Arquitectura

El proyecto sigue una **arquitectura Plugin-First** basada en tres patrones:

| Patrón | Aplicación |
|--------|-----------|
| **Clean Architecture** | Capas concéntricas: dominio → aplicación → infraestructura. Las dependencias apuntan hacia adentro. |
| **Hexagonal Architecture (Ports & Adapters)** | El dominio define puertos (interfaces), los adaptadores externos los implementan. |
| **Domain-Driven Design (DDD)** | Bounded contexts, aggregates, entities, value objects, domain events, repositories. |
| **Plugin-First** | Toda funcionalidad de protocolo (VLAN, Routing, Security, etc.) es un plugin registrable. El backend (Packet Tracer) también es un plugin. |

## Estructura del Proyecto (Monorepo)

```
cisco-auto/
├── apps/
│   └── pt-cli/                 # CLI principal (entry point)
│
├── packages/
│   ├── kernel/                 # ★ Núcleo: dominio, aplicación, plugins, backends
│   │   ├── src/domain/         #   Dominio (aggregates, entities, value objects)
│   │   ├── src/application/    #   Capa de aplicación (use cases, ports)
│   │   ├── src/plugin-api/     #   Interfaces de plugin (contratos)
│   │   ├── src/plugins/        #   Plugins de protocolo (vlan, routing, security...)
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
└── docs/                       # Documentación
```

## Paquetes Principales

### @cisco-auto/kernel

El corazón del sistema. Contiene:

- **Dominio**: Modelos puros de red sin dependencias externas
- **Aplicación**: Casos de uso que orquestan operaciones
- **Plugin API**: Contratos para plugins de protocolo y backend
- **Plugins**: Implementaciones concretas (VLAN, Routing, Security, Services, Switching, IPv6)
- **Backends**: Adaptadores para Packet Tracer

### @cisco-auto/types

Single Source of Truth para tipos TypeScript y schemas Zod. Define:
- Esquemas de dispositivos, protocolos, laboratorios
- Tipos para PT Control (DeviceState, TopologySnapshot)
- Tipos del protocolo FileBridge

### @cisco-auto/pt-control

Motor de control en tiempo real de Packet Tracer:
- FileBridge V2 para comunicación basada en filesystem
- Controlador de alto nivel (PTController)
- VDOM para estado de topología
- Logging estructurado NDJSON
- CLI con OCLIF

### @cisco-auto/file-bridge

Sistema de IPC basado en filesystem:
- Lease manager (instancia única)
- Backpressure (control de flujo)
- Crash recovery
- Garbage collection automática

### @cisco-auto/core

Lógica de negocio y orquestadores:
- Parser YAML con validación Zod
- Generadores de configuración IOS
- Deploy orchestrator (SSH/Telnet)
- Parsers de output IOS (`show ip interface brief`, `show vlan`, etc.)
- Modelos canónicos de dispositivos

## Stack Tecnológico

| Componente | Tecnología | Notas |
|------------|-----------|-------|
| Runtime | **Bun** 1.1+ | TypeScript nativo, obligatorio. No usar Node/npm |
| Lenguaje | TypeScript 5.x | Modo estricto, módulos ES |
| Validación | Zod 4.x | Schema validation en runtime |
| Logging | Pino 10.x | JSON estructurado, NDJSON |
| Testing | Bun Test | Runner integrado, sin dependencias externas |
| YAML | js-yaml | Parsing de lab definitions |
| SSH | node-ssh | Conexión a dispositivos reales |

## Decisiones de Diseño Clave

### 1. Plugin-First

Toda funcionalidad de protocolo es un plugin independiente que implementa `ProtocolPlugin`:

```typescript
// packages/kernel/src/plugin-api/protocol.plugin.ts
export interface ProtocolPlugin {
  id: string;
  category: 'switching' | 'routing' | 'security' | 'services';
  name: string;
  version: string;
  description: string;
  commands: PluginCommandDefinition[];
  validate(config: unknown): PluginValidationResult;
}
```

Esto permite:
- Agregar nuevos protocolos sin modificar el núcleo
- Validación consistente de configuraciones
- Generación de comandos IOS encapsulada
- Testing aislado por protocolo

### 2. Backend como Plugin

Packet Tracer no es una dependencia hardcodeada. Es un `BackendPlugin` que implementa `BackendPort`:

```typescript
// packages/kernel/src/application/ports/driven/backend.port.ts
export interface BackendPort {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

Esto permite agregar backends alternativos en el futuro (GNS3, EVE-NG, dispositivos reales directos).

### 3. Dominio Puro

El dominio (`packages/kernel/src/domain/`) no tiene dependencias externas. Usa solo:
- Value Objects con validación incorporada
- Entities con identidad
- Aggregates que garantizan invariantes
- Domain Events para comunicación entre bounded contexts

### 4. Filesystem como IPC

FileBridge usa el filesystem (`~/pt-dev/`) como medio de comunicación con Packet Tracer:
- No requiere configuración de red
- Sobrevive a reinicios
- Auditoría completa vía NDJSON
- Single-instance con lease manager
