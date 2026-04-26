## Goal
Fix SyntaxError and missing export in pt-cli related to the VLAN command.

## Instructions
Keep the command name as 'vlan' and the export as 'createVlanCommand', not 'createLabVlanCommand'.

## Discoveries
- The error was caused by a mismatch between the export name in `apps/pt-cli/src/commands/vlan.ts` (`createVlanCommand`) and its import in `apps/pt-cli/src/commands/command-registry.ts` (`createLabVlanCommand`).

## Accomplished
- Updated `apps/pt-cli/src/commands/command-registry.ts` to import `createVlanCommand`.
- Updated `COMMAND_FACTORIES` in `command-registry.ts` to use `createVlanCommand`.
- Verified that the CLI now starts without errors using `pt --help`.

## Next Steps
- Monitor for any other command registration mismatches.

## Relevant Files
- apps/pt-cli/src/commands/vlan.ts — [Exported function createVlanCommand]
- apps/pt-cli/src/commands/command-registry.ts — [Registered commands, updated import and usage]
