# Cisco Auto - Complete Project Structure

Comprehensive documentation of all folders, files, and their purposes for AI context transfer.

---

## 📁 Root Level

### Configuration Files
- **`package.json`** - Root package configuration with workspaces for monorepo structure
- **`tsconfig.json`** - TypeScript root configuration
- **`bun.lock`** - Bun package manager lock file
- **`.gitignore`** - Git ignore patterns

### Documentation & AI Context
- **`README.md`** - Main project readme with overview and quick start
- **`PRD.md`** - Product Requirements Document
- **`CLAUDE.md`** - AI assistant instructions for Claude
- **`GEMINI.md`** - AI assistant instructions for Gemini
- **`QWEN.md`** - AI assistant memory and learnings log
- **`AGENTS.md`** - Global rules for all AI agents working on this project
- **`PT_CONTROL_SUMMARY.md`** - PT Control v2 summary documentation
- **`skills-lock.json`** - Skills version lock file

### Directories

#### `.agent/` & `.agents/`
AI agent skill definitions and configurations for multiple AI assistants.

#### `.ai/`, `.claude/`, `.gemini/`, `.iflow/`
AI-specific configuration and context folders for different AI assistants.

#### `apps/`
End-user applications (CLI, web UI, etc.)

#### `packages/`
Core npm packages in monorepo structure (see below)

#### `configs/`
- **`deploy-config.txt`** - Deployment configuration template
- **`test-config.txt`** - Test configuration sample

#### `examples/`
Example topologies, YAML files, and PKA Packet Tracer files for testing

#### `labs/`
Lab definitions and exercises for CCNA training

#### `logs/`
Runtime logs from PT Control and other tools

#### `pt-extension/`
- **`main.js`** - Packet Tracer extension entry point
- **`runtime.js`** - Runtime support for PT extension
- **`README.md`** - Extension documentation

#### `pt-logs/`
Packet Tracer specific logs

#### `references/`
Technical documentation, Cisco guides, and reference materials

#### `scripts/`
Utility scripts:
- **`demo-network.ts`** - Demo network setup script
- **`diagnose-pt.ts`** - Packet Tracer diagnostic tool
- **`install-bridge-macos.scpt`** - macOS bridge installation script
- **`pt-cli.ts`** - CLI interface for Packet Tracer control
- **`reload-runtime.ts`** - Runtime reloader
- **`setup-pt-control.sh`** - PT Control setup shell script
- **`uninstall-bridge-macos.scpt`** - macOS bridge uninstall script

#### `tests/`
Integration, unit, and end-to-end tests (see Tests section below)

#### `tmp/`
Temporary files and build artifacts

---

## 📦 Packages (Monorepo)

### `packages/core/` - Core Network Configuration Engine

**Purpose:** Canonical network model, config generators, validation

#### `src/`

##### `canonical/` - Canonical Network Model
- **`device.spec.ts`** - Device specification definitions
- **`types.ts`** - TypeScript types for canonical network model
- **`index.ts`** - Module exports

##### `config/` - Configuration Loading
- **`loader.ts`** - Configuration file loader
- **`types.ts`** - Config loader types
- **`index.ts`** - Module exports

##### `config-generators/` - IOS Configuration Generators
- **`base-generator.ts`** - Base class for all config generators
- **`ios-generator.ts`** - Main IOS configuration generator
- **`ios-generator.test.ts`** - Tests for IOS generator
- **`vlan-generator.ts`** - VLAN configuration generator
- **`routing-generator.ts`** - Routing (OSPF, EIGRP, BGP) generator
- **`routing-generator.test.ts`** - Routing generator tests
- **`security-generator.ts`** - ACL and security config generator
- **`security-generator.test.ts`** - Security generator tests
- **`port-template.generator.ts`** - Switch port template generator
- **`port-template.generator.test.ts`** - Port template tests
- **`config-differ.ts`** - Config diff and delta calculator
- **`config-differ.test.ts`** - Differ tests
- **`utils.ts`** - Utility functions for config generation
- **`utils.test.ts`** - Utils tests

##### `context/` - Network Context Management
- **`context.test.ts`** - Context tests
- **`types.ts`** - Context types
- **`index.ts`** - Module exports

##### `validation/` - Validation Engine
- **`device-spec.validator.ts`** - Comprehensive device spec validator
- **`device-spec.validator.test.ts`** - Validator tests
- **`lab.validator.ts`** - Lab validation logic
- **`index.ts`** - Module exports

##### `types/`
- **`tool.ts`** - Tool interface definitions

##### `index.ts` - Main package entry point

#### `package.json` - Core package configuration

---

### `packages/pt-control-v2/` - Packet Tracer Control Engine

