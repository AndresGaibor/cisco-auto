import { Command } from "commander";

export function createShowCommand(): Command {
  const showCmd = new Command("show").description("Ejecutar comandos show para consultar información de dispositivos");

  const subcommands = [
    ["ip-int-brief", "Mostrar IPs de interfaces"],
    ["vlan", "Mostrar VLANs"],
    ["ip-route", "Mostrar tabla de rutas"],
    ["run-config", "Mostrar configuración corriendo"],
  ] as const;

  for (const [name, description] of subcommands) {
    showCmd.command(name).description(description);
  }

  return showCmd;
}
