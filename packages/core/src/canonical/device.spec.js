/**
 * DEVICE SPECIFICATION - MODELO CANÓNICO DE DISPOSITIVO
 *
 * Este es el modelo único y completo para representar un dispositivo de red.
 * Incluye todos los campos necesarios para:
 * - Configuración de red (IP, VLANs, routing)
 * - Configuración de seguridad (ACLs, NAT)
 * - Configuración de servicios (DHCP, NTP)
 * - Metadatos (posición, modelo, estado)
 */
// =============================================================================
// DEVICE FACTORY
// =============================================================================
/**
 * Factory para crear dispositivos
 */
export class DeviceSpecFactory {
    /**
     * Crea un dispositivo con valores por defecto
     */
    static create(partial) {
        const id = partial.id || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
            id,
            hostname: partial.hostname || partial.name,
            interfaces: partial.interfaces || [],
            ...partial,
        };
    }
    /**
     * Crea un router con configuración básica
     */
    static createRouter(name, options = {}) {
        return this.create({
            name,
            type: 'router',
            model: {
                vendor: 'cisco',
                series: 'ISR',
                ...options.model
            },
            interfaces: options.interfaces || [
                { name: 'GigabitEthernet0/0', shutdown: false },
                { name: 'GigabitEthernet0/1', shutdown: false }
            ],
            ...options
        });
    }
    /**
     * Crea un switch con puertos por defecto (Fa0/1 - Fa0/24)
     */
    static createSwitch(name, options = {}) {
        // Generar 24 puertos FastEthernet (0/1 a 0/24) - CORREGIDO
        const interfaces = options.interfaces || Array.from({ length: 24 }, (_, i) => ({
            name: `FastEthernet0/${i + 1}`, // Empieza en 1, no en 0
            shutdown: false
        }));
        return this.create({
            name,
            type: 'switch',
            model: {
                vendor: 'cisco',
                series: 'Catalyst 2960',
                model: '2960-24TT-L',
                ...options.model
            },
            interfaces,
            layer2: {
                stp: {
                    mode: 'rapid-pvst'
                },
                ...options.layer2
            },
            ...options
        });
    }
    /**
     * Crea un PC con interfaz básica
     */
    static createPC(name, options = {}) {
        return this.create({
            name,
            type: 'pc',
            interfaces: options.interfaces || [
                { name: 'FastEthernet0', shutdown: false }
            ],
            ...options
        });
    }
    /**
     * Crea un server
     */
    static createServer(name, options = {}) {
        return this.create({
            name,
            type: 'server',
            interfaces: options.interfaces || [
                { name: 'GigabitEthernet0', shutdown: false }
            ],
            services: {
                http: { enabled: true },
                ...options.services
            },
            ...options
        });
    }
}
//# sourceMappingURL=device.spec.js.map