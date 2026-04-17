// Alias para `pt log` (singular) — re-exporta createLogsCommand renombrado
import { createLogsCommand } from "./logs.js";
import type { Command } from "commander";

export function createLogCommand(): Command {
  const cmd = createLogsCommand();
  cmd.name("log");
  return cmd;
}
