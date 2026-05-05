/**
 * @deprecated Use ./terminal/terminal-command-service.js.
 *
 * Este archivo queda solo como shim de compatibilidad para imports antiguos.
 * La implementación real vive en:
 *   packages/pt-control/src/application/services/terminal/terminal-command-service.ts
 *
 * No agregues lógica nueva aquí.
 */
export { createTerminalCommandService } from "./terminal/terminal-command-service.js";
export type {
  TerminalControllerPort,
  TerminalCommandServiceDeps,
  TerminalServiceTimingMap,
} from "./terminal/terminal-command-service.js";
