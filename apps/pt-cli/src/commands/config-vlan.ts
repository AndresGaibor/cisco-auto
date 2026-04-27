import { Command } from "commander";

export const CONFIG_VLAN_META = {
  id: "config-vlan",
  summary: "Configurar VLANs en un switch Cisco",
};

export function generateVlanCommands(vlans: Array<{ id: string | number; name: string; state?: string }>): string[] {
  const commands: string[] = [];

  for (const vlan of vlans) {
    commands.push(`vlan ${vlan.id}`);
    commands.push(` name ${vlan.name}`);
    if ((vlan.state ?? "active") !== "active") {
      commands.push(` state ${vlan.state}`);
    }
    commands.push(" exit");
  }

  return commands;
}

export function createConfigVlanCommand(): Command {
  return new Command("config-vlan").description("Configurar VLANs");
}
