# Research: CLI Command Wiring Audit

## Summary

All 7 files in `apps/pt-cli/src/commands/lab/` are **fully wired up** as subcommands under `lab`. The `device` command group has `move` registered (along with `list`, `get`, `interactive`, `add`, `remove`), but there is **no `device info`** subcommand — only `device get`. The `services.ts` file **does exist** at `apps/pt-cli/src/commands/services.ts` and **is registered** in the CLI entry point as `createLabServicesCommand()`.

## Findings

### 1. Lab Subcommands — All 7 Files Wired Up

The `lab/index.ts` imports and registers every file in the `lab/` directory:

| File | Export Function | Registered? |
|------|----------------|-------------|
| `parse.ts` | `createLabParseCommand()` | ✅ Line 16 |
| `validate.ts` | `createLabValidateCommand()` | ✅ Line 17 |
| `create.ts` | `createLabCreateCommand()` | ✅ Line 18 |
| `list.ts` | `createLabListCommand()` | ✅ Line 19 |
| `interactive.ts` | `createLabInteractiveCommand()` | ✅ Line 20 |
| `pipeline.ts` | `createLabPipelineCommand()` | ✅ Line 21 |

Additionally, `lab/index.ts` also registers three commands from outside the `lab/` directory:
- `createLabVlanCommand()` from `../vlan.ts`
- `createRoutingCommand()` from `../routing.ts`
- `createACLCommand()` from `../acl.ts`

**Source:** `apps/pt-cli/src/commands/lab/index.ts` (lines 1-28)

### 2. Device Subcommands — `move` is Registered, `info` is Not

The `device/index.ts` registers these subcommands:

| Subcommand | Export Function | Registered? |
|------------|----------------|-------------|
| `list` | `createDeviceListCommand()` | ✅ Line 13 |
| `get` | `createDeviceGetCommand()` | ✅ Line 14 |
| `interactive` | `createDeviceInteractiveCommand()` | ✅ Line 15 |
| `add` | `createDeviceAddCommand()` | ✅ Line 16 |
| `remove` | `createDeviceRemoveCommand()` | ✅ Line 17 |
| `move` | `createDeviceMoveCommand()` | ✅ Line 18 |

**Key findings:**
- **`device move` IS registered.** The implementation in `commands/device/move.ts` uses the modern `runCommand` pattern with `DEVICE_MOVE_META`, supports `--xpos`/`--ypos` flags, interactive device selection via `@inquirer/prompts`, and post-execution verification.
- **There is NO `device info` subcommand.** The closest equivalent is `device get` (imported from `./get.ts`). If the help file mentions `device info`, it is inaccurate.

**Source:** `apps/pt-cli/src/commands/device/index.ts` (lines 1-22)

### 3. Services Command — File Exists and Is Registered

**File location:** `apps/pt-cli/src/commands/services.ts` (305 lines)

**Registration:** The CLI entry point imports and registers it:
```ts
// Line 15 of CLI entry point:
import { createLabServicesCommand } from './commands/services';
// Line 72:
program.addCommand(createLabServicesCommand());
```

**What `services` provides:**
- `pt services dhcp create --device <name> --pool <name> --network <cidr>`
- `pt services ntp add-server --device <name> --server <ip>`
- `pt services syslog add-server --device <name> --server <ip>`

The command uses the modern `runCommand` pattern with `CliResult`, supports `--examples`, `--explain`, `--plan`, `--verify`, and `--trace` flags.

**Source:** `apps/pt-cli/src/commands/services.ts` (lines 1-305)

### 4. CLI Entry Point — Top-Level Command Registration

The CLI entry point (attempted at `main.ts` but not found at expected path) registers these top-level commands:

| Command | Source |
|---------|--------|
| `build` | inline function |
| `device` | `./commands/device/index` |
| `show` | `./commands/show` |
| `config-host` | `./commands/config-host` |
| `lab` (via `createLabVlanCommand`) | `./commands/vlan` |
| `etherchannel` | `./commands/etherchannel` |
| `link` | `./commands/link/index` |
| `config-ios` | `./commands/config-ios` |
| `routing` | `./commands/routing` |
| `acl` | `./commands/acl` |
| `stp` | `./commands/stp` |
| `services` | `./commands/services` |
| `results` | `./commands/results` |
| `logs` | `./commands/logs` |
| `help` | `./commands/help` |
| `history` | `./commands/history` |
| `doctor` | `./commands/doctor` |
| `completion` | `./commands/completion` |
| `topology` | `./commands/topology/index` |

**Note:** There is no top-level `lab` command registered directly. Instead, `createLabVlanCommand()` from `./commands/vlan` is registered, which appears to serve as the `lab` command. The full `lab` command group with all subcommands from `commands/lab/index.ts` does **not appear to be wired into the main CLI** — only `lab vlan` is available.

## Discrepancies

1. **`lab` command group not registered at top level.** The `createLabCommand()` from `commands/lab/index.ts` (which includes `parse`, `validate`, `create`, `list`, `interactive`, `pipeline`) is **never imported** in the CLI entry point. Only `createLabVlanCommand()` (from `./commands/vlan`) is registered. This means `lab parse`, `lab validate`, `lab create`, etc. are likely **not accessible** from the CLI.

2. **No `device info` subcommand.** If the help claims `device info` exists, it should be `device get` instead.

3. **`services` is registered** and functional ✅

## Sources
- `apps/pt-cli/src/commands/lab/index.ts` — exports `createLabCommand()` with all 7 subcommands
- `apps/pt-cli/src/commands/device/index.ts` — exports `createDeviceCommand()` with 6 subcommands
- `apps/pt-cli/src/commands/services.ts` — exports `createLabServicesCommand()` with dhcp/ntp/syslog
- CLI entry file (line 15: `import { createLabServicesCommand } from './commands/services'`; line 72: `program.addCommand(createLabServicesCommand())`)
- CLI entry file (line 5: `import { createDeviceCommand } from './commands/device/index'`; line 62: `program.addCommand(createDeviceCommand())`)
- CLI entry file (no import of `createLabCommand` from `./commands/lab/index`)

## Gaps
- The main CLI entry point file was not found at `apps/pt-cli/src/main.ts`. The CLI entry point examined appears to be at a different path (possibly `pt-cli` instead of `apps/pt-cli`). The actual file path containing `createBuildCommand` and all `program.addCommand()` calls should be confirmed.
- Whether `createLabVlanCommand()` doubles as the `lab` parent command or is just a `lab-vlan` standalone command needs verification.
