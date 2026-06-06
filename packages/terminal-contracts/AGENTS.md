# AGENTS.md — @cisco-auto/terminal-contracts

> Guía de desarrollo para agentes de IA que trabajan en terminal-contracts.

## Propósito

Contratos compartidos de terminal/planes: tipos puros para ejecución de comandos, resultados, errores y evidencia. **Dependencia cero** (sin imports externos).

## Arquitectura

```
src/
├── index.ts                      # Barrel
├── terminal-command.ts           # Tipos de comandos
├── terminal-result.ts            # Tipos de resultados
├── terminal-error.ts             # Tipos de errores + códigos
├── command-profile.ts            # Perfiles de ejecución + políticas
├── evidence.ts                   # Tipos de evidencia
└── __tests__/
```

## Exports principales

```typescript
// Command
export { type TerminalDeviceKind, type RunTerminalCommandOptions } from "./terminal-command.js";

// Result
export { type TerminalExecutionResult, type TerminalDiagnostics, type TerminalSessionEvidence } from "./terminal-result.js";

// Error
export { TerminalExecutionError, TERMINAL_ERROR_CODES } from "./terminal-error.js";

// Policy
export { type ExecutionMode, type TerminalPolicy, DEFAULT_POLICY, SAFE_POLICY, INTERACTIVE_POLICY } from "./command-profile.js";

// Evidence
export { type OperationEvidence, type CommandEvidence, type VerificationEvidence } from "./evidence.js";
```

## Reglas

- **Dependencia cero absoluta.** No importar nada más allá de typescript nativo.
- Solo tipos, interfaces y enums/constantes.
- No incluir lógica de ejecución, parseo, ni serialización.
- TerminalExecutionError tiene 8 fases: `parse|connect|execute|pager|confirm|password|timeout|recover`.
- Las políticas (DEFAULT/SAFE/INTERACTIVE) son inmutables y se consumen desde pt-control.
