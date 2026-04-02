/**
 * Genera comandos IOS para configurar puertos en modo trunk
 * @param ports - Array de nombres de interfaces (e.g., ["GigabitEthernet0/1"])
 * @param vlans - Array de IDs de VLANs permitidas
 * @param capabilities - DeviceCapabilities opcional para generar comandos apropiados
 * @returns Array de comandos IOS para configIos()
 */
export declare function buildTrunkCommands(ports: string[], vlans: number[], capabilities?: {
    supportsTrunkEncapsulationCmd: boolean;
}): string[];
/**
 * Genera comandos IOS para configurar SSH
 * @param domain - Nombre del dominio (e.g., "cisco.local")
 * @param username - Usuario administrador
 * @param password - Password del usuario
 * @returns Array de comandos IOS para configIos()
 */
export declare function buildSshCommands(domain: string, username: string, password: string): string[];
//# sourceMappingURL=ios-commands.d.ts.map