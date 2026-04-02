/**
 * STP (Spanning Tree Protocol) GENERATOR
 *
 * Genera configuración de Spanning Tree para switches Cisco
 */
export class STPGenerator {
    /**
     * Genera configuración completa de STP
     */
    static generate(spec) {
        const commands = [];
        commands.push('! Spanning Tree Protocol Configuration');
        // Modo de STP
        commands.push(this.generateMode(spec.mode));
        // Prioridad global
        if (spec.priority) {
            commands.push(`spanning-tree vlan 1-4094 priority ${spec.priority}`);
        }
        // Configuración por VLAN
        if (spec.vlanConfig && spec.vlanConfig.length > 0) {
            for (const vlanConf of spec.vlanConfig) {
                commands.push(...this.generateVlanConfig(vlanConf));
            }
        }
        // Root primary para VLANs específicas
        if (spec.rootPrimary && spec.rootPrimary.length > 0) {
            const vlans = spec.rootPrimary.join(',');
            commands.push(`spanning-tree vlan ${vlans} root primary`);
        }
        // Root secondary para VLANs específicas
        if (spec.rootSecondary && spec.rootSecondary.length > 0) {
            const vlans = spec.rootSecondary.join(',');
            commands.push(`spanning-tree vlan ${vlans} root secondary`);
        }
        // Globales de PortFast
        if (spec.portfastDefault) {
            commands.push('spanning-tree portfast default');
        }
        if (spec.bpduguardDefault) {
            commands.push('spanning-tree portfast bpduguard default');
        }
        if (spec.bpdufilterDefault) {
            commands.push('spanning-tree portfast bpdufilter default');
        }
        // Configuración de interfaces
        if (spec.interfaceConfig && spec.interfaceConfig.length > 0) {
            commands.push('');
            commands.push('! STP Interface Configuration');
            for (const ifaceConf of spec.interfaceConfig) {
                commands.push(...this.generateInterfaceConfig(ifaceConf));
            }
        }
        return commands;
    }
    /**
     * Genera comando de modo STP
     */
    static generateMode(mode) {
        switch (mode) {
            case 'pvst':
                return 'spanning-tree mode pvst';
            case 'rapid-pvst':
                return 'spanning-tree mode rapid-pvst';
            case 'mst':
                return 'spanning-tree mode mst';
        }
    }
    /**
     * Genera configuración STP por VLAN
     */
    static generateVlanConfig(config) {
        const commands = [];
        if (config.priority) {
            commands.push(`spanning-tree vlan ${config.vlanId} priority ${config.priority}`);
        }
        if (config.rootPrimary) {
            commands.push(`spanning-tree vlan ${config.vlanId} root primary`);
        }
        if (config.rootSecondary) {
            commands.push(`spanning-tree vlan ${config.vlanId} root secondary`);
        }
        return commands;
    }
    /**
     * Genera configuración STP de interfaz
     */
    static generateInterfaceConfig(config) {
        const commands = [];
        commands.push(`interface ${config.interface}`);
        if (config.portfast !== undefined) {
            if (config.portfast) {
                commands.push(' spanning-tree portfast');
            }
            else {
                commands.push(' no spanning-tree portfast');
            }
        }
        if (config.bpduguard !== undefined) {
            commands.push(config.bpduguard
                ? ' spanning-tree bpduguard enable'
                : ' spanning-tree bpduguard disable');
        }
        if (config.bpdufilter !== undefined) {
            commands.push(config.bpdufilter
                ? ' spanning-tree bpdufilter enable'
                : ' spanning-tree bpdufilter disable');
        }
        if (config.cost !== undefined) {
            commands.push(` spanning-tree cost ${config.cost}`);
        }
        if (config.portPriority !== undefined) {
            commands.push(` spanning-tree port-priority ${config.portPriority}`);
        }
        if (config.linkType) {
            commands.push(` spanning-tree link-type ${config.linkType}`);
        }
        commands.push(' exit');
        return commands;
    }
    /**
     * Genera configuración de ejemplo para switch core
     */
    static generateCoreExample() {
        const spec = {
            mode: 'rapid-pvst',
            rootPrimary: [1, 10, 20, 30],
            rootSecondary: [100, 200],
            portfastDefault: true,
            bpduguardDefault: true,
            interfaceConfig: [
                { interface: 'GigabitEthernet0/1', portfast: false },
                { interface: 'GigabitEthernet0/2', portfast: false },
                { interface: 'FastEthernet0/1', portfast: true, bpduguard: true },
                { interface: 'FastEthernet0/2', portfast: true, bpduguard: true }
            ]
        };
        return this.generate(spec).join('\n');
    }
    /**
     * Genera configuración de ejemplo para switch access
     */
    static generateAccessExample() {
        const spec = {
            mode: 'rapid-pvst',
            priority: 28672, // Más alto que default
            portfastDefault: true,
            bpduguardDefault: true,
            interfaceConfig: [
                { interface: 'GigabitEthernet0/1', portfast: false },
                { interface: 'GigabitEthernet0/2', portfast: false },
                { interface: 'range FastEthernet0/1-24', portfast: true, bpduguard: true }
            ]
        };
        return this.generate(spec).join('\n');
    }
    /**
     * Valida configuración STP
     */
    static validate(spec) {
        const errors = [];
        const warnings = [];
        // Validar prioridad (múltiplo de 4096)
        if (spec.priority !== undefined) {
            if (spec.priority < 0 || spec.priority > 61440) {
                errors.push(`Priority ${spec.priority} must be between 0 and 61440`);
            }
            if (spec.priority % 4096 !== 0) {
                errors.push(`Priority ${spec.priority} must be a multiple of 4096`);
            }
        }
        // Validar VLAN IDs
        if (spec.rootPrimary) {
            for (const vlan of spec.rootPrimary) {
                if (vlan < 1 || vlan > 4094) {
                    errors.push(`Invalid VLAN ${vlan} in rootPrimary (must be 1-4094)`);
                }
            }
        }
        if (spec.rootSecondary) {
            for (const vlan of spec.rootSecondary) {
                if (vlan < 1 || vlan > 4094) {
                    errors.push(`Invalid VLAN ${vlan} in rootSecondary (must be 1-4094)`);
                }
            }
        }
        // Warnings
        if (spec.mode === 'pvst') {
            warnings.push('PVST is legacy. Consider using rapid-pvst for faster convergence');
        }
        if (spec.portfastDefault && !spec.bpduguardDefault) {
            warnings.push('PortFast is enabled globally but BPDU Guard is not. This is a security risk');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}
export default STPGenerator;
//# sourceMappingURL=stp.generator.js.map