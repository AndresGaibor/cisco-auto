# cisco-auto — Complete Project Context for AI Assistants

**Version**: 0.2.0  
**Last Updated**: 2026-04-01  
**Author**: Andrés Gaibor (ESPOCH)  
**License**: MIT

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision & Goals](#project-vision--goals)
3. [Architecture Overview](#architecture-overview)
4. [Monorepo Structure](#monorepo-structure)
5. [Package Details](#package-details)
6. [Technology Stack](#technology-stack)
7. [Key Features](#key-features)
8. [PT Control - Real-time Packet Tracer Control](#pt-control---real-time-packet-tracer-control)
9. [FileBridge Communication System](#filebridge-communication-system)
10. [Command Reference](#command-reference)
11. [Development Conventions](#development-conventions)
12. [Lab Definition Format](#lab-definition-format)
13. [Supported Protocols](#supported-protocols)
14. [AI Skills Integration](#ai-skills-integration)
15. [Common Workflows](#common-workflows)
16. [Troubleshooting](#troubleshooting)

---

## Executive Summary

**cisco-auto** is a comprehensive automation toolkit for Cisco networking education, built with Bun and TypeScript. It provides:

1. **Real-time Packet Tracer control** via a file-based bridge (FileBridge)
2. **Declarative lab definitions** using YAML/JSON with Zod validation
3. **Automated configuration deployment** via SSH/Telnet
4. **Multi-protocol support** (VLANs, OSPF, EIGRP, BGP, ACLs, NAT, IPv6)
5. **AI assistant integration** via modular skills

**Primary Use Case**: Reduce lab configuration time from 30-45 minutes to under 2 minutes for network students at ESPOCH (Ecuador).

---

## Project Vision & Goals

### Mission
Empower networking students and instructors with professional-grade automation tools that eliminate repetitive manual configuration while ensuring accuracy and compliance with lab requirements.

### Quantitative Goals
- ⏱️ **Configuration Time**: Reduce from 30-45 min → <2 min
- ✅ **Success Rate**: >95% first-time deployment success
- 🧪 **Test Coverage**: >80% code coverage
- 📉 **Error Reduction**: Minimize human errors in repetitive tasks

### Target Users
- **Primary**: Network engineering students (ESPOCH)
- **Secondary**: Instructors verifying lab configurations
- **Tertiary**: AI assistants automating network tasks

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CISCO AUTO ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │  Bun CLI     │─────▶│  FileBridge  │─────▶│  Packet      │ │
│  │  (TypeScript)│      │    V2        │      │  Tracer      │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                     │                      │         │
│         │ writes command.json │                      │         │
│         │                     │ watches files        │         │
│         │                     │                      │ IPC     │
│         │                     │                      │ calls   │
│         ▼                     ▼                      ▼         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ~/pt-dev/ (Shared Filesystem)               │   │
│  │  ├─ command.json          ← Command entrypoint          │   │
│  │  ├─ runtime.js            ← Runtime code (hot reload)   │   │
│  │  ├─ main.js               ← PT Script Module            │   │
│  │  ├─ state.json            ← Topology snapshot           │   │
│  │  ├─ bridge-lease.json     ← Single-instance lock        │   │
│  │  ├─ protocol.seq.json     ← Sequence numbers            │   │
│  │  ├─ commands/             ← Command queue (advanced)    │   │
│  │  ├─ in-flight/            ← Commands being processed    │   │
│  │  ├─ results/              ← Command results             │   │
│  │  ├─ logs/                 ← NDJSON event journal        │   │
│  │  └─ consumer-state/       ← Consumer checkpoints        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles
1. **Bun-first**: Leverage Bun's performance and native TypeScript support
2. **Type-safe**: Strict TypeScript with Zod runtime validation
3. **File-based IPC**: No network setup, survives restarts
4. **Event-driven**: NDJSON event streaming for real-time updates
5. **Modular**: Clear package boundaries with workspace dependencies

---

## Monorepo Structure

```
cisco-auto/
├── apps/
│   └── pt-cli/                 # Main CLI application (Commander.js)
│       ├── src/
│       │   ├── index.ts        # Entry point
│       │   ├── commands/       # CLI commands
│       │   └── utils/          # Shared utilities
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── types/                  # ⭐ Single Source of Truth for types
│   │   ├── src/
│   │   │   ├── schemas/        # Zod schemas (device.js, protocols.js, lab.js)
│   │   │   └── types/          # TypeScript type re-exports
│   │   └── package.json
│   │
│   ├── core/                   # Business logic & orchestrators
│   │   ├── src/
│   │   │   ├── parser/         # YAML parser with Zod validation
│   │   │   ├── config-generators/  # IOS command generators
│   │   │   ├── executor/       # Deploy orchestrator
│   │   │   ├── canonical/      # Canonical device/lab models
│   │   │   ├── connector/      # SSH/Telnet connectivity
│   │   │   ├── topology/       # Topology builders
│   │   │   ├── validation/     # Lab validators
│   │   │   └── templates/      # IOS command templates
│   │   └── package.json
│   │
│   ├── pt-control/             # 🎮 Real-time PT control engine
│   │   ├── src/
│   │   │   ├── controller/     # PTController high-level API
│   │   │   ├── vdom/           # Virtual DOM for topology state
│   │   │   ├── domain/ios/     # IOS session management
│   │   │   ├── application/services/  # DeviceService, IosService, etc.
│   │   │   ├── cli/commands/   # OCLIF CLI commands
│   │   │   ├── contracts/      # PT event/command contracts
│   │   │   ├── logging/        # NDJSON logging
│   │   │   └── infrastructure/ # FileBridge adapter, cache
│   │   ├── scripts/            # Build & setup scripts
│   │   ├── bin/                # CLI entry points
│   │   └── package.json
│   │
│   ├── pt-runtime/             # Runtime code generator for PT
│   │   ├── src/
│   │   │   └── templates/      # main.js, runtime.js templates
│   │   └── package.json
│   │
│   ├── file-bridge/            # CLI ↔ Packet Tracer bridge
│   │   ├── src/
│   │   │   ├── file-bridge-v2.ts    # Core bridge implementation
│   │   │   ├── backpressure-manager.ts
│   │   │   ├── durable-ndjson-consumer.ts
│   │   │   ├── event-log-writer.ts
│   │   │   └── shared-result-watcher.ts
│   │   └── package.json
│   │
│   └── tools/                  # Convenience tool exports
│       └── src/
│           └── index.ts        # Re-exports from core
│
├── docs/                       # Technical documentation
│   ├── PT_CONTROL_*.md         # PT Control documentation suite
│   ├── FILEBRIDGE_RUNTIME_COMPLETE_GUIDE.md
│   └── hardening/              # Security hardening guides
│
├── labs/                       # Example lab YAML files
├── scripts/                    # Setup and utility scripts
├── .skills/                    # AI assistant skills
├── .agents/                    # Agent configurations
├── .sisyphus/                  # CI/CD configurations
│
├── package.json                # Root package with workspaces
├── tsconfig.json               # TypeScript configuration
├── CLAUDE.md                   # Development conventions
├── README.md                   # User-facing documentation
├── PRD.md                      # Product Requirements Document
└── CONTEXT.md                  # This file
```

---

## Package Details

### @cisco-auto/types
**Purpose**: Single Source of Truth for all type definitions

**Key Exports**:
```typescript
// Zod schemas for validation
import { LabSchema, DeviceSchema, VLANSchema, OSPFSchema } from '@cisco-auto/types';

// TypeScript types (re-exported from schemas)
import type { Lab, Device, VLAN, OSPFConfig } from '@cisco-auto/types';

// PT Control types
import type { DeviceState, LinkState, TopologySnapshot, PTEvent } from '@cisco-auto/types';

// File Bridge protocol types
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from '@cisco-auto/types';
```

**Schema Categories**:
- `device.js`: Device specifications, models, types
- `protocols.js`: VLAN, VTP, STP, OSPF, EIGRP, BGP schemas
- `security.js`: ACL, NAT, VPN schemas
- `lab.js`: Complete lab definition schema
- `pt-commands.js`: PT Control command schemas

---

### @cisco-auto/core
**Purpose**: Core business logic and orchestrators

**Key Modules**:

#### Parser (`src/parser/`)
```typescript
import { YAMLParser } from '@cisco-auto/core';

const parser = new YAMLParser();
const lab = await parser.parseFile('labs/vlan-lab.yaml');
// Returns validated Lab object with Zod
```

#### Config Generators (`src/config-generators/`)
```typescript
import { VlanGenerator, RoutingGenerator, SecurityGenerator } from '@cisco-auto/core';

const vlanGen = new VlanGenerator();
const commands = vlanGen.generate({
  vlans: [
    { id: 10, name: 'Students' },
    { id: 20, name: 'Professors' }
  ],
  trunkPorts: ['GigabitEthernet0/1', 'GigabitEthernet0/2']
});
// Returns: ['vlan 10', 'name Students', 'vlan 20', 'name Professors', ...]
```

#### Deploy Orchestrator (`src/executor/`)
```typescript
import { DeployOrchestrator } from '@cisco-auto/core';

const orchestrator = new DeployOrchestrator({
  concurrency: 5,
  timeout: 30000
});

await orchestrator.deploy(lab, {
  credentials: { username: 'admin', password: process.env.PASSWORD },
  dryRun: false,
  saveConfig: true
});
```

#### SSH Connector (`src/connector/`)
```typescript
import { SSHConnector } from '@cisco-auto/core';

const connector = new SSHConnector({
  host: '192.168.1.1',
  username: 'admin',
  password: 'secret'
});

await connector.connect();
await connector.execute(['enable', 'configure terminal', 'vlan 10']);
await connector.disconnect();
```

---

### @cisco-auto/pt-control
**Purpose**: Real-time control engine for Cisco Packet Tracer

**Key Features**:
- FileBridgeV2-based communication (no network required)
- Event streaming via NDJSON
- Hot reload support for runtime code
- Complete PT IPC API access
- ~100-200ms per command latency

**Controller API**:
```typescript
import { createDefaultPTController } from '@cisco-auto/pt-control';

const controller = createDefaultPTController();
await controller.start();

// Device management
await controller.addDevice('R1', '2911', { x: 100, y: 100 });
await controller.removeDevice('R1');
await controller.renameDevice('R1', 'Router1');
await controller.moveDevice('R1', 200, 150);

// Link management
await controller.addLink('R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1', 'straight');
await controller.removeLink('R1', 'GigabitEthernet0/0');

// Configuration
await controller.configHost('PC1', { ip: '192.168.1.10', mask: '255.255.255.0', gateway: '192.168.1.1' });
await controller.configIos('R1', ['hostname R1', 'interface Gig0/0', 'ip address 192.168.1.1 255.255.255.0']);

// Inspection
const snapshot = await controller.snapshot();
const devices = await controller.listDevices();
const vlanInfo = await controller.showVlan('S1');
const routingTable = await controller.showIpRoute('R1');

await controller.stop();
```

**VDOM (Virtual Topology)**:
```typescript
import { VirtualTopology } from '@cisco-auto/pt-control';

const vdom = new VirtualTopology();
vdom.subscribe('device-added', (event) => {
  console.log(`Device ${event.name} added at (${event.x}, ${event.y})`);
});
```

---

### @cisco-auto/file-bridge
**Purpose**: File-based bridge for CLI ↔ Packet Tracer communication

**Core Components**:

#### FileBridgeV2
```typescript
import { FileBridgeV2 } from '@cisco-auto/file-bridge';

const bridge = new FileBridgeV2({
  root: '~/pt-dev',  // Shared directory
  ttlMs: 5000,       // Lease TTL
  maxPending: 100    // Backpressure limit
});

bridge.start();

// Send command without waiting
bridge.sendCommand('addDevice', { name: 'R1', model: '2911' });

// Send command and wait for result
const result = await bridge.sendCommandAndWait('inspect', { name: 'R1' });

// Load runtime code
await bridge.loadRuntime(runtimeCode);
await bridge.loadRuntimeFromFile('~/pt-dev/runtime.js');

// Event streaming
bridge.on('device-added', (event) => {
  console.log(event);
});

bridge.stop();
```

#### DurableNdjsonConsumer
```typescript
import { DurableNdjsonConsumer } from '@cisco-auto/file-bridge';

const consumer = new DurableNdjsonConsumer({
  logPath: '~/pt-dev/logs/events.current.ndjson',
  statePath: '~/pt-dev/consumer-state/ndjson-consumer.json'
});

consumer.start();
consumer.on('event', (event) => {
  // Process event
  console.log(event.type, event.data);
});
```

---

### @cisco-auto/pt-runtime
**Purpose**: Generates runtime JavaScript files for Packet Tracer

**Generated Files**:
- `main.js`: PT Script Module entry point (file watcher, event listeners)
- `runtime.js`: Command handlers (hot-reloadable)

**Usage**:
```bash
# Generate runtime files
bun run pt:generate

# Deploy to PT directory
cp packages/pt-control/generated/main.js ~/pt-dev/main.js
cp packages/pt-control/generated/runtime.js ~/pt-dev/runtime.js
```

---

### @cisco-auto/tools
**Purpose**: Convenience tool exports

**Exports**:
```typescript
export {
  // Catalog tools
  listDevices,
  listModels,
  getDeviceCapabilities,

  // Deploy tools
  deployLab,
  validateLab,

  // Topology tools
  buildTopology,
  exportTopology
} from '@cisco-auto/core';
```

---

## Technology Stack

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| **Runtime** | Bun | 1.1+ | Superior performance, native TypeScript, built-in test runner |
| **Language** | TypeScript | 5.x | Strict typing, better developer experience |
| **CLI Framework** | Commander.js (apps), OCLIF (pt-control) | Latest | Standard for Node.js CLIs |
| **Validation** | Zod | 4.x | TypeScript-first schema validation |
| **YAML Parser** | js-yaml | Latest | Standard, reliable |
| **SSH Client** | node-ssh | Latest | Based on ssh2, well-maintained |
| **Logging** | Pino | 10.x | High-performance JSON logging |
| **XML Parser** | fast-xml-parser | 5.x | Fast, supports namespaces |
| **Testing** | Bun Test | Built-in | Fast, integrated |
| **File Watching** | Node.js fs.watch | Built-in | Cross-platform |

---

## Key Features

### 1. Real-time Packet Tracer Control
Control PT devices programmatically with ~100-200ms latency per command.

```bash
# Add devices
bun run pt device add R1 2911 100 100
bun run pt device add S1 2960-24TT 300 100
bun run pt device add PC1 pc 400 100

# Create links
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight

# Configure devices
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt config ios R1 hostname R1
bun run pt config ios R1 interface GigabitEthernet0/0
bun run pt config ios R1 ip address 192.168.1.1 255.255.255.0

# Inspect topology
bun run pt snapshot
bun run pt inspect S1
bun run pt show R1 show ip route
```

### 2. Declarative Lab Definitions
Define entire topologies in YAML with Zod validation.

```yaml
# labs/vlan-lab.yaml
name: VLAN Lab Example
description: Basic VLAN configuration lab

devices:
  - name: S1
    model: 2960-24TT
    type: switch
    x: 300
    y: 100

  - name: R1
    model: 2911
    type: router
    x: 100
    y: 100

  - name: PC1
    model: pc
    type: host
    x: 500
    y: 50
    config:
      ip: 192.168.10.10
      mask: 255.255.255.0
      gateway: 192.168.10.1

  - name: PC2
    model: pc
    type: host
    x: 500
    y: 150
    config:
      ip: 192.168.20.10
      mask: 255.255.255.0
      gateway: 192.168.20.1

links:
  - device1: R1:GigabitEthernet0/0
    device2: S1:GigabitEthernet0/1
    cableType: straight

vlans:
  - id: 10
    name: Students
  - id: 20
    name: Professors

trunkPorts:
  S1:
    - GigabitEthernet0/1

accessPorts:
  S1:
    - port: GigabitEthernet0/2
      vlan: 10
    - port: GigabitEthernet0/3
      vlan: 20

routing:
  ospf:
    processId: 1
    areas:
      - areaId: 0
        networks:
          - 192.168.10.0/24
          - 192.168.20.0/24
```

### 3. Automated Configuration Deployment
Deploy configs to real devices via SSH/Telnet.

```bash
# Generate configs from YAML
bun run cisco-auto config labs/vlan-lab.yaml --output ./configs

# Deploy to devices
bun run cisco-auto deploy labs/vlan-lab.yaml \
  --username admin \
  --password $PASSWORD \
  --parallel 5 \
  --save-config

# Validate deployment
bun run cisco-auto verify labs/vlan-lab.yaml
```

### 4. Multi-protocol Support

#### Layer 2 (Switching)
- VLANs (creation, naming, assignment)
- VTP (server/client/transparent, domain)
- STP (Rapid-PVST+, root bridge, PortFast, BPDU Guard)
- EtherChannel (LACP, PAgP)
- Port Security

#### Layer 3 (Routing)
- OSPF (single/multi-area, stub, NSSA, authentication)
- EIGRP (AS, authentication, summarization)
- BGP (peerings, attributes, route-maps)
- Static routing, RIP

#### Security
- ACLs (standard, extended, named, reflexive)
- NAT (static, dynamic, PAT, overload)
- VPN IPsec (site-to-site, GRE tunnels)

#### Services
- DHCP (server, relay)
- DNS (basic)
- NTP
- Syslog
- SNMP

#### IPv6
- Addressing
- Routing (OSPFv3, EIGRP for IPv6)
- Dual-stack

### 5. IOS Output Parsers
Parse `show` command output into structured data.

```typescript
import { parseShowIpInterfaceBrief, parseShowVlan } from '@cisco-auto/core';

const rawOutput = `
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up
GigabitEthernet0/1     unassigned      YES unset  down                  down
`;

const parsed = parseShowIpInterfaceBrief(rawOutput);
// Returns: [{ interface: 'GigabitEthernet0/0', ip: '192.168.1.1', status: 'up', ... }]
```

**Supported Parsers**:
- `show ip interface brief`
- `show vlan`
- `show ip route`
- `show running-config`
- `show interfaces`
- `show ip arp`
- `show mac address-table`
- `show spanning-tree`
- `show version`
- `show cdp neighbors`

---

## PT Control - Real-time Packet Tracer Control

### Setup (One-time)

```bash
# 1. Install dependencies
bun install

# 2. Create PT dev directory
mkdir -p ~/pt-dev

# 3. Generate runtime files
bun run pt:generate

# 4. Copy to PT directory
cp packages/pt-control/generated/main.js ~/pt-dev/main.js
cp packages/pt-control/generated/runtime.js ~/pt-dev/runtime.js

# 5. Open Packet Tracer
# File > Open > Select ~/pt-dev/main.js
# Or drag and drop main.js into PT
```

### Command Categories

#### Device Management
```bash
# Add device
bun run pt device add <name> <model> [x] [y]

# Remove device
bun run pt device remove <name>

# List devices
bun run pt device list [filter]

# Rename device
bun run pt device rename <oldName> <newName>

# Move device
bun run pt device move <name> <x> <y>
```

#### Link Management
```bash
# Add link
bun run pt link add <device1:port1> <device2:port2> [cableType]

# Remove link
bun run pt link remove <device> <port>
```

#### Configuration
```bash
# Configure host IP
bun run pt config host <name> <ip> [mask] [gateway] [dns]

# Configure IOS device
bun run pt config ios <name> <command1> [command2...]

# Apply VLANs
bun run pt vlan apply <switch> <vlan1> [vlan2...]

# Apply trunk ports
bun run pt trunk apply <switch> <port1> [port2...]

# Setup SSH
bun run pt ssh setup <router> --domain <domain> --user <username> --pass <password>
```

#### Inspection
```bash
# Get topology snapshot
bun run pt snapshot

# Inspect device
bun run pt inspect <name> [--include-xml]

# Execute show command
bun run pt show <device> <command>

# View command logs
bun run pt logs [--format json] [--tail 100]
```

### Controller API (Programmatic)

```typescript
import { createDefaultPTController } from '@cisco-auto/pt-control';

const controller = createDefaultPTController();
await controller.start();

try {
  // Add devices
  await controller.addDevice('R1', '2911', { x: 100, y: 100 });
  await controller.addDevice('S1', '2960-24TT', { x: 300, y: 100 });

  // Create link
  await controller.addLink('R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1', 'straight');

  // Configure
  await controller.configHost('PC1', {
    ip: '192.168.1.10',
    mask: '255.255.255.0',
    gateway: '192.168.1.1',
    dhcp: false
  });

  await controller.configIos('R1', [
    'hostname R1',
    'interface GigabitEthernet0/0',
    'ip address 192.168.1.1 255.255.255.0',
    'no shutdown'
  ]);

  // Inspect
  const snapshot = await controller.snapshot();
  console.log(`Devices: ${Object.keys(snapshot.devices).length}`);

  const vlanInfo = await controller.showVlan('S1');
  console.log('VLANs:', vlanInfo.vlans);

  const routes = await controller.showIpRoute('R1');
  console.log('Routes:', routes.routes);

} finally {
  await controller.stop();
}
```

---

## FileBridge Communication System

### Architecture

FileBridge uses the filesystem as IPC medium:

```
CLI (Bun)                          Packet Tracer
    │                                   │
    │ 1. Write command.json             │
    ├──────────────────────────────────▶│
    │                                   │
    │ 2. FileWatcher detects change     │
    │                                   │
    │ 3. Read command, execute via IPC  │
    │                                   │
    │ 4. Write result_<id>.json         │
    │◀──────────────────────────────────┤
    │                                   │
    │ 5. Read result, return to caller  │
    │                                   │
```

### File Layout (`~/pt-dev/`)

```
~/pt-dev/
├── command.json              # Current command (legacy, single-file mode)
├── runtime.js                # Hot-reloadable command handlers
├── main.js                   # PT Script Module entry point
├── state.json                # Topology snapshot cache
├── bridge-lease.json         # Single-instance lock
├── protocol.seq.json         # Sequence number store
├── commands/                 # Command queue (multi-file mode)
│   ├── 000000000001-addDevice.json
│   ├── 000000000002-addLink.json
│   └── ...
├── in-flight/                # Commands being processed
│   └── ...
├── results/                  # Command results
│   ├── cmd_000000000001.json
│   ├── cmd_000000000002.json
│   └── ...
├── logs/                     # NDJSON event journal
│   ├── events.current.ndjson
│   ├── events.2026-04-01.ndjson
│   └── ...
└── consumer-state/           # Consumer checkpoints
    └── ndjson-consumer.json
```

### Protocol

#### Command Envelope
```json
{
  "protocolVersion": 2,
  "id": "cmd_000000000042",
  "seq": 42,
  "createdAt": 1711234567890,
  "type": "addDevice",
  "payload": {
    "name": "R1",
    "model": "2911",
    "x": 100,
    "y": 100
  },
  "attempt": 1,
  "checksum": "sha256:abc123..."
}
```

#### Result Envelope
```json
{
  "protocolVersion": 2,
  "id": "cmd_000000000042",
  "seq": 42,
  "startedAt": 1711234567890,
  "completedAt": 1711234567950,
  "status": "completed",
  "ok": true,
  "value": {
    "name": "R1",
    "model": "2911",
    "x": 100,
    "y": 100,
    "power": true
  }
}
```

#### Event Format (NDJSON)
```json
{"seq":1,"ts":1711234567890,"type":"init","ownerId":"cli_abc123"}
{"seq":2,"ts":1711234567900,"type":"runtime-loaded","version":"2.2"}
{"seq":3,"ts":1711234567910,"type":"command-enqueued","id":"cmd_000000000001","type":"addDevice"}
{"seq":4,"ts":1711234567950,"type":"command-picked","id":"cmd_000000000001"}
{"seq":5,"ts":1711234568000,"type":"command-completed","id":"cmd_000000000001","ok":true}
{"seq":6,"ts":1711234568010,"type":"device-added","name":"R1","model":"2911","x":100,"y":100}
```

### Key Features

#### 1. LeaseManager - Single Instance Enforcement
Prevents multiple CLI instances from conflicting:
- Lease TTL: 5 seconds
- Renewal interval: 1 second
- Automatic expiration and recovery

#### 2. BackpressureManager - Flow Control
Prevents command flooding:
- Max pending: 100 commands
- Automatic wait or error on capacity exceeded

#### 3. CrashRecovery - Recovery After Crash
Recovers from crashes:
- Moves in-flight commands back to queue
- Increments attempt counter
- Logs recovery event

#### 4. GarbageCollector - Automatic Cleanup
Cleans up old files:
- Results older than 1 hour
- Rotated logs older than 24 hours
- Dead letter files

---

## Command Reference

### Main CLI (`bun run cisco-auto`)

```bash
# Lab management
cisco-auto lab parse <file>              # Parse lab YAML/PKT
cisco-auto lab validate <file>           # Validate lab file
cisco-auto lab create                    # Create new lab
cisco-auto lab list                      # List available labs
cisco-auto lab interactive <file>        # Interactive lab session
cisco-auto lab pipeline <file>           # CI/CD pipeline execution

# Configuration generation
cisco-auto config <file> --output <dir>  # Generate IOS configs

# Deployment
cisco-auto deploy <file> [options]       # Deploy to devices
  --dry-run                              # Preview commands
  --parallel <n>                         # Concurrent connections (default: 5)
  --timeout <s>                          # Connection timeout (default: 30)
  --save-config                          # Save to NVRAM
  --username <user>                      # SSH username
  --password <pass>                      # SSH password

# Validation
cisco-auto verify <file>                 # Validate deployed lab

# Device info
cisco-auto device list <file>            # List devices from lab

# Protocol-specific commands
cisco-auto vlan <subcommand>             # VLAN commands
cisco-auto routing <subcommand>          # Routing commands
cisco-auto acl <subcommand>              # ACL commands
cisco-auto stp <subcommand>              # STP commands
cisco-auto services <subcommand>         # Services commands
```

### PT Control CLI (`bun run pt`)

```bash
# Device commands
pt device add <name> <model> [x] [y]           # Add device
pt device remove <name>                        # Remove device
pt device list [filter]                        # List devices
pt device rename <old> <new>                   # Rename device
pt device move <name> <x> <y>                  # Move device

# Link commands
pt link add <dev1:port1> <dev2:port2> [type]   # Create link
pt link remove <dev> <port>                    # Remove link

# Configuration commands
pt config host <name> <ip> [mask] [gw] [dns]   # Configure host IP
pt config ios <name> <cmd1> [cmd2...]          # Configure IOS

# VLAN commands
pt vlan apply <switch> <vlan1> [vlan2...]      # Apply VLANs
pt trunk apply <switch> <port1> [port2...]     # Apply trunks

# SSH commands
pt ssh setup <router> --domain <d> --user <u> --pass <p>

# Inspection commands
pt snapshot                                    # Get topology snapshot
pt inspect <device> [--include-xml]            # Inspect device
pt show <device> <command>                     # Execute show command
pt logs [--format json] [--tail 100]           # View logs
```

---

## Development Conventions

### Bun-first Approach
```bash
# ✅ Correct
bun install
bun test
bun run <script>
bun <file>.ts
bunx <package>

# ❌ Incorrect
npm install
node <file>.ts
npx <package>
```

### TypeScript Configuration
- Strict mode enabled
- Module resolution: `bundler`
- Target: `ESNext`
- No implicit any

### Code Organization
- **Files**: kebab-case (`yaml-parser.ts`)
- **Classes**: PascalCase (`DeployOrchestrator`)
- **Functions**: camelCase (`parseShowIpInterfaceBrief`)
- **Types**: PascalCase with `Spec` suffix (`DeviceSpec`)
- **Tests**: Co-located (`*.test.ts` next to source)

### Testing
```typescript
import { test, expect } from 'bun:test';
import { parseShowIpInterfaceBrief } from './parser';

test('parseShowIpInterfaceBrief', () => {
  const output = `
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.1.1     YES manual up                    up
  `;

  const result = parseShowIpInterfaceBrief(output);
  expect(result).toHaveLength(1);
  expect(result[0].interface).toBe('GigabitEthernet0/0');
  expect(result[0].ip).toBe('192.168.1.1');
  expect(result[0].status).toBe('up');
});
```

### Logging
```typescript
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

logger.info({ device: 'R1', command: 'hostname R1' }, 'Configuring device');
```

---

## Lab Definition Format

### Complete Example

```yaml
# labs/ospf-lab.yaml
name: OSPF Multi-Area Lab
description: Configure OSPF with multiple areas including stub and NSSA
version: '1.0'

# Device definitions
devices:
  - name: R1
    model: 2911
    type: router
    x: 100
    y: 100
    interfaces:
      - name: GigabitEthernet0/0
        ip: 10.0.0.1/24
        description: Link to R2
      - name: GigabitEthernet0/1
        ip: 192.168.1.1/24
        description: LAN Segment

  - name: R2
    model: 2911
    type: router
    x: 300
    y: 100
    interfaces:
      - name: GigabitEthernet0/0
        ip: 10.0.0.2/24
        description: Link to R1
      - name: GigabitEthernet0/1
        ip: 20.0.0.1/24
        description: Link to R3

  - name: R3
    model: 2911
    type: router
    x: 500
    y: 100
    interfaces:
      - name: GigabitEthernet0/0
        ip: 20.0.0.2/24
        description: Link to R2

  - name: S1
    model: 2960-24TT
    type: switch
    x: 100
    y: 300

  - name: PC1
    model: pc
    type: host
    x: 100
    y: 400
    config:
      ip: 192.168.1.10
      mask: 255.255.255.0
      gateway: 192.168.1.1

# Links
links:
  - device1: R1:GigabitEthernet0/0
    device2: R2:GigabitEthernet0/0
    cableType: straight
  - device1: R2:GigabitEthernet0/1
    device2: R3:GigabitEthernet0/0
    cableType: straight
  - device1: R1:GigabitEthernet0/1
    device2: S1:GigabitEthernet0/1
    cableType: straight
  - device1: S1:GigabitEthernet0/2
    device2: PC1:FastEthernet0
    cableType: straight

# VLAN configuration (optional)
vlans:
  - id: 10
    name: Management

# OSPF configuration
routing:
  ospf:
    processId: 1
    routerId:
      R1: 1.1.1.1
      R2: 2.2.2.2
      R3: 3.3.3.3
    areas:
      - areaId: 0
        type: normal
        networks:
          - 10.0.0.0/24
      - areaId: 1
        type: stub
        networks:
          - 20.0.0.0/24
    redistribution:
      enabled: false

# Validation checks
validation:
  connectivity:
    - source: PC1
      destination: 10.0.0.1
      expected: success
  routing:
    - device: R1
      route: 20.0.0.0/24
      via: 10.0.0.2
  ospf:
    neighbors:
      - device: R1
        expected:
          - neighbor: 2.2.2.2
            state: FULL
```

---

## Supported Protocols

### Layer 2 (Switching)

| Protocol | Features | Status |
|----------|----------|--------|
| **VLANs** | Creation, naming, 802.1Q trunking | ✅ Implemented |
| **VTP** | Server/Client/Transparent, domain, pruning | ✅ Implemented |
| **STP** | Rapid-PVST+, root bridge, priority, PortFast, BPDU Guard | ✅ Implemented |
| **EtherChannel** | LACP (802.3ad), PAgP, load balancing | ✅ Implemented |
| **Port Security** | MAC address limiting, violation modes | ✅ Implemented |

### Layer 3 (Routing)

| Protocol | Features | Status |
|----------|----------|--------|
| **OSPF** | Single/multi-area, stub, NSSA, authentication, summarization | ✅ Implemented |
| **EIGRP** | AS configuration, authentication, summarization, stub | ✅ Implemented |
| **BGP** | Peerings, attributes, route-maps, filtering | 🟡 Partial |
| **Static** | Default routes, floating static | ✅ Implemented |
| **RIP** | RIPv2, authentication | 🟡 Partial |

### Security

| Feature | Capabilities | Status |
|---------|--------------|--------|
| **ACLs** | Standard, extended, named, reflexive | ✅ Implemented |
| **NAT** | Static, dynamic, PAT, overload | ✅ Implemented |
| **VPN** | IPsec site-to-site, GRE tunnels, IKE policies | 🟡 Partial |

### Services

| Service | Features | Status |
|---------|----------|--------|
| **DHCP** | Server, relay, pools, exclusions | ✅ Implemented |
| **DNS** | Basic server configuration | 🟡 Partial |
| **NTP** | Server, client, authentication | ✅ Implemented |
| **Syslog** | Server, severity levels | ✅ Implemented |
| **SNMP** | v2c, communities, traps | 🟡 Partial |

### IPv6

| Feature | Capabilities | Status |
|---------|--------------|--------|
| **Addressing** | Manual, EUI-64, SLAAC | ✅ Implemented |
| **Routing** | OSPFv3, EIGRP for IPv6 | 🟡 Partial |
| **Dual-stack** | IPv4/IPv6 coexistence | ✅ Implemented |

---

## AI Skills Integration

### Cisco Networking Assistant

The project includes AI skills for autonomous network automation:

**Location**: `.skills/cisco-networking-assistant/`

**Capabilities**:
1. **Lab File Analysis**: Parse and understand lab requirements
2. **Theory Explanations**: Explain networking concepts
3. **Configuration Generation**: Generate IOS configs from descriptions
4. **Troubleshooting**: Diagnose connectivity issues
5. **PT Control Automation**: Execute PT commands autonomously

**Usage with AI CLIs**:

#### iFlow CLI (Recommended)
```bash
cd cisco-auto
iflow
# Skill auto-loads from .iflow/skills/cisco-networking-assistant/
```

#### Gemini CLI
```bash
cd cisco-auto
gemini
# Skill auto-loads from .gemini/skills/
```

#### Claude Code
```bash
cd cisco-auto
claude
# Skill auto-loads from .claude/skills/
```

**Example Interactions**:
- "Configure VLANs 10 and 20 on Switch1 with ports assigned"
- "Analyze this lab file and complete it automatically"
- "The PCs in VLAN 10 can't ping VLAN 20, help me troubleshoot"
- "Generate Router-on-a-stick configuration for this topology"

---

## Common Workflows

### Workflow 1: New Lab from Scratch

```bash
# 1. Create lab YAML file
cat > labs/new-lab.yaml <<EOF
name: My Lab
devices:
  - name: R1
    model: 2911
    type: router
  - name: S1
    model: 2960-24TT
    type: switch
links:
  - device1: R1:Gig0/0
    device2: S1:Gig0/1
EOF

# 2. Validate lab file
bun run cisco-auto lab validate labs/new-lab.yaml

# 3. Generate configs
bun run cisco-auto config labs/new-lab.yaml --output ./configs

# 4. Deploy to PT (real-time)
bun run pt device add R1 2911 100 100
bun run pt device add S1 2960-24TT 300 100
bun run pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 straight

# 5. Apply configurations
bun run pt config ios R1 hostname R1
# ... more commands
```

### Workflow 2: VLAN Lab Deployment

```bash
# 1. Create VLAN lab
cat > labs/vlan-lab.yaml <<EOF
name: VLAN Lab
devices:
  - name: S1
    model: 2960-24TT
    type: switch
vlans:
  - id: 10
    name: Students
  - id: 20
    name: Professors
trunkPorts:
  S1:
    - GigabitEthernet0/1
accessPorts:
  S1:
    - port: GigabitEthernet0/2
      vlan: 10
EOF

# 2. Deploy with PT Control
bun run pt vlan apply S1 10 20
bun run pt trunk apply S1 GigabitEthernet0/1

# 3. Verify
bun run pt show S1 show vlan
```

### Workflow 3: OSPF Multi-Area

```bash
# 1. Create OSPF lab (see Lab Definition Format above)

# 2. Deploy routers
bun run pt device add R1 2911 100 100
bun run pt device add R2 2911 300 100
bun run pt link add R1:Gig0/0 R2:Gig0/0 straight

# 3. Configure interfaces
bun run pt config ios R1 interface GigabitEthernet0/0
bun run pt config ios R1 ip address 10.0.0.1 255.255.255.0
bun run pt config ios R1 no shutdown

# 4. Configure OSPF
bun run pt config ios R1 router ospf 1
bun run pt config ios R1 network 10.0.0.0 0.0.0.255 area 0

# 5. Verify
bun run pt show R1 show ip ospf neighbor
bun run pt show R1 show ip route
```

### Workflow 4: Troubleshooting Session

```bash
# 1. Get topology snapshot
bun run pt snapshot --format json > snapshot.json

# 2. Inspect problematic device
bun run pt inspect S1 --include-xml

# 3. Check interface status
bun run pt show S1 show ip interface brief

# 4. Check VLAN configuration
bun run pt show S1 show vlan

# 5. View command logs
bun run pt logs --tail 50 --format json

# 6. Test connectivity (if PC configured)
bun run pt execIos PC1 ping 192.168.1.1
```

---

## Troubleshooting

### Common Issues

#### 1. FileBridge Not Connecting

**Symptoms**: Commands timeout, no results returned

**Solutions**:
```bash
# Check if PT is running
ps aux | grep Packet

# Check ~/pt-dev directory exists
ls -la ~/pt-dev/

# Verify main.js is loaded in PT
# (Check PT window for script console)

# Restart FileBridge
bun run pt device list

# Check lease file
cat ~/pt-dev/bridge-lease.json
# If stale, delete and restart
rm ~/pt-dev/bridge-lease.json
```

#### 2. Runtime Not Loading

**Symptoms**: "Unknown command" errors, runtime.js not found

**Solutions**:
```bash
# Regenerate runtime
bun run pt:generate

# Copy to PT directory
cp packages/pt-control/generated/main.js ~/pt-dev/main.js
cp packages/pt-control/generated/runtime.js ~/pt-dev/runtime.js

# Reload in PT (File > Open > main.js)
# Or edit runtime.js and save (hot reload)
```

#### 3. Commands Failing in PT

**Symptoms**: Commands return errors, devices not created

**Solutions**:
```bash
# Check PT console for errors
# (Window > Console in Packet Tracer)

# Verify device model is valid
bun run pt device list --all

# Check command logs
bun run pt logs --tail 100

# Try with verbose output
bun run pt device add R1 2911 100 100 --verbose
```

#### 4. SSH Connection Failures

**Symptoms**: Can't connect to real devices, timeout errors

**Solutions**:
```bash
# Test SSH connectivity manually
ssh admin@192.168.1.1

# Check firewall rules
sudo ufw status  # Linux
pfctl -s rules   # macOS

# Verify credentials
export PASSWORD="your-password"
bun run cisco-auto deploy lab.yaml --username admin --password $PASSWORD

# Increase timeout
bun run cisco-auto deploy lab.yaml --timeout 60
```

#### 5. YAML Validation Errors

**Symptoms**: Lab file fails validation, schema errors

**Solutions**:
```bash
# Validate with detailed output
bun run cisco-auto lab validate labs/broken.yaml --verbose

# Check YAML syntax
python3 -c "import yaml; yaml.safe_load(open('labs/broken.yaml'))"

# Use JSON schema validator
npx ajv-cli validate -s packages/types/src/schemas/lab.json -d labs/broken.yaml
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set log level
export DEBUG=cisco-auto:*
export LOG_LEVEL=debug

# Run with verbose flag
bun run pt device add R1 2911 100 100 --verbose

# View debug logs
bun run pt logs --level debug --tail 200
```

### Getting Help

```bash
# General help
bun run cisco-auto --help
bun run pt --help

# Command-specific help
bun run pt device add --help
bun run pt vlan apply --help

# Check version
bun run cisco-auto --version
bun run pt --version

# Report issues
# GitHub: https://github.com/AndresGaibor/cisco-auto/issues
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    CISCO-AUTO QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SETUP                                                          │
│  bun install                         # Install dependencies     │
│  mkdir -p ~/pt-dev                   # Create PT directory      │
│  bun run pt:generate                 # Generate runtime         │
│  cp generated/*.js ~/pt-dev/         # Deploy to PT             │
│                                                                 │
│  DEVICES                                                        │
│  pt device add R1 2911 100 100       # Add device               │
│  pt device remove R1                 # Remove device            │
│  pt device list                      # List devices             │
│  pt device move R1 200 150           # Move device              │
│                                                                 │
│  LINKS                                                          │
│  pt link add R1:G0/0 S1:G0/1 straight  # Create link            │
│  pt link remove R1 G0/0              # Remove link              │
│                                                                 │
│  CONFIGURATION                                                  │
│  pt config host PC1 192.168.1.10     # Configure IP             │
│  pt config ios R1 hostname R1        # IOS config               │
│  pt vlan apply S1 10 20              # Apply VLANs              │
│  pt trunk apply S1 G0/1              # Apply trunk              │
│  pt ssh setup R1 --domain lab.local  # Setup SSH                │
│                                                                 │
│  INSPECTION                                                     │
│  pt snapshot                         # Get topology             │
│  pt inspect S1                       # Inspect device           │
│  pt show R1 show ip route            # Execute show             │
│  pt logs --tail 100                  # View logs                │
│                                                                 │
│  MAIN CLI                                                       │
│  cisco-auto lab validate lab.yaml    # Validate lab             │
│  cisco-auto config lab.yaml          # Generate configs         │
│  cisco-auto deploy lab.yaml          # Deploy via SSH           │
│  cisco-auto verify lab.yaml          # Validate deployment      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**End of Context Document**

For more information:
- 📖 [README.md](./README.md) - User documentation
- 📋 [PRD.md](./PRD.md) - Product requirements
- 📚 [docs/](./docs/) - Technical guides
- 💻 [packages/pt-control/README.md](./packages/pt-control/README.md) - PT Control API docs
