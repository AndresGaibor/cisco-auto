# Plugin-First Architecture Design Document

**Date**: 2026-04-11
**Author**: Claude (with user guidance)
**Status**: Proposed
**Related**: Clean Architecture, Hexagonal Architecture, Domain-Driven Design

---

## Executive Summary

Este documento describe la refactorización completa del monorepo `cisco-auto` hacia una arquitectura **Plugin-First** basada en principios de **Clean Architecture**, **Hexagonal Architecture** y **Domain-Driven Design**.

**Objetivos principales**:
- Modularidad: Componentes independientes y reutilizables
- Escalabilidad: Fácil agregar nuevas funcionalidades
- Flexibilidad: Plugin architecture para extensibilidad
- Legibilidad: Código limpio y auto-documentado
- Testabilidad: Dominio 100% testeable sin infraestructura

---

## Table of Contents

1. [Problema Actual](#problema-actual)
2. [Arquitectura Propuesta](#arquitectura-propuesta)
3. [Estructura de Directorios](#estructura-de-directorios)
4. [Plugin System](#plugin-system)
5. [Bounded Contexts](#bounded-contexts)
6. [Dependency Rule](#dependency-rule)
7. [Fases de Implementación](#fases-de-implementación)
8. [Testing Strategy](#testing-strategy)
9. [Migration Guide](#migration-guide)
10. [Examples](#examples)

---

## Problema Actual

### Análisis del Código Existente

| Package | Problema | Severidad |
|---------|----------|-----------|
| `ios-domain` | Bien estructurado pero aislado, no consumido por `core` | Media |
| `core` | God Package: genera configs, parsea, valida, conecta SSH, persiste, orquesta | Alta |
| `types` | Solo schemas Zod, sin domain types ricos | Media |
| `pt-control` | Acoplado a PT, no abstraído como backend | Media |
| `pt-cli` | Commands con lógica de aplicación mezclada | Alta |
| `file-bridge` | Bien estructurado, mantener | Baja |

### Anti-Patrones Detectados

```
❌ Anemic Domain Model: Value Objects ricos pero sin Entities ni Aggregates
❌ Layer Violation: Commands llaman directamente al controller
❌ God Package: core hace todo
❌ Duplicated Concepts: value-objects en ios-domain y core/catalog
❌ No Plugin Architecture: Todo acoplado
```

### Código Existente a Preservar

```
✅ ios-domain/value-objects/          → Renombrar a domain/ios/value-objects/
✅ ios-domain/operations/            → Migrar a application/use-cases/
✅ ios-domain/parsers/               → Mover a infrastructure/parsers/
✅ ios-domain/session/               → Mover a infrastructure/session/
✅ ios-domain/schemas/               → Preservar en domain/ios/
✅ ios-domain/capabilities/          → Mover a domain/ios/
✅ file-bridge/                       → Mover a infrastructure/backends/packet-tracer/
✅ types/schemas/                     → Preservar como contracts/
✅ ~150 test files                    → Migrar con el código
```

---

## Arquitectura Propuesta

### Visión General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    cisco-cli (apps/)                             │   │
│  │  • Commands (thin handlers)                                      │   │
│  │  • Renderers (output formatters)                                 │   │
│  │  • Plugin Loader                                                 │   │
│  │  • DI Container                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    cisco-kernel (packages/)                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐             │   │
│  │  │   Application        │  │   Plugin API         │             │   │
│  │  │   Services           │  │   Interfaces         │             │   │
│  │  │   • Use Cases        │  │   • ProtocolPlugin   │             │   │
│  │  │   • Orchestration    │  │   • DevicePlugin     │             │   │
│  │  │   • Event Handlers   │  │   • BackendPlugin    │             │   │
│  │  └──────────────────────┘  └──────────────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             DOMAIN LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    cisco-kernel/domain                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  ios/       │  │  topology/  │  │  lab/       │              │   │
│  │  │  • Entities │  │  • Entities │  │  • Entities │              │   │
│  │  │  • Value    │  │  • Value    │  │  • Value    │              │   │
│  │  │    Objects  │  │    Objects  │  │    Objects  │              │   │
│  │  │  • Aggregates│ │  • Aggregates│ │  • Aggregates│             │   │
│  │  │  • Events    │  │  • Events   │  │  • Events   │              │   │
│  │  │  • Services  │  │  • Services │  │  • Services │              │   │
│  │  │  • Repos     │  │  • Repos    │  │  • Repos    │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │                    shared/                               │    │   │
│  │  │  • Errors (Domain Errors)                                │    │   │
│  │  │  • Types (Shared Types)                                  │    │   │
│  │  │  • Events (Integration Events)                           │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE LAYER                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  BACKENDS                    PLUGINS                            │   │
│  │  ┌───────────────────┐      ┌──────────────────────────────┐   │   │
│  │  │ packet-tracer/    │      │ protocols/                   │   │   │
│  │  │  • FileBridge     │      │  • vlan-plugin              │   │   │
│  │  │  • PTController   │      │  • ospf-plugin              │   │   │
│  │  │  • Runtime        │      │  • eigrp-plugin             │   │   │
│  │  ├───────────────────┤      │  • bgp-plugin               │   │   │
│  │  │ ssh/              │      │  • acl-plugin               │   │   │
│  │  │  • SSHConnector   │      │  • nat-plugin               │   │   │
│  │  ├───────────────────┤      │  • dhcp-plugin             │   │   │
│  │  │ [future]          │      ├──────────────────────────────┤   │   │
│  │  │  • gns3/          │      │ devices/                    │   │   │
│  │  │  • eve-ng/        │      │  • router-plugin            │   │   │
│  │  └───────────────────┘      │  • switch-plugin           │   │   │
│  │                              │  • wireless-plugin          │   │   │
│  │  PERSISTENCE                 └──────────────────────────────┘   │   │
│  │  ┌───────────────────┐                                         │   │
│  │  │ sqlite/          │                                         │   │
│  │  │  • HistoryRepo   │                                         │   │
│  │  │  • TopologyRepo  │                                         │   │
│  │  │  • PrefsRepo     │                                         │   │
│  │  └───────────────────┘                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dependency Rule

**Las dependencias apuntan hacia adentro solamente:**

```
Infrastructure → Application → Domain
   (plugins)     (use cases)    (core)

❌ NUNCA: Domain importando de Infrastructure o Application
✅ SIEMPRE: Infrastructure implementando interfaces de Domain
```

---

## Estructura de Directorios

### Raíz del Monorepo

```
cisco-auto/
├── packages/
│   ├── kernel/                      # Núcleo del sistema
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── domain/              # Dominio puro (sin dependencias externas)
│   │   │   │   ├── ios/             # IOS Bounded Context
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── device.entity.ts
│   │   │   │   │   │   ├── interface.entity.ts
│   │   │   │   │   │   └── configuration.aggregate.ts
│   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   ├── vlan-id.vo.ts
│   │   │   │   │   │   ├── interface-name.vo.ts
│   │   │   │   │   │   ├── ipv4-address.vo.ts
│   │   │   │   │   │   └── ... (migrar de ios-domain)
│   │   │   │   │   ├── aggregates/
│   │   │   │   │   │   ├── device.aggregate.ts
│   │   │   │   │   │   └── topology.aggregate.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   ├── device-events.ts
│   │   │   │   │   │   └── configuration-events.ts
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── configuration-validator.service.ts
│   │   │   │   │   │   └── command-planner.service.ts
│   │   │   │   │   └── repositories/
│   │   │   │   │       ├── device.repository.ts      # Interface
│   │   │   │   │       └── topology.repository.ts   # Interface
│   │   │   │   ├── topology/        # Topology Bounded Context
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── node.entity.ts
│   │   │   │   │   │   ├── edge.entity.ts
│   │   │   │   │   │   └── canvas.entity.ts
│   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   ├── node-id.vo.ts
│   │   │   │   │   │   ├── coordinates.vo.ts
│   │   │   │   │   │   └── link-type.vo.ts
│   │   │   │   │   ├── aggregates/
│   │   │   │   │   │   └── topology-graph.aggregate.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   ├── node-events.ts
│   │   │   │   │   │   └── edge-events.ts
│   │   │   │   │   └── repositories/
│   │   │   │   │       └── topology.repository.ts
│   │   │   │   ├── lab/             # Lab Bounded Context
│   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── lab.entity.ts
│   │   │   │   │   │   └── lab-session.entity.ts
│   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   ├── lab-id.vo.ts
│   │   │   │   │   │   └── lab-version.vo.ts
│   │   │   │   │   ├── events/
│   │   │   │   │   │   └── lab-events.ts
│   │   │   │   │   └── repositories/
│   │   │   │   │       └── lab.repository.ts
│   │   │   │   └── shared/         # Shared Kernel
│   │   │   │       ├── errors/
│   │   │   │       │   ├── domain-error.ts
│   │   │   │       │   ├── validation-error.ts
│   │   │   │       │   └── index.ts
│   │   │   │       └── types/
│   │   │   │           └── result.ts
│   │   │   ├── application/        # Casos de Uso / Application Services
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── device/
│   │   │   │   │   │   ├── add-device.use-case.ts
│   │   │   │   │   │   ├── remove-device.use-case.ts
│   │   │   │   │   │   ├── configure-device.use-case.ts
│   │   │   │   │   │   └── verify-device.use-case.ts
│   │   │   │   │   ├── topology/
│   │   │   │   │   │   ├── create-topology.use-case.ts
│   │   │   │   │   │   ├── validate-topology.use-case.ts
│   │   │   │   │   │   └── export-topology.use-case.ts
│   │   │   │   │   ├── config/
│   │   │   │   │   │   ├── apply-vlan.use-case.ts
│   │   │   │   │   │   ├── apply-routing.use-case.ts
│   │   │   │   │   │   ├── configure-interface.use-case.ts
│   │   │   │   │   │   └── verify-configuration.use-case.ts
│   │   │   │   │   └── lab/
│   │   │   │   │       ├── create-lab.use-case.ts
│   │   │   │   │       ├── load-lab.use-case.ts
│   │   │   │   │       └── deploy-lab.use-case.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── command-orchestrator.service.ts
│   │   │   │   │   └── event-publisher.service.ts
│   │   │   │   └── ports/
│   │   │   │       ├── driven/      # Ports que el kernel consume
│   │   │   │       │   ├── backend.port.ts
│   │   │   │       │   ├── persistence.port.ts
│   │   │   │       │   └── logger.port.ts
│   │   │   │       └── driver/      # Ports que exponen funcionalidad
│   │   │   │           ├── device-api.port.ts
│   │   │   │           ├── topology-api.port.ts
│   │   │   │           └── lab-api.port.ts
│   │   │   ├── plugin-api/         # Plugin Interfaces
│   │   │   │   ├── protocol.plugin.ts
│   │   │   │   ├── device.plugin.ts
│   │   │   │   ├── backend.plugin.ts
│   │   │   │   ├── generator.plugin.ts
│   │   │   │   ├── validator.plugin.ts
│   │   │   │   └── plugin-registry.ts
│   │   │   └── index.ts            # Public API
│   │   └── tests/
│   │       ├── domain/
│   │       ├── application/
│   │       └── plugin-api/
│   │
│   ├── protocols/                  # Protocol Plugins
│   │   ├── vlan/
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── plugin.ts      # VlanPlugin implementation
│   │   │   │   ├── domain/
│   │   │   │   │   ├── vlan-id.vo.ts
│   │   │   │   │   ├── vlan-name.vo.ts
│   │   │   │   │   └── vlan-range.vo.ts
│   │   │   │   ├── generators/
│   │   │   │   │   └── vlan-generator.ts
│   │   │   │   ├── validators/
│   │   │   │   │   └── vlan-validator.ts
│   │   │   │   └── index.ts
│   │   │   └── tests/
│   │   ├── routing/
│   │   │   ├── ospf/
│   │   │   │   ├── package.json
│   │   │   │   ├── src/
│   │   │   │   │   ├── plugin.ts
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── ospf-area.vo.ts
│   │   │   │   │   │   └── ospf-process-id.vo.ts
│   │   │   │   │   ├── generators/
│   │   │   │   │   └── index.ts
│   │   │   │   └── tests/
│   │   │   ├── eigrp/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   ├── bgp/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   └── static/
│   │   │       ├── package.json
│   │   │       └── src/
│   │   ├── security/
│   │   │   ├── acl/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   ├── nat/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   └── port-security/
│   │   │       ├── package.json
│   │   │       └── src/
│   │   ├── services/
│   │   │   ├── dhcp/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   ├── ntp/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   ├── dns/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   ├── syslog/
│   │   │   │   ├── package.json
│   │   │   │   └── src/
│   │   │   └── snmp/
│   │   │       ├── package.json
│   │   │       └── src/
│   │   └── switching/
│   │       ├── stp/
│   │       │   ├── package.json
│   │       │   └── src/
│   │       ├── etherchannel/
│   │       │   ├── package.json
│   │       │   └── src/
│   │       └── vtp/
│   │           ├── package.json
│   │           └── src/
│   │
│   ├── backends/                  # Backend Plugins
│   │   ├── packet-tracer/
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── plugin.ts      # PacketTracerPlugin implementation
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── file-bridge.adapter.ts
│   │   │   │   │   ├── pt-controller.adapter.ts
│   │   │   │   │   └── topology.repository.ts
│   │   │   │   ├── runtime/
│   │   │   │   │   ├── main.js
│   │   │   │   │   └── runtime.js
│   │   │   │   └── index.ts
│   │   │   └── tests/
│   │   ├── ssh/
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── plugin.ts      # SSHPlugin implementation
│   │   │   │   ├── adapters/
│   │   │   │   │   └── ssh-connector.adapter.ts
│   │   │   │   └── index.ts
│   │   │   └── tests/
│   │   └── [future: gns3/, eve-ng/]
│   │
│   ├── infrastructure/             # Shared Infrastructure
│   │   ├── persistence/
│   │   │   ├── sqlite/
│   │   │   │   ├── package.json
│   │   │   │   ├── src/
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   ├── history.repository.impl.ts
│   │   │   │   │   │   ├── topology.repository.impl.ts
│   │   │   │   │   │   └── preferences.repository.impl.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── tests/
│   │   │   └── file-persistence/
│   │   │       ├── package.json
│   │   │       └── src/
│   │   └── parsers/
│   │       ├── ios-output/
│   │       │   ├── package.json
│   │       │   ├── src/
│   │       │   │   ├── parsers/
│   │       │   │   │   ├── show-interface.parser.ts
│   │       │   │   │   ├── show-vlan.parser.ts
│   │       │   │   │   ├── show-route.parser.ts
│   │       │   │   │   └── ...
│   │       │   │   └── index.ts
│   │       │   └── tests/
│   │       └── yaml-lab/
│   │           ├── package.json
│   │           ├── src/
│   │           │   ├── parsers/
│   │           │   │   └── lab-parser.ts
│   │           │   └── index.ts
│   │           └── tests/
│   │
│   └── contracts/                 # Shared Contracts (Zod schemas)
│       ├── package.json
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── device.schema.ts
│       │   │   ├── topology.schema.ts
│       │   │   ├── lab.schema.ts
│       │   │   ├── protocols.schema.ts
│       │   │   └── ...
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── index.ts
│       └── tests/
│
├── apps/
│   └── cisco-cli/                 # CLI Application
│       ├── package.json
│       ├── src/
│       │   ├── main.ts            # Entry point
│       │   ├── di-container.ts    # Dependency Injection setup
│       │   ├── plugin-loader.ts   # Plugin discovery and loading
│       │   ├── commands/
│       │   │   ├── device/
│       │   │   │   ├── add.command.ts
│       │   │   │   ├── remove.command.ts
│       │   │   │   ├── list.command.ts
│       │   │   │   └── configure.command.ts
│       │   │   ├── topology/
│       │   │   │   ├── create.command.ts
│       │   │   │   ├── validate.command.ts
│       │   │   │   └── export.command.ts
│       │   │   ├── config/
│       │   │   │   ├── vlan.command.ts
│       │   │   │   ├── routing.command.ts
│       │   │   │   └── interface.command.ts
│       │   │   ├── lab/
│       │   │   │   ├── create.command.ts
│       │   │   │   ├── load.command.ts
│       │   │   │   └── deploy.command.ts
│       │   │   └── plugin/
│       │   │       ├── list.command.ts
│       │   │       ├── install.command.ts
│       │   │       └── enable.command.ts
│       │   ├── renderers/          # Output formatters
│       │   │   ├── json.renderer.ts
│       │   │   ├── table.renderer.ts
│       │   │   └── text.renderer.ts
│       │   └── cli.ts              # Commander setup
│       └── tests/
│
├── tools/                         # Development tools
│   └── plugin-generator/          # CLI to scaffold new plugins
│       ├── package.json
│       └── src/
│           └── index.ts
│
├── docs/
│   ├── architecture/
│   │   ├── CLEAN_ARCHITECTURE.md
│   │   ├── PLUGIN_SYSTEM.md
│   │   ├── BOUNDED_CONTEXTS.md
│   │   └── MIGRATION_GUIDE.md
│   └── api/
│       └── PLUGIN_API.md
│
├── labs/                          # Example labs (unchanged)
├── tests/                          # Integration tests
│   ├── e2e/
│   └── plugins/
│
├── package.json                   # Root package with workspaces
├── tsconfig.json                  # TypeScript config
├── CLAUDE.md                      # Development conventions
└── README.md
```

---

## Plugin System

### Plugin Interface Definition

```typescript
// packages/kernel/src/plugin-api/protocol.plugin.ts

import type { ZodSchema } from 'zod';
import type { CommandPlan } from '../domain/ios/value-objects/command-plan.vo';
import type { UseCase } from '../application/use-cases/use-case';

/**
 * Protocol Plugin Interface
 * 
 * Plugins implement this interface to add new protocol support.
 * Examples: VLAN, OSPF, EIGRP, BGP, ACL, NAT, DHCP, etc.
 */
export interface ProtocolPlugin {
  // ===== Metadata =====
  readonly id: string;                    // Unique identifier: 'vlan', 'ospf', 'bgp'
  readonly name: string;                  // Display name: 'VLAN', 'OSPF', 'BGP'
  readonly version: string;               // Semver: '1.0.0'
  readonly category: ProtocolCategory;    // 'switching' | 'routing' | 'security' | 'services';
  readonly description: string;
  readonly author?: string;
  readonly homepage?: string;
  
  // ===== Domain Models =====
  /**
   * Zod schemas for input validation
   * Key = schema name, Value = Zod schema
   */
  readonly schemas: Record<string, ZodSchema>;
  
  /**
   * Value Object constructors for domain types
   * Key = VO name, Value = constructor
   */
  readonly valueObjects: Record<string, ValueObjectConstructor>;
  
  // ===== Use Cases =====
  /**
   * Commands this plugin exposes
   */
  readonly commands: CommandDefinition[];
  
  /**
   * Factory to create use case instances
   */
  createUseCase(command: string): UseCase<unknown, unknown>;
  
  // ===== Generators =====
  /**
   * Generate IOS commands from configuration
   */
  generateConfig(spec: unknown): CommandPlan;
  
  /**
   * Generate rollback commands
   */
  generateRollback(spec: unknown): CommandPlan;
  
  // ===== Validation =====
  /**
   * Validate configuration spec
   */
  validate(spec: unknown): ValidationResult;
  
  /**
   * Verify configuration was applied correctly
   */
  verifyCommands: string[];               // show commands to verify
  verifyOutput(raw: string, spec: unknown): boolean;
  
  // ===== Lifecycle =====
  /**
   * Called when plugin is loaded
   */
  onLoad?(kernel: Kernel): Promise<void>;
  
  /**
   * Called when plugin is unloaded
   */
  onUnload?(): Promise<void>;
  
  // ===== Dependencies =====
  /**
   * Other plugins this plugin depends on
   */
  dependencies?: string[];
  
  /**
   * Capability requirements for device
   */
  requiredCapabilities?: string[];
}

export type ProtocolCategory = 'switching' | 'routing' | 'security' | 'services';

export interface CommandDefinition {
  name: string;                          // 'apply-vlan', 'configure-ospf'
  description: string;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  examples: CommandExample[];
}

export interface CommandExample {
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  description: string;
}

export interface ValueObjectConstructor {
  new (...args: unknown[]): unknown;
  fromString(s: string): unknown;
  fromJSON(j: unknown): unknown;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}
```

### Device Plugin Interface

```typescript
// packages/kernel/src/plugin-api/device.plugin.ts

import type { ProtocolPlugin } from './protocol.plugin';

/**
 * Device Plugin Interface
 * 
 * Plugins implement this to add support for new device types.
 * Examples: Router, Switch L2, Switch L3, Wireless Router, etc.
 */
export interface DevicePlugin {
  // ===== Metadata =====
  readonly id: string;                    // 'router', 'switch-l2', 'switch-l3', 'wireless'
  readonly name: string;                   // 'Router', 'Layer 2 Switch', etc.
  readonly category: DeviceCategory;       // 'router' | 'switch' | 'wireless' | 'endpoint' | 'other'
  readonly models: DeviceModel[];         // Supported PT models
  
  // ===== Capabilities =====
  /**
   * What this device can do
   */
  readonly capabilities: DeviceCapabilities;
  
  /**
   * Which protocols this device supports
   * References protocol plugin IDs
   */
  readonly supportedProtocols: string[];
  
  // ===== Defaults =====
  /**
   * Default interface names
   */
  readonly defaultInterfaces: string[];
  
  /**
   * Default configuration commands
   */
  readonly defaultConfig?: string[];
  
  // ===== Validation =====
  /**
   * Check if this device model is valid
   */
  isValidModel(model: string): boolean;
  
  /**
   * Resolve model name to capabilities
   */
  resolveCapabilities(model: string): DeviceCapabilities;
}

export type DeviceCategory = 
  | 'router' 
  | 'switch' 
  | 'switch_layer3' 
  | 'wireless' 
  | 'endpoint' 
  | 'other';

export interface DeviceCapabilities {
  routing: boolean;
  switching: boolean;
  layer3: boolean;
  vlan: boolean;
  stp: boolean;
  etherchannel: boolean;
  acl: boolean;
  nat: boolean;
  dhcp: boolean;
  // ... more capabilities
}

export interface DeviceModel {
  id: string;                            // '2911', '2960-24TT', '4321'
  name: string;                          // 'Cisco 2911 Router'
  category: DeviceCategory;
  interfaces: number;
  moduleSlots?: number;
}
```

### Backend Plugin Interface

```typescript
// packages/kernel/src/plugin-api/backend.plugin.ts

import type { 
  DeviceRepository, 
  TopologyRepository 
} from '../domain/ios/repositories';
import type { CommandResult } from '../application/ports/driven/backend.port';

/**
 * Backend Plugin Interface
 * 
 * Plugins implement this to add support for different backends.
 * Examples: PacketTracer, GNS3, EVE-NG, Real Devices via SSH
 */
export interface BackendPlugin {
  // ===== Metadata =====
  readonly id: string;                    // 'packet-tracer', 'gns3', 'eve-ng', 'ssh'
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  // ===== Capabilities =====
  /**
   * What this backend can do
   */
  readonly capabilities: BackendCapabilities;
  
  // ===== Connection =====
  /**
   * Initialize connection to backend
   */
  connect(config: BackendConfig): Promise<void>;
  
  /**
   * Disconnect from backend
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if backend is connected
   */
  isConnected(): boolean;
  
  // ===== Device Operations =====
  /**
   * Add device to topology
   */
  addDevice(name: string, model: string, options?: DeviceOptions): Promise<DeviceResult>;
  
  /**
   * Remove device from topology
   */
  removeDevice(name: string): Promise<void>;
  
  /**
   * Configure device
   */
  configureDevice(name: string, commands: string[]): Promise<CommandResult>;
  
  /**
   * Execute show command on device
   */
  execShow(name: string, command: string): Promise<string>;
  
  // ===== Topology Operations =====
  /**
   * Add link between devices
   */
  addLink(device1: string, port1: string, device2: string, port2: string): Promise<void>;
  
  /**
   * Remove link
   */
  removeLink(device: string, port: string): Promise<void>;
  
  /**
   * Get topology snapshot
   */
  getTopology(): Promise<TopologySnapshot>;
  
  // ===== Repositories =====
  /**
   * Get device repository implementation
   */
  getDeviceRepository(): DeviceRepository;
  
  /**
   * Get topology repository implementation
   */
  getTopologyRepository(): TopologyRepository;
  
  // ===== Lifecycle =====
  onLoad?(kernel: Kernel): Promise<void>;
  onUnload?(): Promise<void>;
}

export interface BackendCapabilities {
  realtimeControl: boolean;       // Can control devices in real-time
  deviceCreation: boolean;        // Can create new devices
  topologyManagement: boolean;    // Can manage topology
  iosConfiguration: boolean;      // Can configure IOS
  packetTracer: boolean;         // Is Packet Tracer
  sshAccess: boolean;             // Can SSH to devices
  fileBased: boolean;              // Uses file-based IPC
  // ... more capabilities
}

export interface BackendConfig {
  type: string;
  // Backend-specific config
  [key: string]: unknown;
}

export interface DeviceOptions {
  x?: number;
  y?: number;
  [key: string]: unknown;
}

export interface DeviceResult {
  name: string;
  model: string;
  success: boolean;
  error?: string;
}

export interface TopologySnapshot {
  devices: DeviceSnapshot[];
  links: LinkSnapshot[];
}

export interface DeviceSnapshot {
  name: string;
  model: string;
  type: string;
  x: number;
  y: number;
  interfaces: InterfaceSnapshot[];
}

export interface InterfaceSnapshot {
  name: string;
  status: 'up' | 'down';
  ip?: string;
  mac?: string;
}

export interface LinkSnapshot {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
}
```

### Plugin Registry

```typescript
// packages/kernel/src/plugin-api/plugin-registry.ts

import type { ProtocolPlugin } from './protocol.plugin';
import type { DevicePlugin } from './device.plugin';
import type { BackendPlugin } from './backend.plugin';

/**
 * Plugin Registry
 * 
 * Central registry for all plugins.
 * Manages plugin lifecycle and dependencies.
 */
export interface PluginRegistry {
  // ===== Registration =====
  registerProtocol(plugin: ProtocolPlugin): void;
  registerDevice(plugin: DevicePlugin): void;
  registerBackend(plugin: BackendPlugin): void;
  
  // ===== Discovery =====
  getProtocol(id: string): ProtocolPlugin | undefined;
  getDevice(id: string): DevicePlugin | undefined;
  getBackend(id: string): BackendPlugin | undefined;
  
  getAllProtocols(): ProtocolPlugin[];
  getAllDevices(): DevicePlugin[];
  getAllBackends(): BackendPlugin[];
  
  // ===== Querying =====
  getProtocolsByCategory(category: string): ProtocolPlugin[];
  getProtocolsForDevice(deviceId: string): ProtocolPlugin[];
  getDevicesSupportingProtocol(protocolId: string): DevicePlugin[];
  
  // ===== Lifecycle =====
  loadPlugin(pluginId: string): Promise<void>;
  unloadPlugin(pluginId: string): Promise<void>;
  loadAll(): Promise<void>;
  unloadAll(): Promise<void>;
  
  // ===== Events =====
  on(event: 'plugin-loaded', handler: (plugin: Plugin) => void): void;
  on(event: 'plugin-unloaded', handler: (plugin: Plugin) => void): void;
}

export type Plugin = ProtocolPlugin | DevicePlugin | BackendPlugin;

/**
 * Default Plugin Registry Implementation
 */
export class DefaultPluginRegistry implements PluginRegistry {
  private protocols = new Map<string, ProtocolPlugin>();
  private devices = new Map<string, DevicePlugin>();
  private backends = new Map<string, BackendPlugin>();
  private loadedPlugins = new Set<string>();
  
  // ... implementation
}
```

---

## Bounded Contexts

### IOS Context

**Responsabilidad**: Configuración de dispositivos IOS Cisco.

```
domain/ios/
├── entities/
│   ├── device.entity.ts          # Entidad Device
│   ├── interface.entity.ts       # Entidad Interface
│   └── configuration.aggregate.ts # Aggregate Root para configuración
├── value-objects/
│   ├── vlan-id.vo.ts
│   ├── interface-name.vo.ts
│   ├── ipv4-address.vo.ts
│   ├── subnet-mask.vo.ts
│   ├── mac-address.vo.ts
│   └── ...
├── aggregates/
│   ├── device.aggregate.ts       # Aggregate: Device + Interfaces + Config
│   └── topology.aggregate.ts     # Aggregate: Devices + Links
├── events/
│   ├── device-added.event.ts
│   ├── device-removed.event.ts
│   ├── link-created.event.ts
│   ├── configuration-applied.event.ts
│   └── ...
├── services/
│   ├── configuration-validator.service.ts  # Domain Service
│   └── command-planner.service.ts          # Domain Service
└── repositories/
    ├── device.repository.ts      # Interface
    └── topology.repository.ts    # Interface
```

**Reglas de Negocio**:
1. Un dispositivo tiene al menos una interfaz
2. Una interfaz tiene nombre, estado, y puede tener IP/MAC
3. La configuración debe validar capacidades del dispositivo
4. Los comandos IOS se planifican con rollback

### Topology Context

**Responsabilidad**: Gestión de topología de red.

```
domain/topology/
├── entities/
│   ├── node.entity.ts            # Nodo en el grafo
│   ├── edge.entity.ts            # Arista en el grafo
│   └── canvas.entity.ts          # Canvas de visualización
├── value-objects/
│   ├── node-id.vo.ts
│   ├── coordinates.vo.ts
│   ├── link-type.vo.ts           # 'straight' | 'cross-over' | 'fiber' | ...
│   └── cable-media.vo.ts
├── aggregates/
│   └── topology-graph.aggregate.ts  # Aggregate: Nodes + Edges
├── events/
│   ├── node-added.event.ts
│   ├── node-removed.event.ts
│   ├── edge-created.event.ts
│   └── ...
└── repositories/
    └── topology.repository.ts
```

### Lab Context

**Responsabilidad**: Definición y ejecución de laboratorios.

```
domain/lab/
├── entities/
│   ├── lab.entity.ts              # Laboratorio
│   └── lab-session.entity.ts      # Sesión de ejecución
├── value-objects/
│   ├── lab-id.vo.ts
│   └── lab-version.vo.ts
├── events/
│   ├── lab-created.event.ts
│   ├── lab-deployed.event.ts
│   └── ...
└── repositories/
    └── lab.repository.ts
```

---

## Dependency Rule

### Reglas de Dirección

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION (CLI, API)                                        │
│  Depende de: APPLICATION                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  APPLICATION (Use Cases, Services)                              │
│  Depende de: DOMAIN                                             │
│  NO depende de: INFRASTRUCTURE                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DOMAIN (Entities, Value Objects, Domain Services)              │
│  NO depende de: NADA                                            │
│  Define: Interfaces (Ports)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE (Plugins, Adapters, Persistence)                │
│  Depende de: APPLICATION, DOMAIN                               │
│  Implementa: Interfaces definidas en DOMAIN/APPLICATION        │
└─────────────────────────────────────────────────────────────────┘
```

### Ejemplo de Inversión de Dependencias

```typescript
// ❌ INCORRECTO: Domain importando de Infrastructure

// domain/ios/entities/device.entity.ts
import { SQLiteDeviceRepository } from '../../../infrastructure/persistence/sqlite';
// ERROR: Domain no puede conocer Infrastructure

// ✅ CORRECTO: Domain definiendo interface

// domain/ios/repositories/device.repository.ts
export interface DeviceRepository {
  findById(id: string): Promise<Device | null>;
  save(device: Device): Promise<void>;
  delete(id: string): Promise<void>;
}

// domain/ios/entities/device.entity.ts
// NO importa nada de infrastructure

// infrastructure/persistence/sqlite/device.repository.impl.ts
import type { DeviceRepository } from '@cisco-auto/kernel/domain';
import { SQLiteClient } from 'bun:sqlite';

export class SQLiteDeviceRepository implements DeviceRepository {
  constructor(private db: SQLiteClient) {}
  
  async findById(id: string): Promise<Device | null> {
    // Implementation
  }
  
  async save(device: Device): Promise<void> {
    // Implementation
  }
  
  async delete(id: string): Promise<void> {
    // Implementation
  }
}
```

---

## Fases de Implementación

### Fase 1: Kernel Setup (Semana 1-2)

**Objetivo**: Crear el núcleo del sistema con interfaces bien definidas.

**Tareas**:
1. Crear estructura de directorios `packages/kernel/`
2. Migrar Value Objects de `ios-domain` a `kernel/domain/ios/value-objects/`
3. Crear Entidades y Aggregates en `kernel/domain/ios/`
4. Definir interfaces de repositorios en `kernel/domain/ios/repositories/`
5. Crear interfaces de plugins en `kernel/plugin-api/`
6. Implementar Plugin Registry
7. Configurar DI Container base

**Checklist**:
- [ ] Estructura de directorios creada
- [ ] Value Objects migrados con tests
- [ ] Entities y Aggregates creados
- [ ] Repository interfaces definidas
- [ ] Plugin API interfaces definidas
- [ ] Plugin Registry implementado
- [ ] DI Container configurado
- [ ] Tests unitarios pasando

### Fase 2: Primer Plugin - VLAN (Semana 3)

**Objetivo**: Implementar el primer protocol plugin como prueba de concepto.

**Tareas**:
1. Crear `packages/protocols/vlan/`
2. Implementar `VlanPlugin`
3. Migrar lógica de `core/config-generators/vlan-generator.ts` a `VlanPlugin.generateConfig()`
4. Implementar validadores
5. Implementar verificación
6. Registrar plugin en CLI

**Checklist**:
- [ ] Plugin structure created
- [ ] `VlanPlugin` implements `ProtocolPlugin`
- [ ] `generateConfig()` generates VLAN commands
- [ ] `validate()` validates configuration
- [ ] `verifyOutput()` validates result
- [ ] Plugin registered in CLI
- [ ] Tests unitarios e integración

### Fase 3: Backend Plugin - Packet Tracer (Semana 4)

**Objetivo**: Implementar backend plugin para Packet Tracer.

**Tareas**:
1. Crear `packages/backends/packet-tracer/`
2. Implementar `PacketTracerPlugin`
3. Migrar lógica de `pt-control` y `file-bridge` a adapters
4. Implementar repositorios
5. Conectar con Kernel

**Checklist**:
- [ ] Plugin structure created
- [ ] `PacketTracerPlugin` implements `BackendPlugin`
- [ ] Adapters for FileBridge created
- [ ] Repositories implemented
- [ ] Plugin registered in CLI
- [ ] Integration tests passing

### Fase 4: CLI Refactoring (Semana 5)

**Objetivo**: Refactorizar CLI para usar Use Cases y plugins.

**Tareas**:
1. Crear Use Cases en `kernel/application/use-cases/`
2. Refactorizar commands para ser thin handlers
3. Implementar renderers
4. Configurar DI Container
5. Implementar Plugin Loader

**Checklist**:
- [ ] Use Cases creados
- [ ] Commands refactorizados
- [ ] Renderers implementados
- [ ] DI Container configurado
- [ ] Plugin Loader implementado
- [ ] CLI tests passing

### Fase 5: Migration - Protocol Plugins (Semana 6-7)

**Objetivo**: Migrar protocolos existentes a plugins.

**Tareas**:
1. Crear `packages/protocols/routing/` (OSPF, EIGRP, BGP, Static)
2. Crear `packages/protocols/security/` (ACL, NAT)
3. Crear `packages/protocols/services/` (DHCP, NTP, Syslog, SNMP)
4. Crear `packages/protocols/switching/` (STP, VTP, EtherChannel)
5. Migrar lógica de `core/config-generators/` a plugins
6. Deprecate `core/config-generators/`

**Checklist**:
- [ ] Routing plugins created
- [ ] Security plugins created
- [ ] Services plugins created
- [ ] Switching plugins created
- [ ] Logic migrated
- [ ] Old code deprecated
- [ ] All tests passing

### Fase 6: Infrastructure & Persistence (Semana 8)

**Objetivo**: Migrar persistencia y parsers a infrastructure.

**Tareas**:
1. Crear `packages/infrastructure/persistence/sqlite/`
2. Migrar lógica de `core/memory/` a repositories
3. Crear `packages/infrastructure/parsers/ios-output/`
4. Migrar parsers de `ios-domain/parsers/`
5. Crear `packages/infrastructure/parsers/yaml-lab/`
6. Migrar parser de `core/parser/`

**Checklist**:
- [ ] SQLite repositories implemented
- [ ] Memory code migrated
- [ ] IOS output parsers migrated
- [ ] YAML lab parser migrated
- [ ] All tests passing

### Fase 7: Cleanup & Documentation (Semana 9)

**Objetivo**: Limpiar código legacy y documentar.

**Tareas**:
1. Deprecate y eliminar packages antiguos
2. Actualizar package.json exports
3. Actualizar CLAUDE.md
4. Crear documentación de arquitectura
5. Crear migration guide
6. Crear plugin development guide

**Checklist**:
- [ ] Legacy code removed
- [ ] Package exports updated
- [ ] CLAUDE.md updated
- [ ] Architecture docs created
- [ ] Migration guide created
- [ ] Plugin guide created

### Fase 8: Testing & Validation (Semana 10)

**Objetivo**: Asegurar calidad con tests.

**Tareas**:
1. Crear test suite para Domain
2. Crear test suite para Application
3. Crear test suite para Infrastructure
4. Crear test suite para Plugins
5. Crear E2E tests
6. Validar coverage > 80%

**Checklist**:
- [ ] Domain tests passing
- [ ] Application tests passing
- [ ] Infrastructure tests passing
- [ ] Plugin tests passing
- [ ] E2E tests passing
- [ ] Coverage > 80%

---

## Testing Strategy

### Pirámide de Testing

```
                    ┌─────────────────┐
                    │    E2E Tests    │
                    │   (10% - Plugins)│
                    └─────────────────┘
                   ┌───────────────────────┐
                   │   Integration Tests   │
                   │ (20% - Infrastructure) │
                   └───────────────────────┘
              ┌─────────────────────────────────┐
              │       Unit Tests                │
              │ (70% - Domain & Application)    │
              └─────────────────────────────────┘
```

### Domain Tests

**Regla**: Domain tests NUNCA dependen de infrastructure.

```typescript
// packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts

import { describe, test, expect } from 'bun:test';
import { VlanId, VlanType } from '@cisco-auto/kernel/domain/ios/value-objects';

describe('VlanId', () => {
  test('creates valid VLAN ID', () => {
    const vlan = new VlanId(100);
    expect(vlan.value).toBe(100);
    expect(vlan.type).toBe(VlanType.NORMAL);
  });
  
  test('rejects invalid VLAN ID', () => {
    expect(() => new VlanId(0)).toThrow();
    expect(() => new VlanId(4095)).toThrow();
  });
  
  test('classifies VLAN types correctly', () => {
    expect(new VlanId(1).isDefault).toBe(true);
    expect(new VlanId(100).isNormal).toBe(true);
    expect(new VlanId(1002).isReserved).toBe(true);
    expect(new VlanId(2000).isExtended).toBe(true);
  });
  
  test('equality works', () => {
    const vlan1 = new VlanId(100);
    const vlan2 = new VlanId(100);
    const vlan3 = new VlanId(200);
    
    expect(vlan1.equals(vlan2)).toBe(true);
    expect(vlan1.equals(vlan3)).toBe(false);
  });
});
```

### Application Tests

**Regla**: Application tests usan mocks de repositories.

```typescript
// packages/kernel/tests/application/use-cases/device/add-device.use-case.test.ts

import { describe, test, expect, mock } from 'bun:test';
import { AddDeviceUseCase } from '@cisco-auto/kernel/application/use-cases/device';
import type { DeviceRepository } from '@cisco-auto/kernel/domain/ios/repositories';
import type { BackendPort } from '@cisco-auto/kernel/application/ports/driven';

describe('AddDeviceUseCase', () => {
  test('adds device successfully', async () => {
    // Arrange
    const mockRepo: DeviceRepository = {
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
    };
    
    const mockBackend: BackendPort = {
      addDevice: mock(() => Promise.resolve({ name: 'R1', model: '2911', success: true })),
      // ... other methods
    };
    
    const useCase = new AddDeviceUseCase(mockRepo, mockBackend);
    
    // Act
    const result = await useCase.execute({
      name: 'R1',
      model: '2911',
      x: 100,
      y: 100,
    });
    
    // Assert
    expect(result.ok).toBe(true);
    expect(result.data?.name).toBe('R1');
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

### Plugin Tests

```typescript
// packages/protocols/vlan/tests/plugin.test.ts

import { describe, test, expect } from 'bun:test';
import { VlanPlugin } from '../src/plugin';

describe('VlanPlugin', () => {
  const plugin = new VlanPlugin();
  
  test('implements ProtocolPlugin interface', () => {
    expect(plugin.id).toBe('vlan');
    expect(plugin.category).toBe('switching');
  });
  
  test('generates VLAN commands', () => {
    const plan = plugin.generateConfig({
      vlans: [
        { id: 10, name: 'Admin' },
        { id: 20, name: 'Users' },
      ],
    });
    
    expect(plan.steps).toContainEqual({
      command: 'vlan 10',
      mode: 'config',
    });
    expect(plan.steps).toContainEqual({
      command: 'name Admin',
      mode: 'config',
    });
  });
  
  test('validates VLAN configuration', () => {
    const result = plugin.validate({
      vlans: [{ id: 10, name: 'Admin' }],
    });
    
    expect(result.ok).toBe(true);
  });
  
  test('rejects invalid VLAN ID', () => {
    const result = plugin.validate({
      vlans: [{ id: 5000, name: 'Invalid' }],
    });
    
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});
```

---

## Migration Guide

### Migrando de Código Legacy

#### Paso 1: Identificar Código a Migrar

```bash
# Buscar Value Objects en ios-domain
find packages/ios-domain/src/value-objects -name "*.ts" > vo-list.txt

# Buscar generators en core
find packages/core/src/config-generators -name "*.ts" > generators-list.txt

# Buscar parsers en ios-domain
find packages/ios-domain/src/parsers -name "*.ts" > parsers-list.txt
```

#### Paso 2: Migrar Value Objects

```typescript
// ANTES: packages/ios-domain/src/value-objects/vlan-id.ts
export class VlanId {
  // ... implementation
}

// DESPUÉS: packages/kernel/src/domain/ios/value-objects/vlan-id.vo.ts
import { ValueObject } from '../base/value-object.base';

export class VlanId extends ValueObject<number> {
  // ... implementation with same logic
}

// Copiar tests
cp packages/ios-domain/tests/value-objects/vlan-id.test.ts \
   packages/kernel/tests/domain/ios/value-objects/vlan-id.vo.test.ts
```

#### Paso 3: Crear Plugin

```typescript
// packages/protocols/vlan/src/plugin.ts

import type { ProtocolPlugin, CommandDefinition } from '@cisco-auto/kernel/plugin-api';
import { VlanGenerator } from './generators/vlan-generator';

export class VlanPlugin implements ProtocolPlugin {
  readonly id = 'vlan';
  readonly name = 'VLAN';
  readonly version = '1.0.0';
  readonly category = 'switching' as const;
  readonly description = 'VLAN configuration plugin';
  
  readonly schemas = {
    VlanConfig: VlanConfigSchema,
    // ...
  };
  
  readonly commands: CommandDefinition[] = [
    {
      name: 'apply-vlan',
      description: 'Apply VLAN configuration to switch',
      inputSchema: VlanConfigSchema,
      examples: [
        {
          input: { vlans: [{ id: 10, name: 'Admin' }] },
          description: 'Create VLAN 10 with name Admin',
        },
      ],
    },
  ];
  
  private generator = new VlanGenerator();
  
  generateConfig(spec: unknown): CommandPlan {
    return this.generator.generate(spec);
  }
  
  // ... other methods
}

// packages/protocols/vlan/src/index.ts
export { VlanPlugin } from './plugin';
```

#### Paso 4: Registrar en CLI

```typescript
// apps/cisco-cli/src/di-container.ts

import { VlanPlugin } from '@cisco-auto/protocols/vlan';
import { PluginRegistry } from '@cisco-auto/kernel';

export function setupDI(): void {
  const registry = new PluginRegistry();
  
  // Register protocol plugins
  registry.registerProtocol(new VlanPlugin());
  // ... other plugins
  
  // Register backend plugins
  registry.registerBackend(new PacketTracerPlugin());
  
  return { registry, /* other dependencies */ };
}
```

---

## Examples

### Ejemplo 1: Usando el Kernel

```typescript
// apps/cisco-cli/src/commands/vlan/apply.command.ts

import { Command } from 'commander';
import type { PluginRegistry } from '@cisco-auto/kernel';
import type { AddDeviceUseCase } from '@cisco-auto/kernel/application';

export function createVlanApplyCommand(
  registry: PluginRegistry,
  addDeviceUseCase: AddDeviceUseCase
): Command {
  return new Command('apply')
    .description('Apply VLAN configuration')
    .argument('<switch>', 'Switch name')
    .argument('<vlans...>', 'VLAN IDs')
    .option('-n, --name <name>', 'VLAN name')
    .action(async (switchName, vlans, options) => {
      // 1. Get plugin
      const vlanPlugin = registry.getProtocol('vlan');
      if (!vlanPlugin) {
        console.error('VLAN plugin not found');
        process.exit(1);
      }
      
      // 2. Build config
      const config = {
        switch: switchName,
        vlans: vlans.map((id: string) => ({
          id: parseInt(id),
          name: options.name,
        })),
      };
      
      // 3. Validate
      const validation = vlanPlugin.validate(config);
      if (!validation.ok) {
        console.error('Validation failed:', validation.errors);
        process.exit(1);
      }
      
      // 4. Generate commands
      const plan = vlanPlugin.generateConfig(config);
      
      // 5. Execute via Use Case
      const result = await addDeviceUseCase.execute({
        name: switchName,
        commands: plan.steps,
      });
      
      // 6. Verify if supported
      if (plan.verifyCommands) {
        const output = await backend.execShow(switchName, 'show vlan brief');
        const verified = vlanPlugin.verifyOutput(output, config);
        console.log('Verified:', verified);
      }
    });
}
```

### Ejemplo 2: Creando un Nuevo Plugin

```typescript
// packages/protocols/ospf/src/plugin.ts

import type { ProtocolPlugin } from '@cisco-auto/kernel/plugin-api';
import { z } from 'zod';
import { OspfArea } from './domain/ospf-area.vo';
import { OspfProcessId } from './domain/ospf-process-id.vo';

const OspfConfigSchema = z.object({
  processId: z.number().min(1).max(65535),
  routerId: z.string().ip().optional(),
  areas: z.array(z.object({
    areaId: z.union([z.number(), z.string()]),
    type: z.enum(['normal', 'stub', 'nssa']).default('normal'),
    networks: z.array(z.string()),
  })),
});

export class OspfPlugin implements ProtocolPlugin {
  readonly id = 'ospf';
  readonly name = 'OSPF';
  readonly version = '1.0.0';
  readonly category = 'routing' as const;
  readonly description = 'OSPF routing protocol plugin';
  readonly dependencies = []; // OSPF doesn't depend on other plugins
  readonly requiredCapabilities = ['routing'];
  
  readonly schemas = { OspfConfig: OspfConfigSchema };
  
  readonly valueObjects = {
    OspfArea,
    OspfProcessId,
  };
  
  readonly commands = [
    {
      name: 'configure-ospf',
      description: 'Configure OSPF routing',
      inputSchema: OspfConfigSchema,
      examples: [
        {
          input: {
            processId: 1,
            areas: [
              { areaId: 0, networks: ['192.168.1.0/24'] },
            ],
          },
          description: 'Single area OSPF configuration',
        },
      ],
    },
  ];
  
  createUseCase(command: string): UseCase<unknown, unknown> {
    if (command === 'configure-ospf') {
      return new ConfigureOspfUseCase();
    }
    throw new Error(`Unknown command: ${command}`);
  }
  
  generateConfig(spec: unknown): CommandPlan {
    const config = OspfConfigSchema.parse(spec);
    const steps: CommandStep[] = [];
    
    // Enter OSPF configuration mode
    steps.push({
      command: `router ospf ${config.processId}`,
      mode: 'config',
      description: `Enter OSPF process ${config.processId}`,
    });
    
    // Set router ID if provided
    if (config.routerId) {
      steps.push({
        command: `router-id ${config.routerId}`,
        mode: 'config-router',
      });
    }
    
    // Configure each area
    for (const area of config.areas) {
      for (const network of area.networks) {
        const [addr, mask] = this.parseCidr(network);
        steps.push({
          command: `network ${addr} ${mask} area ${area.areaId}`,
          mode: 'config-router',
        });
      }
      
      if (area.type === 'stub') {
        steps.push({
          command: `area ${area.areaId} stub`,
          mode: 'config-router',
        });
      } else if (area.type === 'nssa') {
        steps.push({
          command: `area ${area.areaId} nssa`,
          mode: 'config-router',
        });
      }
    }
    
    return {
      operation: 'configure-ospf',
      target: 'router',
      steps,
      rollback: this.generateRollback(config),
      targetMode: 'config',
    };
  }
  
  generateRollback(spec: unknown): CommandPlan {
    const config = OspfConfigSchema.parse(spec);
    return {
      operation: 'rollback-ospf',
      target: 'router',
      steps: [
        {
          command: `no router ospf ${config.processId}`,
          mode: 'config',
        },
      ],
    };
  }
  
  validate(spec: unknown): ValidationResult {
    try {
      OspfConfigSchema.parse(spec);
      return { ok: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          ok: false,
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        };
      }
      throw error;
    }
  }
  
  readonly verifyCommands = ['show ip ospf neighbor', 'show ip route ospf'];
  
  verifyOutput(raw: string, spec: unknown): boolean {
    // Check for OSPF neighbors
    if (raw.includes('OSPF')) {
      return true;
    }
    return false;
  }
  
  private parseCidr(cidr: string): [string, string] {
    const [addr, prefix] = cidr.split('/');
    const prefixLen = parseInt(prefix);
    const mask = this.prefixToWildcard(prefixLen);
    return [addr, mask];
  }
  
  private prefixToWildcard(prefix: number): string {
    // Convert prefix length to wildcard mask
    // ... implementation
  }
}
```

### Ejemplo 3: Backend Plugin

```typescript
// packages/backends/packet-tracer/src/plugin.ts

import type { BackendPlugin } from '@cisco-auto/kernel/plugin-api';
import { FileBridge } from './adapters/file-bridge.adapter';
import { PTController } from './adapters/pt-controller.adapter';

export class PacketTracerPlugin implements BackendPlugin {
  readonly id = 'packet-tracer';
  readonly name = 'Cisco Packet Tracer';
  readonly version = '2.0.0';
  readonly description = 'Backend plugin for Cisco Packet Tracer';
  
  readonly capabilities = {
    realtimeControl: true,
    deviceCreation: true,
    topologyManagement: true,
    iosConfiguration: true,
    packetTracer: true,
    sshAccess: false,
    fileBased: true,
  };
  
  private bridge: FileBridge;
  private controller: PTController;
  
  async connect(config: BackendConfig): Promise<void> {
    this.bridge = new FileBridge(config);
    await this.bridge.start();
    this.controller = new PTController(this.bridge);
  }
  
  async disconnect(): Promise<void> {
    await this.bridge.stop();
  }
  
  isConnected(): boolean {
    return this.bridge?.isReady() ?? false;
  }
  
  async addDevice(
    name: string,
    model: string,
    options?: DeviceOptions
  ): Promise<DeviceResult> {
    return this.controller.addDevice(name, model, {
      x: options?.x ?? 0,
      y: options?.y ?? 0,
    });
  }
  
  async removeDevice(name: string): Promise<void> {
    await this.controller.removeDevice(name);
  }
  
  async configureDevice(
    name: string,
    commands: string[]
  ): Promise<CommandResult> {
    return this.controller.configIos(name, commands);
  }
  
  async execShow(name: string, command: string): Promise<string> {
    const result = await this.controller.showCommand(name, command);
    return result.raw;
  }
  
  // ... other methods
}
```

---

## Decisiones de Arquitectura

### ADR-001: Plugin-First Architecture

**Estado**: Accepted
**Fecha**: 2026-04-11

**Contexto**:
El proyecto necesita ser extensible para agregar nuevos protocolos, dispositivos y backends sin modificar el core.

**Decisión**:
Adoptar una arquitectura Plugin-First donde toda la funcionalidad extensible se implemente como plugins que implementan interfaces bien definidas.

**Consecuencias**:
- Positivas:
  - Extensibilidad sin modificar el core
  - Separación clara de responsabilidades
  - Fácil agregar soporte para nuevos protocolos y backends
  - Testing aislado por plugin
- Negativas:
  - Overhead de abstracción
  - Requiere diseño cuidadoso de interfaces de plugin
  - Curva de aprendizaje para nuevos desarrolladores

### ADR-002: Hexagonal Architecture con Bounded Contexts

**Estado**: Accepted
**Fecha**: 2026-04-11

**Contexto**:
El código existente mezcla domain logic, application logic e infrastructure en varios packages.

**Decisión**:
Adoptar Hexagonal Architecture (Ports and Adapters) con Bounded Contexts de DDD para bounded contexts claramente definidos.

**Consecuencias**:
- Positivas:
  - Domain 100% testeable sin infrastructure
  - Separación clara de capas
  - Fácil cambiar implementations (e.g., SQLite a PostgreSQL)
  - Bounded contexts aislados
- Negativas:
  - Más archivos y boilerplate
  - Requiere entender DDD y hexagonal

### ADR-003: Value Objects en Domain, Zod Schemas en Contracts

**Estado**: Accepted
**Fecha**: 2026-04-11

**Contexto**:
Existe duplicación entre Value Objects en ios-domain y Zod schemas en types.

**Decisión**:
- Usar Value Objects para domain logic (validación, comportamiento)
- Usar Zod schemas para input/output validation (API boundaries)
- Generar schemas desde Value Objects cuando sea posible

**Consecuencias**:
- Positivas:
  - Single source of truth para validación
  - Value Objects encapsulan behavior
  - Schemas para serialización/deserialización
- Negativas:
  - Posible duplicación de lógica de validación
  - Requiere mantener sincronizados

---

## Referencias

### Principios y Patrones

1. **Clean Architecture** - Robert C. Martin
   - Dependency Rule: dépendencies point inward
   - Entities, Use Cases, Interface Adapters, Frameworks

2. **Hexagonal Architecture** - Alistair Cockburn
   - Ports and Adapters
   - Application core protected from infrastructure

3. **Domain-Driven Design** - Eric Evans
   - Bounded Contexts
   - Aggregates
   - Value Objects
   - Domain Events

4. **SOLID Principles**
   - Single Responsibility
   - Open/Closed (Plugins!)
   - Liskov Substitution
   - Interface Segregation
   - Dependency Inversion

### Fuentes Consultadas

- [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design: The Blue Book](https://www.domainlanguage.com/ddd/blue-book/)
- [Implementing Domain-Driven Design](https://openlibrary.org/works/OL17392277W) - Vaughn Vernon

---

## Apéndice: Checklist de Refactorización

### Por Cada Archivo Migrado

- [ ] Crear nuevo archivo en ubicación correcta
- [ ] Copiar lógica manteniendo comportamiento
- [ ] Actualizar imports
- [ ] Agregar types/interfaces si es necesario
- [ ] Crear/migrar tests
- [ ] Verificar que tests pasan
- [ ] Actualizar exports en index.ts
- [ ] Eliminar archivo antiguo (o marcar como deprecated)
- [ ] Actualizar documentación

### Por Cada Plugin Creado

- [ ] Crear estructura de directorios
- [ ] Implementar interface de plugin
- [ ] Implementar methods requeridos
- [ ] Crear tests unitarios
- [ ] Crear tests de integración
- [ ] Documentar API del plugin
- [ ] Agregar ejemplos de uso
- [ ] Registrar en CLI
- [ ] Verificar registro en Plugin Registry

### Por cada Bounded Context

- [ ] Definir Entidades
- [ ] Definir Value Objects
- [ ] Definir Aggregates
- [ ] Definir Domain Events
- [ ] Definir Repository Interfaces
- [ ] Implementar Use Cases
- [ ] Crear Infrastructure Adapters
- [ ] Crear tests de dominio
- [ ] Crear tests de aplicación
- [ ] Documentar reglas de negocio

---

**End of Document**