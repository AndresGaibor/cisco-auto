/**
 * ADVANCED ROUTING GENERATOR
 *
 * Genera configuración de RIP, BGP y protocolos adicionales
 */
export class AdvancedRoutingGenerator {
    // ==========================================================================
    // RIP
    // ==========================================================================
    /**
     * Genera configuración de RIP
     */
    static generateRIP(spec) {
        const commands = [];
        commands.push('! RIP Configuration');
        commands.push('router rip');
        // Versión
        commands.push(` version ${spec.version}`);
        // Redes
        for (const network of spec.networks) {
            commands.push(` network ${network}`);
        }
        // Interfaces pasivas
        if (spec.passiveInterfaces && spec.passiveInterfaces.length > 0) {
            for (const iface of spec.passiveInterfaces) {
                commands.push(` passive-interface ${iface}`);
            }
        }
        // Default route
        if (spec.defaultInformation) {
            if (spec.defaultInformation === 'originate always') {
                commands.push(' default-information originate always');
            }
            else {
                commands.push(' default-information originate');
            }
        }
        // Auto-summary
        if (spec.autoSummary !== undefined) {
            if (spec.autoSummary) {
                commands.push(' auto-summary');
            }
            else {
                commands.push(' no auto-summary');
            }
        }
        // Redistribución
        if (spec.redistribute && spec.redistribute.length > 0) {
            for (const proto of spec.redistribute) {
                if (spec.defaultMetric) {
                    commands.push(` redistribute ${proto} metric ${spec.defaultMetric}`);
                }
                else {
                    commands.push(` redistribute ${proto}`);
                }
            }
        }
        commands.push(' exit');
        return commands;
    }
    // ==========================================================================
    // BGP
    // ==========================================================================
    /**
     * Genera configuración de BGP
     */
    static generateBGP(spec) {
        const commands = [];
        commands.push('! BGP Configuration');
        commands.push(`router bgp ${spec.asn}`);
        // Router ID
        if (spec.routerId) {
            commands.push(` bgp router-id ${spec.routerId}`);
        }
        // Sincronización (generalmente disabled en BGP moderno)
        if (spec.synchronization === false) {
            commands.push(' no synchronization');
        }
        // Log neighbor changes
        if (spec.logNeighborChanges !== false) {
            commands.push(' bgp log-neighbor-changes');
        }
        // Vecinos
        for (const neighbor of spec.neighbors) {
            commands.push(...this.generateBGPNeighbor(neighbor));
        }
        // Redes a anunciar
        if (spec.networks && spec.networks.length > 0) {
            for (const net of spec.networks) {
                let cmd = ` network ${net.network}`;
                if (net.mask) {
                    cmd += ` mask ${net.mask}`;
                }
                if (net.routeMap) {
                    cmd += ` route-map ${net.routeMap}`;
                }
                commands.push(cmd);
            }
        }
        // Redistribución
        if (spec.redistribute && spec.redistribute.length > 0) {
            for (const redist of spec.redistribute) {
                let cmd = ` redistribute ${redist.protocol}`;
                if (redist.routeMap) {
                    cmd += ` route-map ${redist.routeMap}`;
                }
                commands.push(cmd);
            }
        }
        commands.push(' exit');
        return commands;
    }
    /**
     * Genera configuración de vecino BGP
     */
    static generateBGPNeighbor(neighbor) {
        const commands = [];
        commands.push(` neighbor ${neighbor.ip} remote-as ${neighbor.remoteAs}`);
        if (neighbor.description) {
            commands.push(` neighbor ${neighbor.ip} description ${neighbor.description}`);
        }
        if (neighbor.updateSource) {
            commands.push(` neighbor ${neighbor.ip} update-source ${neighbor.updateSource}`);
        }
        if (neighbor.nextHopSelf) {
            commands.push(` neighbor ${neighbor.ip} next-hop-self`);
        }
        if (neighbor.routeMapIn) {
            commands.push(` neighbor ${neighbor.ip} route-map ${neighbor.routeMapIn} in`);
        }
        if (neighbor.routeMapOut) {
            commands.push(` neighbor ${neighbor.ip} route-map ${neighbor.routeMapOut} out`);
        }
        if (neighbor.prefixListIn) {
            commands.push(` neighbor ${neighbor.ip} prefix-list ${neighbor.prefixListIn} in`);
        }
        if (neighbor.prefixListOut) {
            commands.push(` neighbor ${neighbor.ip} prefix-list ${neighbor.prefixListOut} out`);
        }
        if (neighbor.sendCommunity) {
            commands.push(` neighbor ${neighbor.ip} send-community ${neighbor.sendCommunity}`);
        }
        if (neighbor.timers) {
            commands.push(` neighbor ${neighbor.ip} timers ${neighbor.timers.keepalive} ${neighbor.timers.holdtime}`);
        }
        return commands;
    }
    // ==========================================================================
    // VALIDATION
    // ==========================================================================
    /**
     * Valida configuración RIP
     */
    static validateRIP(spec) {
        const errors = [];
        const warnings = [];
        // Validar redes
        for (const network of spec.networks) {
            if (!this.isValidNetwork(network)) {
                errors.push(`Invalid network format: ${network}`);
            }
        }
        // Warnings
        if (spec.version === 1) {
            warnings.push('RIPv1 is classful and does not support VLSM. Consider using RIPv2');
        }
        if (spec.autoSummary !== false && spec.version === 2) {
            warnings.push('RIPv2 auto-summary is enabled by default. Consider disabling for discontiguous networks');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Valida configuración BGP
     */
    static validateBGP(spec) {
        const errors = [];
        const warnings = [];
        // Validar AS number
        if (spec.asn < 1 || spec.asn > 4294967295) {
            errors.push(`Invalid AS number: ${spec.asn}`);
        }
        // Validar router ID
        if (spec.routerId && !this.isValidIPv4(spec.routerId)) {
            errors.push(`Invalid router-id: ${spec.routerId}`);
        }
        // Validar vecinos
        for (const neighbor of spec.neighbors) {
            if (!this.isValidIPv4(neighbor.ip)) {
                errors.push(`Invalid neighbor IP: ${neighbor.ip}`);
            }
            if (neighbor.remoteAs < 1 || neighbor.remoteAs > 4294967295) {
                errors.push(`Invalid remote AS for ${neighbor.ip}: ${neighbor.remoteAs}`);
            }
            if (neighbor.timers) {
                if (neighbor.timers.keepalive < 0 || neighbor.timers.holdtime < 0) {
                    errors.push(`Invalid timers for ${neighbor.ip}`);
                }
                if (neighbor.timers.holdtime < neighbor.timers.keepalive * 3) {
                    warnings.push(`Holdtime should be at least 3x keepalive for ${neighbor.ip}`);
                }
            }
        }
        // Validar redes
        if (spec.networks) {
            for (const net of spec.networks) {
                if (!this.isValidNetwork(net.network)) {
                    errors.push(`Invalid network: ${net.network}`);
                }
                if (net.mask && !this.isValidIPv4(net.mask)) {
                    errors.push(`Invalid mask for ${net.network}: ${net.mask}`);
                }
            }
        }
        // Warnings
        if (spec.neighbors.length === 0) {
            warnings.push('No neighbors configured');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    // ==========================================================================
    // EXAMPLES
    // ==========================================================================
    /**
     * Genera ejemplo de RIP
     */
    static generateRIPExample() {
        const spec = {
            version: 2,
            networks: ['192.168.1.0', '192.168.2.0', '10.0.0.0'],
            passiveInterfaces: ['GigabitEthernet0/0'],
            autoSummary: false,
            defaultInformation: 'originate'
        };
        return this.generateRIP(spec).join('\n');
    }
    /**
     * Genera ejemplo de eBGP
     */
    static generateEBGPExample() {
        const spec = {
            asn: 65001,
            routerId: '1.1.1.1',
            neighbors: [
                {
                    ip: '203.0.113.1',
                    remoteAs: 65002,
                    description: 'ISP Primary',
                    routeMapIn: 'ISP-IN',
                    routeMapOut: 'ISP-OUT'
                },
                {
                    ip: '203.0.113.5',
                    remoteAs: 65003,
                    description: 'ISP Secondary'
                }
            ],
            networks: [
                { network: '192.168.0.0', mask: '255.255.0.0' }
            ]
        };
        return this.generateBGP(spec).join('\n');
    }
    // ==========================================================================
    // HELPERS
    // ==========================================================================
    static isValidIPv4(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4)
            return false;
        return parts.every(p => {
            const num = parseInt(p);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }
    static isValidNetwork(network) {
        // Simple validation: A.B.C.D format
        const parts = network.split('.');
        if (parts.length !== 4)
            return false;
        return parts.every(p => {
            const num = parseInt(p);
            return !isNaN(num) && num >= 0 && num <= 255;
        });
    }
}
export default AdvancedRoutingGenerator;
//# sourceMappingURL=advanced-routing.generator.js.map