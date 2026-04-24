// ============================================================================
// PT Control V2 - IOS Command Utilities
// ============================================================================

// ============================================================================
// Generadores de Comandos IOS
// ============================================================================

// ============================================================================
// PT Control V2 - IOS Command Utilities
// ============================================================================

// ============================================================================
// Generadores de Comandos IOS
// ============================================================================

/**
 * Genera comandos IOS para crear VLANs en un switch.
 * Cada VLAN se configura con nombre opcional y se sale del submode de VLAN.
 * @param vlans - Array de IDs de VLAN a crear (1-4094)
 * @param name - Nombre base para las VLANs; usa "VLAN{id}" si no se provee
 * @returns Comandos IOS listos para configIos()
 * @example
 * buildVlanCommands([10, 20], "DATA")
 * // → ["vlan 10", " name DATA", " exit", "vlan 20", " name DATA", " exit"]
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
 * Genera comandos IOS para configurar puertos en modo trunk.
 * Solo emite el comando de encapsulación si el dispositivo lo soporta (routers, no L2 switches).
 * @param ports - Array de nombres de interfaces (e.g., ["GigabitEthernet0/1", "GigabitEthernet0/2"])
 * @param vlans - Array de IDs de VLANs permitidas en el trunk
 * @param capabilities - Opcional; si `supportsTrunkEncapsulationCmd` es true, se emite el comando de encapsulación
 * @returns Comandos IOS listos para configIos()
 */
export function buildTrunkCommands(
  ports: string[],
  vlans: number[],
  capabilities?: { supportsTrunkEncapsulationCmd: boolean }
): string[] {
  const commands: string[] = [];
  const vlanList = vlans.join(',');

  for (const port of ports) {
    commands.push(`interface ${port}`);
    // Solo emitir encapsulación si el device lo soporta (routers, no L2 switches)
    if (capabilities?.supportsTrunkEncapsulationCmd) {
      commands.push(' switchport trunk encapsulation dot1q');
    }
    commands.push(' switchport mode trunk');
    commands.push(` switchport trunk allowed vlan ${vlanList}`);
    commands.push(' no shutdown');
    commands.push(' exit');
  }

  return commands;
}

/**
 * Genera comandos IOS para configurar SSH como método de acceso remoto.
 * Incluye generación de keys RSA, habilitación de SSHv2, configuración de vty y usuario local.
 * @param domain - Nombre del dominio para generación de keys (e.g., "cisco.local")
 * @param username - Usuario administrador con privilegio 15
 * @param password - Password en texto claro para el usuario
 * @returns Comandos IOS listos para configIos()
 * @example
 * buildSshCommands("empresa.local", "admin", "P@ssw0rd!")
 * // → ["ip domain-name empresa.local", "crypto key generate rsa general-keys modulus 2048", ...]
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
