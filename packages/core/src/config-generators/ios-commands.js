// ============================================================================
// IOS Command Utilities - Shared Functions
// ============================================================================
/**
 * Genera comandos IOS para configurar puertos en modo trunk
 * @param ports - Array de nombres de interfaces (e.g., ["GigabitEthernet0/1"])
 * @param vlans - Array de IDs de VLANs permitidas
 * @param capabilities - DeviceCapabilities opcional para generar comandos apropiados
 * @returns Array de comandos IOS para configIos()
 */
export function buildTrunkCommands(ports, vlans, capabilities) {
    const commands = [];
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
 * Genera comandos IOS para configurar SSH
 * @param domain - Nombre del dominio (e.g., "cisco.local")
 * @param username - Usuario administrador
 * @param password - Password del usuario
 * @returns Array de comandos IOS para configIos()
 */
export function buildSshCommands(domain, username, password) {
    const commands = [];
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
//# sourceMappingURL=ios-commands.js.map