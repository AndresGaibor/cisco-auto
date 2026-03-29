// ============================================================================
// PT Control V2 - IOS Command Utilities
// ============================================================================

// ============================================================================
// Generadores de Comandos IOS
// ============================================================================

/**
 * Genera comandos IOS para crear VLANs
 * @param vlans - Array de IDs de VLAN a crear
 * @param name - Nombre base para las VLANs (opcional, usar ID si no se provee)
 * @returns Array de comandos IOS para configIos()
 */
export function buildVlanCommands(vlans: number[], name?: string): string[] {
  const commands: string[] = [];

  for (const vlan of vlans) {
    const vlanName = name ?? `VLAN${vlan}`;
    commands.push(`vlan ${vlan}`);
    commands.push(` name ${vlanName}`);
    commands.push(' exit');
  }

  return commands;
}

/**
 * Genera comandos IOS para configurar puertos en modo trunk
 * @param ports - Array de nombres de interfaces (e.g., ["GigabitEthernet0/1"])
 * @param vlans - Array de IDs de VLANs permitidas
 * @returns Array de comandos IOS para configIos()
 */
export function buildTrunkCommands(ports: string[], vlans: number[]): string[] {
  const commands: string[] = [];
  const vlanList = vlans.join(',');

  for (const port of ports) {
    commands.push(`interface ${port}`);
    commands.push(' switchport trunk encapsulation dot1q');
    commands.push(' switchport mode trunk');
    commands.push(` switchport trunk allowed vlan ${vlanList}`);
    commands.push(' no shutdown');
    commands.push(' exit');
  }

  return commands;
}

/**
 * Genera comandos IOS para configurar SSH
 * @param domain - Nombre del dominio (e.g., "cisco.local")
 * @param username - Usuario administrador
 * @param password - Password del usuario
 * @returns Array de comandos IOS para configIos()
 */
export function buildSshCommands(
  domain: string,
  username: string,
  password: string
): string[] {
  const commands: string[] = [];

  commands.push(`ip domain-name ${domain}`);
  commands.push('crypto key generate rsa general-keys modulus 2048');
  commands.push('ip ssh version 2');
  commands.push('line vty 0 15');
  commands.push(' transport input ssh');
  commands.push(' login local');
  commands.push(' exit');
  commands.push(`username ${username} privilege 15 password ${password}`);

  return commands;
}
