/**
 * CONNECTION SPECIFICATION - MODELO CANÓNICO DE CONEXIÓN
 *
 * Representa una conexión entre dos puertos de dispositivos.
 * Incluye información del cable, estado y metadatos.
 */
import { CableType, getLinkMedium } from './types';
// =============================================================================
// CONNECTION FACTORY
// =============================================================================
/**
 * Factory para crear conexiones
 */
export class ConnectionSpecFactory {
    /**
     * Crea una conexión con valores por defecto
     */
    static create(partial) {
        const id = partial.id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
            id,
            medium: partial.medium || getLinkMedium(partial.cableType),
            functional: partial.functional ?? true,
            linkStatus: partial.linkStatus || 'up',
            ...partial,
        };
    }
    /**
     * Crea una conexión Ethernet estándar
     */
    static createEthernet(fromDeviceId, fromDeviceName, fromPort, toDeviceId, toDeviceName, toPort, crossover = false) {
        return this.create({
            from: {
                deviceId: fromDeviceId,
                deviceName: fromDeviceName,
                port: fromPort
            },
            to: {
                deviceId: toDeviceId,
                deviceName: toDeviceName,
                port: toPort
            },
            cableType: crossover ? CableType.CROSSOVER : CableType.STRAIGHT_THROUGH
        });
    }
    /**
     * Crea una conexión serial
     */
    static createSerial(fromDeviceId, fromDeviceName, fromPort, toDeviceId, toDeviceName, toPort) {
        return this.create({
            from: {
                deviceId: fromDeviceId,
                deviceName: fromDeviceName,
                port: fromPort
            },
            to: {
                deviceId: toDeviceId,
                deviceName: toDeviceName,
                port: toPort
            },
            cableType: CableType.SERIAL_DCE // El lado from es DCE
        });
    }
    /**
     * Crea una conexión de consola
     */
    static createConsole(fromDeviceId, fromDeviceName, // PC
    toDeviceId, toDeviceName // Router/Switch
    ) {
        return this.create({
            from: {
                deviceId: fromDeviceId,
                deviceName: fromDeviceName,
                port: 'RS-232'
            },
            to: {
                deviceId: toDeviceId,
                deviceName: toDeviceName,
                port: 'Console'
            },
            cableType: CableType.CONSOLE
        });
    }
}
// =============================================================================
// CONNECTION VALIDATOR
// =============================================================================
/**
 * Validador de conexiones
 */
export class ConnectionValidator {
    /**
     * Valida si una conexión es posible
     */
    static validate(connection) {
        const errors = [];
        const warnings = [];
        // Validar que los endpoints son diferentes
        if (connection.from.deviceId === connection.to.deviceId) {
            errors.push('Cannot connect a device to itself');
        }
        // Validar que los puertos no estén vacíos
        if (!connection.from.port) {
            errors.push('Source port is required');
        }
        if (!connection.to.port) {
            errors.push('Destination port is required');
        }
        // Validar compatibilidad de cable
        const cableWarnings = this.validateCableCompatibility(connection);
        warnings.push(...cableWarnings);
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Valida compatibilidad de cable según tipos de dispositivos
     */
    static validateCableCompatibility(connection) {
        const warnings = [];
        // TODO: Implementar validación más sofisticada
        // basada en tipos de dispositivos y puertos
        return warnings;
    }
}
//# sourceMappingURL=connection.spec.js.map