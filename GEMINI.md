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

## Architecture (Monorepo)
- `apps/cli/`: Entry point and command definitions.
- `packages/core/`: Core business logic, domain models, and orchestrators.
- `packages/lab-model/`: Canonical domain model for labs.
- `packages/bridge/`: Integration with Packet Tracer Bridge.
- `packages/import-yaml/`: YAML parsing and validation.
- `packages/import-pka/`: PKA/PKT decoding and encoding.
- `packages/crypto/`: Cryptographic utilities (Twofish).
- `packages/device-catalog/`: Database of Cisco device specifications.
- `packages/topology/`: Topology analysis and visualization.

## Building and Running

### Installation
```bash
bun install
```

### Main Commands
```bash
# Run the CLI
bun run apps/cli/src/index.ts --help

# Parse a .pka file
bun run apps/cli/src/index.ts parse-pka <path_to_pka>

# Generate configurations
bun run apps/cli/src/index.ts config <path_to_yaml> --output ./configs
```

# Validate a lab definition
bun run apps/cli/src/index.ts validate <path_to_yaml>

# List devices in a lab
bun run apps/cli/src/index.ts devices <path_to_yaml>
```

### Testing
```bash
bun test
```

## Development Conventions
- **Bun First:** Use `bun` for running, testing, and building.
- **Type Safety:** Always use Zod schemas in `packages/core/src/types/` for any new network property.
- **Language:** User-facing CLI messages and documentation should be in **Spanish**.

## Key Files
- `packages/core/src/types/topology.ts`: Definitions for routers, switches, etc.
- `packages/import-pka/src/decoder.ts`: Logic for decrypting Packet Tracer files.
- `packages/core/src/config-generators/ios-generator.ts`: Logic for turning types into IOS commands.
- `PRD.md`: Full product requirements and roadmap.
- `CLAUDE.md`: Coding standards and Bun-specific instructions.
