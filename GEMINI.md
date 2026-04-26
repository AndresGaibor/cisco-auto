# cisco-auto — Instructional Context

This file serves as the primary instructional context for Gemini CLI interactions within the `cisco-auto` project. It outlines the project's purpose, architecture, development standards, and key operational commands.

## Project Overview
**cisco-auto** is a professional-grade Network Intelligence and Automation platform for Cisco Packet Tracer (v9.0). It is designed to act as a **Virtual CCIE**, allowing users to build, iterate, debug, and validate complex network topologies (like the 76 CCNA Scenarios) directly from the command line.

It transcends basic configuration by utilizing an "Omniscience Layer" that hooks directly into the C++ engine of the simulator via QtScript, bypassing standard API limitations.

### Core Technologies
- **Runtime:** [Bun](https://bun.sh/) (v1.1+ mandatory). **Do NOT use Node.js or npm.**
- **Language:** TypeScript (Strict mode).
- **Validation:** Zod.
- **CLI Framework:** Commander.js.
- **Communication:** FileBridge (file-based IPC to Packet Tracer).

## Architecture (Monorepo)
The project is structured as a monorepo using Bun workspaces:

- **`apps/pt-cli`**: The main Command Line Interface (`bun run pt`). This is the primary tool for building and validating labs (e.g., `pt device add`, `pt link add`, `pt lab validate`).
- **`packages/pt-runtime`**: The ES5 Kernel injected into Packet Tracer. Contains the Omniscience handlers (Bypasses, Memory Injection, XML Genomes).
- **`packages/pt-control`**: The rich, type-safe TypeScript abstraction layer (e.g., `OmniscienceService`, `ScenarioService`).
- **`packages/pt-control`**: Packet Tracer orchestration, controller, application use cases.
- **`packages/ios-domain`**: IOS parsers, builders, capabilities and operations.
- **`packages/network-intent`**: Declarative network intent and scenarios.
- **`packages/file-bridge`**: Communication bridge between the CLI and Packet Tracer.
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

## Protocolo de Terminal Determinista
Toda la ejecución de terminal en PT (IOS o Host) está gobernada por el `CommandExecutor`, que usa estabilización de output (250ms) y es inmune a bloqueos DNS o Power OFF.
- **Acceso rápido a comandos:** Usa siempre `bun run pt cmd <device> "<command>"` para ejecutar comandos individuales de forma robusta.
- **Historial:** Usa `bun run pt history <device>` para ver la bitácora de la consola con los comandos y outputs separados.

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
