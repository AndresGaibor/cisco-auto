# cisco-auto — Instructional Context

This file serves as the primary instructional context for Gemini CLI interactions within the `cisco-auto` project. It outlines the project's purpose, architecture, development standards, and key operational commands.

## Project Overview
**cisco-auto** is a powerful automation tool designed to simplify and accelerate the configuration, deployment, and validation of Cisco Packet Tracer laboratories and real network equipment. It targets a drastic reduction in configuration time (from 45 minutes to under 2 minutes) while ensuring topology compliance through a declarative approach.

### Core Technologies
- **Runtime:** [Bun](https://bun.sh/) (v1.1+ mandatory). **Do NOT use Node.js or npm.**
- **Language:** TypeScript (Strict mode).
- **Validation:** Zod.
- **CLI Framework:** Commander.js.
- **Connectivity:** `node-ssh` (SSH) and Telnet (fallback).
- **Cryptography:** Custom implementation for PKA/PKT decoding (XOR + Twofish CBC + zlib).

## Architecture (Monorepo)
The project is structured as a monorepo using Bun workspaces:

- **`apps/pt-cli`**: The main Command Line Interface.
- **`packages/core`**: Business logic, orchestrators, and topology building.
- **`packages/pt-control`**: Real-time control engine for Cisco Packet Tracer.
- **`packages/file-bridge`**: Communication bridge between the CLI and Packet Tracer.
- **`packages/pt-runtime`**: Generates the runtime environment for Packet Tracer scripts.
- **`packages/types`**: Shared TypeScript definitions.

## Building and Running
Always use `bun` for development tasks.

### Key Commands
- **Install Dependencies:** `bun install`
- **Start CLI:** `bun run pt` or `bun run cisco-auto`
- **Run Tests:** `bun test`
- **Build Project:** `bun run build`
- **Type Check:** `bun run typecheck`
- **Packet Tracer Control Setup:** `bash scripts/setup-pt-control.sh`

## Development Conventions
Adhere to these standards to maintain consistency and quality:

- **Runtime:** Strictly use Bun. Prefer `Bun.file` and `Bun.serve` over Node equivalents.
- **TypeScript:** Use strict typing. Avoid `any`. Leverage Zod for runtime schema validation.
- **Naming:** Follow camelCase for variables/functions and PascalCase for classes/types.
- **Messages:** User-facing CLI messages should be in **Spanish**, while code, comments, and internal documentation are in **English**.
- **Testing:** New features or bug fixes must include tests using `bun:test`.
- **Environment:** Bun automatically loads `.env` files; do not use `dotenv`.

## Real-Time Packet Tracer Control
To control Packet Tracer in real-time:
1. Ensure Packet Tracer is open.
2. Run the setup script: `cd packages/pt-control && bun run scripts/setup-pt-control.sh`.
3. In Packet Tracer: Open `File > Open` and select `pt-scripts/main.ts`.
4. Use the CLI commands (e.g., `bun run pt device add ...`) to interact with the running instance.

## AI Skills Integration
The project includes a specialized skill: **Cisco Networking Assistant**.
- **Location:** `.gemini/skills/cisco-networking-assistant/`
- **Purpose:** Enables Gemini to act as a Cisco expert, helping with VLAN configurations, OSPF deployment, troubleshooting, and more.
- **Usage:** This skill is automatically loaded when running `gemini` within the project root.

---
*Refer to `CLAUDE.md` for detailed tool usage and `PRD.md` for full functional requirements.*
