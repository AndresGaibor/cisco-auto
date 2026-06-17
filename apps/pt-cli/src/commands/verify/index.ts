#!/usr/bin/env bun
import { Command } from "commander";
import { registerBasicCommands } from "./commands/basic.js";
import { registerRoutingCommands } from "./commands/routing.js";
import { registerSwitchingCommands } from "./commands/switching.js";
import { registerServicesCommands } from "./commands/services.js";

export function createVerifyCommand(): Command {
  const verify = new Command("verify")
    .description("Valida conectividad, VLANs, routing, servicios y protocolos")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt verify ping PC1 192.168.10.1
  pt verify vlan SW1 10
  pt verify dhcp PC1
  pt verify ospf R1
  pt verify routing R1 10.0.0.0
  pt verify stp SW1 10
  pt verify etherchannel SW1
  pt verify hsrp R1 1
  pt verify nat R1
  pt verify cdp SW1
  pt verify ipv6 R1
  pt verify wlc WLC1

Regla para agentes:
  - Ejecuta verify después de cmd/set/device/link.
  - Si verify falla, lee probableCause y nextSteps.
`,
    );

  registerBasicCommands(verify);
  registerRoutingCommands(verify);
  registerSwitchingCommands(verify);
  registerServicesCommands(verify);

  return verify;
}