**Purpose:** Digital twin, PT integration, validation, runtime generation

#### `src/`

##### `application/` - Application Layer (Ports & Adapters)

###### `ports/`
- **`file-bridge.port.ts`** - Port interface for file bridge operations

###### `services/`
- **`command.service.ts`** - Command execution service
- **`command.service.test.ts`** - Service tests

##### `controller/` - PT Controller
- **`index.ts`** - Main controller exports
- **`pt-controller.ts`** - Main PT controller logic

##### `domain/` - Domain Models

###### `ios/`
- **`ios-session.ts`** - IOS CLI session management
- **`ios-session.test.ts`** - Session tests
- **`ios-validation.ts`** - IOS validation logic
- **`ios-validation.test.ts`** - Validation tests

###### `capabilities/`
- **`capability-resolver.ts`** - Device capability resolution
- **`capability-resolver.test.ts`** - Resolver tests

##### `infrastructure/` - Infrastructure Layer

###### `pt/` - Packet Tracer Integration
- **`file-bridge-v2.ts`** - File bridge v2 implementation
- **`file-bridge-v2-commands.ts`** - Bridge commands
- **`file-bridge-v2.test.ts`** - Bridge tests
- **`consumer-file-resolver.ts`** - File consumer resolver
- **`durable-ndjson-consumer.ts`** - NDJSON stream consumer
- **`event-log-writer.ts`** - Event log writer

###### `pt/consumer/` - Event Consumer
- **`checkpoint.test.ts`** - Checkpoint tests
- **`gaps.test.ts`** - Gap detection tests
- **`helpers.ts`** - Consumer helpers
- **`reading.test.ts`** - Reading tests
- **`resilience.test.ts`** - Resilience tests

###### `pt/shared/`
- **`path-layout.ts`** - Path layout utilities
- **`protocol.ts`** - Protocol definitions
- **`sequence-store.ts`** - Sequence storage

###### `pt/topology/`
- **`topology-cache.ts`** - Topology caching

##### `intent/` - Intent Processing
- **`blueprint-builder.ts`** - Intent blueprint builder
- **`index.ts`** - Module exports
- **`intent-parser.ts`** - Natural language intent parser
- **`templates.ts`** - Intent templates

##### `ios/` - IOS Operations
- **`operations/`** - IOS operation implementations

##### `lesson/` - Lesson & Curriculum Engine
- **`curriculum-manager.ts`** - Curriculum management
- **`demo-step.ts`** - Demo step definitions
- **`index.ts`** - Module exports
- **`lesson-engine.ts`** - Main lesson engine
- **`theory-block.ts`** - Theory content blocks

##### `logging/` - Logging System
- **`log-manager.ts`** - Log management
- **`log-manager.test.ts`** - Manager tests
- **`sanitizer.ts`** - Log sanitizer
- **`types.ts`** - Logging types
- **`index.ts`** - Module exports

##### `pt-scripts/` - PT Script Runtime
- **`main.ts`** - Script entry point
- **`runtime.ts`** - Script runtime engine

##### `query/` - Query Engine
- **`index.ts`** - Module exports
- **`twin-query-engine.ts`** - Digital twin query engine

##### `runtime-generator/` - Runtime Code Generator

###### `handlers/`
- **`canvas.ts`** - Canvas handler
- **`config.ts`** - Config handler
- **`device.ts`** - Device handler
- **`index.ts`** - Handler exports
- **`inspect.ts`** - Inspect handler
- **`link.ts`** - Link handler
- **`module.ts`** - Module handler

###### `templates/`
- **`main.ts`** - Main template
- **`runtime.ts`** - Runtime template

###### `utils/`
- **`constants.ts`** - Generator constants
- **`index.ts`** - Utility exports
- **`parser-generator.ts`** - Parser code generator

- **`compose.ts`** - Runtime composition
- **`generator.test.ts`** - Generator tests
- **`index.ts`** - Module exports

##### `shared/`

###### `errors/` - Error definitions
###### `utils/`
- **`helpers.ts`** - Shared helpers

##### `simulation/` - Network Simulation
- **`impact-simulator.ts`** - Impact simulation
- **`index.ts`** - Module exports
- **`sandbox-twin.ts`** - Sandbox digital twin

##### `suggestion/` - Suggestion Engine
- **`index.ts`** - Module exports
- **`suggestion-engine.ts`** - Intelligent suggestions

##### `tools/`
- **`event-log.ts`** - Event log tool

##### `types/`
- **`index.ts`** - Type definitions

##### `utils/`
- **`ios-commands.ts`** - IOS command utilities

##### `validation/` - Validation Engine

