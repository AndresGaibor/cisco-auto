# cisco-auto — Instructional Context

This file serves as the primary instructional context for Gemini CLI interactions within the `cisco-auto` project. It outlines the project's purpose, architecture, development standards, and key operational commands.

## Project Overview
**cisco-auto** is a powerful automation tool designed to simplify and accelerate the configuration, deployment, and validation of Cisco Packet Tracer laboratories and real network equipment. It targets a drastic reduction in configuration time (from 45 minutes to under 2 minutes) while ensuring topology compliance through a declarative approach.

### Core Technologies
- **Runtime:** [Bun](https://bun.sh/) (v1.1+ mandatory). **Do NOT use Node.js or npm.**
- **Language:** TypeScript (Strict mode).
- **Validation:** Zod.
- **CLI Framework:** Commander.js.
- **Communication:** FileBridge (file-based bridge to Packet Tracer).

## Architecture (Monorepo)
The project is structured as a monorepo using Bun workspaces:

- **`apps/pt-cli`**: The main Command Line Interface (`bun run pt`).
- **`packages/core`**: Business logic, orchestrators, and topology building.
- **`packages/pt-control`**: Real-time control engine for Cisco Packet Tracer.
- **`packages/file-bridge`**: Communication bridge between the CLI and Packet Tracer.
- **`packages/pt-runtime`**: Generates the runtime environment for Packet Tracer scripts.
- **`packages/types`**: Shared TypeScript definitions.

## Building and Running
Always use `bun` for development tasks.

### Key Commands
- **Install Dependencies:** `bun install`
- **Start CLI:** `bun run pt`
- **Run Tests:** `bun test`
- **Build Project:** `bun run build`
- **Type Check:** `bun run typecheck`

## Real-Time Packet Tracer Control

### Setup
```bash
# 1. Build y deploy de archivos a ~/pt-dev/
bun run pt:build

# 2. Dentro de PT: cargar el script desde File > Open > selecciona ~/pt-dev/main.js
```

### CLI Commands (all via `bun run pt`)
```bash
# Ver ayuda
bun run pt --help

# Device management
bun run pt device list
bun run pt device add R1 2911
bun run pt device remove R1
bun run pt device move R1 --xpos 300 --ypos 200

# Show commands
bun run pt show ip-int-brief R1
bun run pt show vlan Switch1
bun run pt show ip-route R1
bun run pt show run-config R1

# Configuration
bun run pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0
bun run pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0

# VLANs
bun run pt vlan create --id 10 --name DATA
bun run pt vlan apply Switch1 10 20 30

# Trunk
bun run pt vlan trunk Switch1 GigabitEthernet0/1

# Routing
bun run pt routing static add --device R1 --network 192.168.10.0 --mask 255.255.255.0 --next-hop 192.168.1.1

# ACL
bun run pt acl create --name ACLExt --type extended
bun run pt acl add-rule --name ACLExt --rule "permit tcp any host 192.168.1.1 eq 80"
```

### Platform-Aware Directory
- **macOS/Linux:** `~/pt-dev/`
- **Windows:** `%USERPROFILE%\pt-dev\`
- Override: Set `PT_DEV_DIR` environment variable

## Development Conventions
Adhere to these standards to maintain consistency and quality:

- **Runtime:** Strictly use Bun. Prefer `Bun.file` and `Bun.serve` over Node equivalents.
- **TypeScript:** Use strict typing. Avoid `any`. Leverage Zod for runtime schema validation.
- **Naming:** Follow camelCase for variables/functions and PascalCase for classes/types.
- **Messages:** User-facing CLI messages should be in **Spanish**, while code, comments, and internal documentation are in **English**.
- **Testing:** New features or bug fixes must include tests using `bun:test`.
- **Environment:** Bun automatically loads `.env` files; do not use `dotenv`.

## AI Skills Integration
The project includes specialized skills. Refer to `.gemini/skills/` for available AI assistants.

---
*Refer to `CLAUDE.md` for detailed tool usage and `PRD.md` for full functional requirements.*
