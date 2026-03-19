/**
 * CONNECTION SPECIFICATION - MODELO CANÓNICO DE CONEXIÓN
 * 
 * Representa una conexión entre dos puertos de dispositivos.
 * Incluye información del cable, estado y metadatos.
 */

import { CableType, LinkMedium, getLinkMedium } from './types';

// =============================================================================
// CONNECTION ENDPOINT
// =============================================================================

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

// =============================================================================
// CONNECTION SPECIFICATION
// =============================================================================

export interface ConnectionSpec {
  // === Identificación ===
  /** ID único de la conexión */
  id: string;
  
  // === Endpoints ===
  /** Extremo origen */
  from: ConnectionEndpoint;
  
  /** Extremo destino */
  to: ConnectionEndpoint;
  
  // === Cable/Medio ===
  /** Tipo de cable */
  cableType: CableType;
  
  /** Medio de transmisión */
  medium?: LinkMedium;
  
  // === Estado ===
  /** ¿La conexión es funcional? */
  functional?: boolean;
  
  /** Estado del link */
  linkStatus?: 'up' | 'down' | 'error';
  
  /** Mensaje de error */
  errorMessage?: string;
  
  // === Metadatos ===
  /** Descripción */
  description?: string;
  
  /** Velocidad negociada */
  negotiatedSpeed?: string;
  
  /** Duplex negociado */
  negotiatedDuplex?: 'full' | 'half';
  
  // === Visual ===
  /** Color del cable (para visualización) */
  cableColor?: string;
  
  /** Puntos de control para routing visual */
  routingPoints?: { x: number; y: number }[];
}

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
  static create(partial: Partial<ConnectionSpec> & {
    from: ConnectionEndpoint;
    to: ConnectionEndpoint;
    cableType: CableType;
  }): ConnectionSpec {
    const id = partial.id || `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { 
      id: _, 
      from, 
      to, 
      cableType, 
      medium, 
      functional, 
      linkStatus, 
      ...rest 
    } = partial;
    
    return {
      id,
      from,
      to,
      cableType,
      medium: medium || getLinkMedium(cableType),
      functional: functional ?? true,
      linkStatus: linkStatus || 'up',
      ...rest
    };
  }
  
  /**
   * Crea una conexión Ethernet estándar
   */
  static createEthernet(
    fromDeviceId: string,
    fromDeviceName: string,
    fromPort: string,
    toDeviceId: string,
    toDeviceName: string,
    toPort: string,
    crossover: boolean = false
  ): ConnectionSpec {
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
  static createSerial(
    fromDeviceId: string,
    fromDeviceName: string,
    fromPort: string,
    toDeviceId: string,
    toDeviceName: string,
    toPort: string
  ): ConnectionSpec {
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
      cableType: CableType.SERIAL_DCE
    });
  }
  
  /**
   * Crea una conexión de consola
   */
  static createConsole(
    fromDeviceId: string,
    fromDeviceName: string,
    toDeviceId: string,
    toDeviceName: string
  ): ConnectionSpec {
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
  static validate(connection: ConnectionSpec): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (connection.from.deviceId === connection.to.deviceId) {
      errors.push('Cannot connect a device to itself');
    }
    
    if (!connection.from.port) {
      errors.push('Source port is required');
    }
    if (!connection.to.port) {
      errors.push('Destination port is required');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
