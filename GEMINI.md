# 🧠 GEMINI.md - cisco-auto (Cisco Packet Tracer Automation)

## Project Overview
**cisco-auto** is a tool specifically designed to automate the configuration and validation of Cisco Packet Tracer laboratories. It targets ESPOCH networking students to reduce configuration time and human errors.

### Key Capabilities
- **PKA/PKT Decoding:** Reverse-engineered 4-stage decoding (XOR + Twofish CBC + zlib) to extract XML from Packet Tracer save files.
- **Declarative Topology:** Define network topologies using YAML schemas validated by Zod.
- **IOS Config Generation:** Generate full Cisco IOS configurations (VLANs, VTP, OSPF, EIGRP, ACLs, NAT, etc.) based on topology definitions.
- **Automated Deployment:** Deploy configurations to multiple devices in parallel via SSH.
- **Validation:** Automated connectivity and configuration verification.

## Technology Stack
- **Runtime:** [Bun](https://bun.sh/) (Mandatory)
- **Language:** TypeScript
- **CLI:** Commander.js
- **Validation:** Zod
- **SSH:** node-ssh (ssh2)
- **Cryptography:** twofish-ts
- **Logging:** Pino

## Architecture
- `src/cli/`: Entry point and command definitions (`parse`, `config`, `deploy`, `verify`, `parse-pka`).
- `src/core/parser/`: 
    - `pka-decoder.ts`: The complex 4-stage decryption logic for .pka files.
    - `yaml-parser.ts`: Loads and validates lab definitions.
- `src/core/config-generators/`: `ios-generator.ts` uses templates to create executable IOS commands.
- `src/core/connector/`: `ssh-connector.ts` manages SSH sessions and parallel execution.
- `src/core/types/`: `topology.ts` contains the "Source of Truth" schemas for all network entities.
- `src/templates/`: Version-specific IOS command templates.

## Building and Running

### Installation
```bash
bun install
```

### Main Commands
```bash
# Run the CLI
bun start

# Parse a .pka file to extract XML/Devices
bun run src/cli/index.ts parse-pka <path_to_pka>

# Generate configurations from a YAML lab definition
bun run src/cli/index.ts config <path_to_yaml> --output ./configs

# Validate a lab definition
bun run src/cli/index.ts validate <path_to_yaml>

# List devices in a lab
bun run src/cli/index.ts devices <path_to_yaml>
```

### Testing
```bash
bun test
```

## Development Conventions
- **Bun First:** Use `bun` for running, testing, and building. Never use `npm` or `node`.
- **Type Safety:** Always use Zod schemas in `src/core/types/topology.ts` for any new network property.
- **Language:** User-facing CLI messages and documentation should be in **Spanish**, as it targets students in Ecuador.
- **Modular Generators:** When adding support for a new protocol (e.g., BGP), create a dedicated method in `IOSGenerator` and update the `DeviceSchema`.
- **Parallelism:** Use `executeInParallel` from `ssh-connector.ts` for any operation involving multiple devices.

## Key Files
- `src/core/types/topology.ts`: Definitions for routers, switches, interfaces, and protocols.
- `src/core/parser/pka-decoder.ts`: Logic for decrypting Packet Tracer files.
- `src/core/config-generators/ios-generator.ts`: Logic for turning types into IOS commands.
- `PRD.md`: Full product requirements and roadmap.
- `CLAUDE.md`: Coding standards and Bun-specific instructions.