###### `rules/` - Validation Rules
- **`acl-match-order.rule.ts`** - ACL match order validation
- **`duplicate-ip.rule.ts`** - Duplicate IP detection
- **`gateway-reachability.rule.ts`** - Gateway reachability check
- **`gateway-subnet.rule.ts`** - Gateway subnet validation
- **`index.ts`** - Rule exports
- **`loop-detection.rule.ts`** - Network loop detection
- **`nat-overlap.rule.ts`** - NAT overlap validation
- **`no-shutdown-expected.rule.ts`** - Shutdown state check
- **`running-not-saved.rule.ts`** - Running vs saved config check
- **`subnet-mask.rule.ts`** - Subnet mask validation
- **`subnet-overlap.rule.ts`** - Subnet overlap detection
- **`vlan-exists.rule.ts`** - VLAN existence check

- **`diagnostic.ts`** - Diagnostic types
- **`index.ts`** - Module exports
- **`policies.ts`** - Validation policies
- **`reactive-topology.ts`** - Reactive topology validation
- **`rule.ts`** - Rule base class
- **`validation-context.ts`** - Validation context
- **`validation-engine.ts`** - Main validation engine
- **`validation-engine.test.ts`** - Engine tests

##### `vdom/` - Virtual Domain Model
- **`index.ts`** - Virtual topology exports
- **`twin-adapter.ts`** - Twin adapter
- **`virtual-topology.test.ts`** - Topology tests

##### `index.ts` - Main package entry point

#### `tests/` - Package Tests
- **`base-command-confirmation.test.ts`**
- **`base-command-logging.test.ts`**
- **`bridge-contract.test.ts`**
- **`capability-resolver.test.ts`**
- **`cli.commands.test.ts`**
- **`config-show.test.ts`**
- **`event-log.test.ts`**
- **`ios-session.test.ts`**
- **`ios-validation.test.ts`**
- **`request-confirmation.test.ts`**
- **`runtime-generator.test.ts`**
- **`ssh-setup.test.ts`**
- **`vlan-apply.test.ts`**

###### `domain/ios/capabilities/`
- **`capability-set.test.ts`**

###### `domain/ios/value-objects/`
- **`ipv4-address.test.ts`**
- **`subnet-mask.test.ts`**
- **`vlan-id.test.ts`**

###### `infrastructure/pt/`
- **`checkpoint.test.ts`**
- **`consumer-file-resolver.test.ts`**
- **`durable-ndjson-consumer.test.ts`**
- **`file-bridge-v2.test.ts`**
- **`fs-atomic.test.ts`**
- **`gaps.test.ts`**
- **`reading.test.ts`**
- **`resilience.test.ts`**

#### `generated/` - Generated Runtime Files
- **`main.js`** - Generated main script
- **`runtime.js`** - Generated runtime

#### `package.json` - PT Control v2 package config
#### `tsconfig.json` - TypeScript config
#### `topology-config.example.json` - Example topology config

---

### `packages/templates/` - Network Templates

**Purpose:** CCNA lab templates and IOS version templates

#### `src/`
- **`index.ts`** - Main exports
- **`common/`** - Common template utilities
- **`ccna/`** - CCNA lab templates
  - **`index.ts`** - CCNA exports
- **`ios-12/`** - IOS 12 templates
- **`ios-15/`** - IOS 15 templates
- **`ios-16/`** - IOS 16 templates

#### `package.json` - Templates package config
#### `tsconfig.json` - TypeScript config

---

### `packages/tools/` - CLI Tools

**Purpose:** Device catalog, deployment, topology tools

#### `src/`

##### `catalog/` - Device Catalog
- **`get-device-details.ts`** - Device details lookup
- **`index.ts`** - Module exports
- **`list-devices.ts`** - List available devices
- **`list-templates.ts`** - List available templates

##### `deploy/` - Deployment Tools
- **`deploy.ts`** - Deployment logic
- **`generate-configs.ts`** - Config generation
- **`index.ts`** - Module exports

##### `topology/` - Topology Tools
- **`device-name-resolver.ts`** - Device name resolution
- **`device-name-resolver.test.ts`** - Resolver tests
- **`estimate-plan.ts`** - Plan estimation
- **`explain-plan.ts`** - Plan explanation
- **`fix-plan.ts`** - Plan fixing
- **`generate-script.ts`** - Script generation
- **`generate-script.test.ts`** - Script tests
- **`index.ts`** - Module exports
- **`plan-topology.ts`** - Topology planning
- **`validate-plan.ts`** - Plan validation

- **`index.ts`** - Main package entry point

#### `package.json` - Tools package config
#### `tsconfig.json` - TypeScript config

---

## 🧪 Tests (Root)

