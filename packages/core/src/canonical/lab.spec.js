/**
 * LAB SPECIFICATION - MODELO CANÓNICO DE LABORATORIO
 *
 * Este es el modelo raíz que representa un laboratorio completo.
 * Incluye dispositivos, conexiones, metadatos y configuración de validación.
 */
// =============================================================================
// LAB FACTORY
// =============================================================================
/**
 * Factory para crear laboratorios
 */
export class LabSpecFactory {
    /**
     * Crea un laboratorio vacío
     */
    static create(metadata) {
        return {
            metadata: {
                version: '1.0',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...metadata
            },
            devices: [],
            connections: []
        };
    }
    /**
     * Crea un laboratorio desde un partial
     */
    static fromPartial(partial) {
        return {
            metadata: {
                version: '1.0',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...partial.metadata
            },
            devices: partial.devices || [],
            connections: partial.connections || [],
            objectives: partial.objectives,
            instructions: partial.instructions,
            validation: partial.validation,
            resources: partial.resources,
            canvas: partial.canvas,
            activity: partial.activity,
            notes: partial.notes
        };
    }
    /**
     * Clona un laboratorio
     */
    static clone(lab) {
        return JSON.parse(JSON.stringify(lab));
    }
    /**
     * Añade un dispositivo al laboratorio
     */
    static addDevice(lab, device) {
        const cloned = this.clone(lab);
        cloned.devices.push(device);
        cloned.metadata.updatedAt = new Date();
        return cloned;
    }
    /**
     * Elimina un dispositivo del laboratorio
     */
    static removeDevice(lab, deviceId) {
        const cloned = this.clone(lab);
        cloned.devices = cloned.devices.filter(d => d.id !== deviceId);
        // También eliminar conexiones asociadas
        cloned.connections = cloned.connections.filter(c => c.from.deviceId !== deviceId && c.to.deviceId !== deviceId);
        cloned.metadata.updatedAt = new Date();
        return cloned;
    }
    /**
     * Añade una conexión al laboratorio
     */
    static addConnection(lab, connection) {
        const cloned = this.clone(lab);
        cloned.connections.push(connection);
        cloned.metadata.updatedAt = new Date();
        return cloned;
    }
    /**
     * Elimina una conexión del laboratorio
     */
    static removeConnection(lab, connectionId) {
        const cloned = this.clone(lab);
        cloned.connections = cloned.connections.filter(c => c.id !== connectionId);
        cloned.metadata.updatedAt = new Date();
        return cloned;
    }
    /**
     * Obtiene un dispositivo por nombre
     */
    static getDeviceByName(lab, name) {
        return lab.devices.find(d => d.name === name);
    }
    /**
     * Obtiene un dispositivo por ID
     */
    static getDeviceById(lab, id) {
        return lab.devices.find(d => d.id === id);
    }
    /**
     * Obtiene conexiones de un dispositivo
     */
    static getDeviceConnections(lab, deviceId) {
        return lab.connections.filter(c => c.from.deviceId === deviceId || c.to.deviceId === deviceId);
    }
    /**
     * Aplica layout automático a los dispositivos
     */
    static autoLayout(lab, algorithm = 'grid') {
        const cloned = this.clone(lab);
        const { width, height } = cloned.canvas || { width: 2000, height: 1500 };
        const positions = this.calculateLayout(cloned.devices.length, width, height, algorithm);
        cloned.devices.forEach((device, i) => {
            device.position = positions[i];
        });
        cloned.metadata.updatedAt = new Date();
        return cloned;
    }
    /**
     * Calcula posiciones de layout
     */
    static calculateLayout(count, width, height, algorithm) {
        const positions = [];
        switch (algorithm) {
            case 'grid': {
                const cols = Math.ceil(Math.sqrt(count));
                const rows = Math.ceil(count / cols);
                const cellW = width / (cols + 1);
                const cellH = height / (rows + 1);
                for (let i = 0; i < count; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    positions.push({
                        x: cellW * (col + 1),
                        y: cellH * (row + 1)
                    });
                }
                break;
            }
            case 'circle': {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.35;
                for (let i = 0; i < count; i++) {
                    const angle = (2 * Math.PI * i) / count;
                    positions.push({
                        x: centerX + radius * Math.cos(angle),
                        y: centerY + radius * Math.sin(angle)
                    });
                }
                break;
            }
            case 'tree': {
                // Layout jerárquico
                const levels = 3;
                const levelHeight = height / (levels + 1);
                for (let i = 0; i < count; i++) {
                    positions.push({
                        x: (width / (count + 1)) * (i + 1),
                        y: levelHeight * ((i % levels) + 1)
                    });
                }
                break;
            }
        }
        return positions;
    }
}
// =============================================================================
// LAB VALIDATOR
// =============================================================================
/**
 * Validador de laboratorios
 */
export class LabValidator {
    /**
     * Valida un laboratorio completo
     */
    static validate(lab) {
        const errors = [];
        const warnings = [];
        // Validar metadatos
        if (!lab.metadata.name) {
            errors.push('Lab name is required');
        }
        // Validar dispositivos
        if (lab.devices.length === 0) {
            warnings.push('Lab has no devices');
        }
        // Validar nombres de dispositivos únicos
        const deviceNames = new Set();
        for (const device of lab.devices) {
            if (deviceNames.has(device.name)) {
                errors.push(`Duplicate device name: ${device.name}`);
            }
            deviceNames.add(device.name);
        }
        // Validar conexiones
        const deviceIds = new Set(lab.devices.map(d => d.id));
        for (const conn of lab.connections) {
            if (!deviceIds.has(conn.from.deviceId)) {
                errors.push(`Connection references unknown device: ${conn.from.deviceName}`);
            }
            if (!deviceIds.has(conn.to.deviceId)) {
                errors.push(`Connection references unknown device: ${conn.to.deviceName}`);
            }
        }
        // Validar IP conflicts
        const ipConflicts = this.findIPConflicts(lab);
        if (ipConflicts.length > 0) {
            warnings.push(...ipConflicts);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Encuentra conflictos de IP
     */
    static findIPConflicts(lab) {
        const conflicts = [];
        const ips = new Map();
        for (const device of lab.devices) {
            for (const iface of device.interfaces) {
                if (iface.ip) {
                    const ipWithMask = `${iface.ip}/${iface.subnetMask || '255.255.255.0'}`;
                    if (ips.has(ipWithMask)) {
                        conflicts.push(`IP conflict: ${ipWithMask} used by ${ips.get(ipWithMask)} and ${device.name}`);
                    }
                    else {
                        ips.set(ipWithMask, device.name);
                    }
                }
            }
        }
        return conflicts;
    }
}
//# sourceMappingURL=lab.spec.js.map