/**
 * CONNECTION SPECIFICATION - MODELO CANÓNICO DE CONEXIÓN
 *
 * Representa una conexión entre dos puertos de dispositivos.
 * Incluye información del cable, estado y metadatos.
 */
import { CableType, LinkMedium } from './types';
export interface ConnectionEndpoint {
    /** ID del dispositivo */
    deviceId: string;
    /** Nombre del dispositivo */
    deviceName: string;
    /** Puerto/Interfaz */
    port: string;
    /** Tipo de puerto (opcional) */
    portType?: string;
}
export interface ConnectionSpec {
    /** ID único de la conexión */
    id: string;
    /** Extremo origen */
    from: ConnectionEndpoint;
    /** Extremo destino */
    to: ConnectionEndpoint;
    /** Tipo de cable */
    cableType: CableType;
    /** Medio de transmisión */
    medium?: LinkMedium;
    /** ¿La conexión es funcional? */
    functional?: boolean;
    /** Estado del link */
    linkStatus?: 'up' | 'down' | 'error';
    /** Mensaje de error */
    errorMessage?: string;
    /** Descripción */
    description?: string;
    /** Velocidad negociada */
    negotiatedSpeed?: string;
    /** Duplex negociado */
    negotiatedDuplex?: 'full' | 'half';
    /** Color del cable (para visualización) */
    cableColor?: string;
    /** Puntos de control para routing visual */
    routingPoints?: {
        x: number;
        y: number;
    }[];
}
/**
 * Factory para crear conexiones
 */
export declare class ConnectionSpecFactory {
    /**
     * Crea una conexión con valores por defecto
     */
    static create(partial: Partial<ConnectionSpec> & {
        from: ConnectionEndpoint;
        to: ConnectionEndpoint;
        cableType: CableType;
    }): ConnectionSpec;
    /**
     * Crea una conexión Ethernet estándar
     */
    static createEthernet(fromDeviceId: string, fromDeviceName: string, fromPort: string, toDeviceId: string, toDeviceName: string, toPort: string, crossover?: boolean): ConnectionSpec;
    /**
     * Crea una conexión serial
     */
    static createSerial(fromDeviceId: string, fromDeviceName: string, fromPort: string, toDeviceId: string, toDeviceName: string, toPort: string): ConnectionSpec;
    /**
     * Crea una conexión de consola
     */
    static createConsole(fromDeviceId: string, fromDeviceName: string, // PC
    toDeviceId: string, toDeviceName: string): ConnectionSpec;
}
/**
 * Validador de conexiones
 */
export declare class ConnectionValidator {
    /**
     * Valida si una conexión es posible
     */
    static validate(connection: ConnectionSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Valida compatibilidad de cable según tipos de dispositivos
     */
    private static validateCableCompatibility;
}
//# sourceMappingURL=connection.spec.d.ts.map