### `cli/` - CLI Tests
#### `commands/`
- **`acl.test.ts`** - ACL command tests

#### `lab/`
- **`interactive.test.ts`** - Interactive lab tests

### `core/` - Core Package Tests
#### `registry/`

### `fixtures/` - Test Fixtures

### `integration/` - Integration Tests
- **`pt-control-v2-integration.test.ts`** - PT Control integration
- **`pt-execute-script.test.ts`** - Script execution integration
- **`pt-validate-topology.test.ts`** - Topology validation integration

### `tools/` - Tools Tests
#### `catalog/`
- **`get-device-details.test.ts`**
- **`list-devices.test.ts`**
- **`list-templates.test.ts`**

#### `deploy/`
- **`deploy.test.ts`**
- **`generate-configs.test.ts`**

#### `topology/`
- **`estimate-plan.test.ts`**
- **`explain-plan.test.ts`**
- **`fix-plan.test.ts`**
- **`generate-script.test.ts`**
- **`validate-plan.test.ts`**

### `unit/` - Unit Tests
- **`api.test.ts`** - API tests
- **`catalog.test.ts`** - Catalog tests
- **`executor.test.ts`** - Executor tests
- **`protocol-generators.test.ts`** - Protocol generator tests
- **`templates.test.ts`** - Template tests
- **`test-validation.ts`** - Validation test utilities
- **`topology.test.ts`** - Topology tests
- **`validation.test.ts`** - Validation tests

### `pt-cli.test.ts` - PT CLI tests

---

## 🤖 AI Agent Folders

### `.agent/skills/skill-creator/`
Tools for creating and managing AI skills:
- **`SKILL.md`** - Skill definition
- **`LICENSE.txt`** - License
- **`agents/`** - Sub-agent definitions (analyzer, comparator, grader)
- **`assets/`** - Skill assets
- **`eval-viewer/`** - Evaluation viewer tools
- **`references/`** - Reference docs
- **`scripts/`** - Python scripts for skill management

### `.agents/skills/cisco-networking-assistant/`
Cisco networking skill for AI agents:
- **`SKILL.md`** - Skill definition
- **`assets/checklists/`** - Verification checklists
- **`assets/templates/`** - Lab templates (YAML)
- **`references/`** - Routing, security, VLAN, troubleshooting guides
- **`scripts/`** - TypeScript helper scripts

---

## 📊 Key Architecture Patterns

### Monorepo Structure
- **Root:** Workspace orchestration, shared config
- **apps/:** User-facing applications
- **packages/:** Shared libraries
  - **core:** Network model & config generation
  - **pt-control-v2:** Packet Tracer integration
  - **templates:** Lab templates
  - **tools:** CLI tools

### Ports & Adapters (Hexagonal)
In `pt-control-v2`:
- **domain/** - Business logic
- **application/** - Use cases (ports)
- **infrastructure/** - External adapters (PT, files, logs)
- **controller/** - Entry points

### Validation Pipeline
1. **DeviceSpecValidator** - Pre-generation validation
2. **ValidationEngine** - Runtime validation with rules
3. **ReactiveTopology** - Real-time topology validation
4. **Rules** - Individual validation rules (ACL, VLAN, IP, loops, etc.)

### Config Generation Flow
1. Canonical model (YAML/JSON)
2. DeviceSpec validation
3. Config generators (VLAN, Routing, Security, IOS)
4. ConfigDiffer for incremental deployment
5. IOS output with customizable section ordering

---

## 🔧 Technology Stack

- **Runtime:** Node.js / Bun
- **Language:** TypeScript (strict)
- **Package Manager:** Bun
- **Test Framework:** Jest / Bun test
- **Architecture:** Monorepo (workspaces)
- **Pattern:** Ports & Adapters, Domain-Driven Design

---

## 📝 File Naming Conventions

- **`*.generator.ts`** - Configuration generators
- **`*.validator.ts`** - Validation logic
- **`*.rule.ts`** - Validation rules
- **`*.service.ts`** - Business services
- **`*.port.ts`** - Port interfaces
- **`*.adapter.ts`** - Adapter implementations
- **`*.engine.ts`** - Complex engines
- **`*.test.ts`** - Test files
- **`types.ts`** - TypeScript type definitions
- **`index.ts`** - Module entry points

---

## 🎯 Entry Points

- **`apps/cli/src/index.ts`** - CLI application
- **`packages/core/src/index.ts`** - Core library
- **`packages/pt-control-v2/src/index.ts`** - PT Control library
- **`packages/tools/src/index.ts`** - Tools library
- **`pt-extension/main.js`** - Packet Tracer extension

---

*Generated for AI context transfer - March 2026*
