# Architecture Refactoring Plan: Migrating CLI from `pt-control` to `apps/`

## Goal
Ensure a strict architectural boundary where `packages/pt-control/` only contains core logic and programmatic APIs, and all CLI entry points and command logic reside in the `apps/` directory (specifically `apps/pt-cli/` and/or `apps/cli/`). Remove all legacy CLI code from `pt-control`.

## Current State Analysis
- `packages/pt-control/src/cli/` uses `@oclif/core` and wraps `PTController` calls.
- `apps/pt-cli/` uses `commander` and sometimes directly imports `@cisco-auto/file-bridge` or `PtController`.
- There's a disconnect: `pt-control` has many granular canvas/device/link operations that are missing in `apps/pt-cli`.

## Implementation Steps

### 1. Audit and Map Commands (Detailed Mapping)
**Commands in `pt-control` to migrate/port to `apps/pt-cli`:**
- `canvas` (clear, get, inspect, list) -> *Create new `canvas` command in `apps/pt-cli`*
- `config` (host, ios, show) -> *Create new `config` command or merge with existing*
- `device` (add, inspect, list-bridge, list, move, remove, rename) -> *Merge with `apps/pt-cli/src/commands/device/`*
- `link` (add, list, remove) -> *Create new `link` command in `apps/pt-cli`*
- `logs` (unified) -> *Create new `logs` command in `apps/pt-cli`*
- `record` (start, stop) -> *Create new `record` command in `apps/pt-cli`*
- `runtime` (build, deploy, doctor, events, status, watch) -> *Create new `runtime` command in `apps/pt-cli`*
- `snapshot` (diff, load, save) -> *Create new `snapshot` command in `apps/pt-cli`*
- `ssh` (setup) -> *Create new `ssh` command in `apps/pt-cli`*
- `topology` (apply, read, validate) -> *Merge with `apps/pt-cli/src/commands/topology/`*
- `trunk` (apply) -> *Create new `trunk` command or merge with `vlan`/`stp`*
- `vlan` (apply) -> *Merge with `apps/pt-cli/src/commands/vlan.ts`*

### 2. Extract Core Logic from `pt-control/src/cli`
- Review all commands in `packages/pt-control/src/cli/commands/`.
- Most logic in `pt-control/src/cli` currently orchestrates `PTController`. If any command contains raw business logic (like manual validation or state parsing), extract it to `PTController` or utilities in `pt-control/src/`.

### 3. Migrate CLI Code to `apps/pt-cli`
- Recreate the mapped command structure using `commander` in `apps/pt-cli/src/commands/`.
- Translate `@oclif/core` arguments/flags into `commander` options.
- Wire the commands to instantiate and use `createDefaultPTController()` from `pt-control`.
- Use the standard output formatters defined in `apps/pt-cli/src/output/formatters/`.

### 4. Remove CLI from `pt-control`
- Delete `packages/pt-control/src/cli/`.
- Delete `packages/pt-control/bin/` (including `dev.js`).
- Remove `commander`, `@oclif/core` and CLI-specific dependencies from `packages/pt-control/package.json`.
- Clean up exports in `packages/pt-control/src/index.ts`.

### 5. Consolidate `apps/`
- Review if `apps/cli` is still needed. Ensure `apps/pt-cli` is the single source of truth for CLI.

### 6. Testing & Validation
- Ensure all ported commands compile.
- Run `apps/pt-cli/__tests__`.
- Run manual validation of key ported commands (e.g. `device list`, `vlan apply`).