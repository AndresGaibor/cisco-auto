import { NetworkUtils } from './utils.ts';
export class VlanGenerator {
    /**
     * Generate VLAN commands from simple number array
     * @param vlanIds - Array of VLAN IDs (1-4094)
     * @param namePrefix - Optional prefix for VLAN names (e.g., "ADMIN" creates "ADMIN10", "ADMIN20")
     * @returns Array of IOS commands
     */
    static generateVLANsFromIds(vlanIds, namePrefix) {
        const commands = [];
        commands.push('! Configuración de VLANs');
        for (const vlanId of vlanIds) {
            const vlanName = namePrefix ? `${namePrefix}${vlanId}` : `VLAN${vlanId}`;
            commands.push(`vlan ${vlanId}`);
            commands.push(` name ${vlanName}`);
            commands.push(' exit');
        }
        return commands;
    }
    /**
     * Generate VLAN commands
     * Note: In canonical model, SVI IPs are on interfaces (name: 'Vlan<id>'), not on VLAN spec
     */
    static generateVLANs(vlans, vtp) {
        const commands = [];
        if (vtp?.mode.isClient) {
            return commands;
        }
        commands.push('! Configuración de VLANs');
        for (const vlan of vlans) {
            commands.push(`vlan ${vlan.id.value}`);
            if (vlan.name) {
                commands.push(` name ${vlan.name.value}`);
            }
            commands.push(' exit');
        }
        return commands;
    }
    /**
     * Generate SVI (Switch Virtual Interface) configurations
     * In canonical model, SVIs are interfaces of type 'vlan' with IPs
     */
    static generateSVIs(interfaces) {
        const commands = [];
        // Find all VLAN interfaces (typically named "Vlan<X>" or have switchportMode set)
        for (const iface of interfaces) {
            // Check if this is an SVI interface (name like "Vlan10" or has ip with switchport)
            const vlanMatch = iface.name.match(/^[Vv]lan?(\d+)$/);
            if (vlanMatch || (iface.ip && !iface.switchportMode)) {
                const vlanIdStr = vlanMatch?.[1];
                const vlanId = vlanIdStr ? parseInt(vlanIdStr) : iface.vlan;
                if (vlanId) {
                    commands.push(`interface ${iface.name}`);
                    if (iface.description) {
                        commands.push(` description ${iface.description}`);
                    }
                    if (iface.ip) {
                        // Handle CIDR notation (e.g., "192.168.1.1/24")
                        if (iface.ip.includes('/')) {
                            const [ip, cidrPart] = iface.ip.split('/');
                            if (cidrPart) {
                                const subnetMask = NetworkUtils.cidrToMask(parseInt(cidrPart));
                                commands.push(` ip address ${ip} ${subnetMask}`);
                            }
                        }
                        else if (iface.subnetMask) {
                            commands.push(` ip address ${iface.ip} ${iface.subnetMask}`);
                        }
                    }
                    if (iface.shutdown === false) {
                        commands.push(' no shutdown');
                    }
                    commands.push(' exit');
                }
            }
        }
        return commands;
    }
    static generateVTP(vtp) {
        const commands = [];
        commands.push('! Configuración VTP');
        commands.push('vtp domain ' + vtp.domain.value);
        commands.push('vtp mode ' + vtp.mode.value);
        if (vtp.version) {
            commands.push('vtp version ' + vtp.version.value);
        }
        if (vtp.password) {
            commands.push('vtp password ' + vtp.password.value);
        }
        return commands;
    }
    static generateInterfaces(device) {
        const commands = [];
        if (!device.interfaces || device.interfaces.length === 0) {
            return commands;
        }
        commands.push('! Configuración de interfaces');
        for (const iface of device.interfaces) {
            commands.push(`interface ${iface.name}`);
            if (iface.description) {
                commands.push(` description ${iface.description}`);
            }
            // Handle IP address - only for routed interfaces or SVIs
            if (iface.ip && !iface.switchportMode) {
                if (iface.ip.includes('/')) {
                    const [ip, cidrPart] = iface.ip.split('/');
                    if (cidrPart) {
                        const subnetMask = NetworkUtils.cidrToMask(parseInt(cidrPart));
                        commands.push(` ip address ${ip} ${subnetMask}`);
                    }
                }
                else if (iface.subnetMask) {
                    commands.push(` ip address ${iface.ip} ${iface.subnetMask}`);
                }
            }
            // Handle switchport mode
            if (iface.switchportMode) {
                commands.push(' switchport mode ' + iface.switchportMode);
                if (iface.switchportMode === 'access' && iface.vlan) {
                    commands.push(` switchport access vlan ${iface.vlan.value}`);
                }
                if (iface.switchportMode === 'trunk') {
                    if (iface.nativeVlan) {
                        commands.push(` switchport trunk native vlan ${iface.nativeVlan.value}`);
                    }
                    if (iface.allowedVlans) {
                        const uniqueVlans = iface.allowedVlans.toNumbers();
                        commands.push(` switchport trunk allowed vlan ${uniqueVlans.join(',')}`);
                    }
                }
            }
            if (iface.shutdown) {
                commands.push(' shutdown');
            }
            else {
                commands.push(' no shutdown');
            }
            commands.push(' exit');
        }
        return commands;
    }
}
//# sourceMappingURL=vlan-generator.js.map