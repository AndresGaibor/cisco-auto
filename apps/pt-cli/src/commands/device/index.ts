#!/usr/bin/env bun
import { Command } from "commander";
import { createDeviceAddCommand } from "./add";
import { createDeviceGetCommand } from "./get";
import { createDeviceInteractiveCommand } from "./interactive";
import { createDeviceListCommand } from "./list";
import { createDevicePortsCommand } from "./ports";
import { createDeviceMoveCommand } from "./move";
import { createDeviceRemoveCommand } from "./remove";

export function createDeviceCommand(): Command {
  const cmd = new Command("device")
    .alias("dev")
    .description("Gestión dinámica de dispositivos en el canvas");

  // Registrar subcomandos desde archivos dedicados
  cmd.addCommand(createDeviceAddCommand());
  cmd.addCommand(createDeviceGetCommand());
  cmd.addCommand(createDeviceInteractiveCommand());
  cmd.addCommand(createDeviceListCommand());
  cmd.addCommand(createDevicePortsCommand());
  cmd.addCommand(createDeviceMoveCommand());
  cmd.addCommand(createDeviceRemoveCommand());

  return cmd;
}
