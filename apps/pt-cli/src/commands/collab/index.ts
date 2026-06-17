import { Command } from "commander";
import {
  createStartCommand,
  createConnectCommand,
  createStopCommand,
  createStatusCommand,
  createDoctorCommand,
  createResetUrlCommand,
} from "./commands/session.js";
import {
  createCheckpointCommand,
  createConflictsCommand,
  createResolveCommand,
  createResyncCommand,
  createPeersCommand,
} from "./commands/checkpoints.js";
import { createMultiuserCommand } from "./commands/multiuser.js";

export function createCollabCommand(): Command {
  const collab = new Command("collab")
    .description("PT Collab — colaboración sobre Packet Tracer")
    .summary("Colaboración y sincronización entre múltiples instancias de Packet Tracer");

  // Comandos principales (visibles)
  collab.addCommand(createStartCommand());
  collab.addCommand(createConnectCommand());
  collab.addCommand(createStopCommand());
  collab.addCommand(createStatusCommand());

  // Comandos avanzados (ocultos del help principal)
  collab.addCommand(createDoctorCommand());
  collab.addCommand(createResetUrlCommand());
  collab.addCommand(createCheckpointCommand());
  collab.addCommand(createConflictsCommand());
  collab.addCommand(createResolveCommand());
  collab.addCommand(createResyncCommand());
  collab.addCommand(createPeersCommand());
  collab.addCommand(createMultiuserCommand());

  // Ocultar avanzados del help principal
  const hiddenCmds = ["doctor", "reset-url", "checkpoint", "conflicts", "resolve", "resync", "peers", "multiuser"];
  for (const cmd of collab.commands) {
    if (hiddenCmds.includes(cmd.name())) {
      (cmd as Record<string, unknown>)._hidden = true;
    }
  }

  return collab;
}
