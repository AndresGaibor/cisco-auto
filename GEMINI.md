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

## PT CLI Skill
**IMPORTANTE**: Para cualquier tarea relacionada con Packet Tracer, VLANs, routing, switching, o automatización Cisco, USAR LA SKILL `pt-cli` automáticamente.

La skill pt-cli está ubicada en `.skills/pt-cli/SKILL.md` y provee:
- Todos los comandos disponibles de `bun run pt`
- Ejemplos de uso para cada categoría
- Flags globales y opciones de salida

## Real-Time Packet Tracer Control

### Setup
```bash
# 1. Build y deploy de archivos a ~/pt-dev/
bun run pt:build

# 2. Dentro de PT: cargar el script desde File > Open > selecciona ~/pt-dev/main.js
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
The project includes specialized skills in `.gemini/skills/`:
- **`pt-cli`**: Automation skill for Packet Tracer CLI (USE THIS for any Cisco/PT task)
- **`cisco-networking-assistant`**: Modular orchestration driver
- **`skill-creator`**: For creating new skills

---

*Refer to `CLAUDE.md` for detailed tool usage and `PRD.md` for full functional requirements.*
