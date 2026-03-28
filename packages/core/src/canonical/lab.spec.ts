/**
 * LAB SPECIFICATION - MODELO CANÓNICO DE LABORATORIO
 * 
 * Este es el modelo raíz que representa un laboratorio completo.
 * Incluye dispositivos, conexiones, metadatos y configuración de validación.
 */

import type { DifficultyLevel, ValidationType, CanvasPosition } from './types';
import type { DeviceSpec, DeviceSpecFactory } from './device.spec';
import type { ConnectionSpec, ConnectionSpecFactory } from './connection.spec';

// =============================================================================
// METADATA
// =============================================================================

export interface LabMetadata {
  /** Nombre del laboratorio */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Versión */
  version?: string;
  
  /** Autor */
  author?: string;
  
  /** Email del autor */
  authorEmail?: string;
  
  /** Organización */
  organization?: string;
  
  /** Dificultad */
  difficulty?: DifficultyLevel;
  
  /** Tiempo estimado (ej: "30 min") */
  estimatedTime?: string;
  
  /** Tags */
  tags?: string[];
  
  /** Fecha de creación */
  createdAt?: Date;
  
  /** Fecha de actualización */
  updatedAt?: Date;
  
  /** Packet Tracer versión objetivo */
  ptVersion?: string;
}

// =============================================================================
// OBJECTIVES
// =============================================================================

export interface LabObjective {
  /** ID del objetivo */
  id: string;
  
  /** Orden */
  order: number;
  
  /** Título */
  title: string;
  
  /** Descripción detallada */
  description?: string;
  
  /** ¿Completado? */
  completed?: boolean;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationTest {
  /** ID del test */
  id: string;
  
  /** Nombre */
  name: string;
  
  /** Tipo de validación */
  type: ValidationType;
  
  /** Descripción */
  description?: string;
  
  /** Dispositivo origen */
  sourceDevice: string;
  
  /** Dispositivo destino */
  destinationDevice?: string;
  
  /** IP destino (alternativa) */
  destinationIP?: string;
  
  /** URL destino (para HTTP/HTTPS) */
  destinationURL?: string;
  
  /** Resultado esperado */
  expected: {
    success: boolean;
    value?: string | number | boolean;
    matches?: string;
  };
  
  /** Puntos */
  points?: number;
  
  /** Timeout (ms) */
  timeout?: number;
  
  /** Feedback */
  feedback?: {
    success?: string;
    failure?: string;
  };
}

export interface LabValidation {
  /** Tests de validación */
  tests?: ValidationTest[];
  
  /** Puntaje mínimo para aprobar */
  passingScore?: number;
  
  /** Puntaje total */
  totalPoints?: number;
  
  /** Mostrar feedback inmediato */
  showFeedback?: boolean;
  
  /** Tiempo límite (minutos) */
  timeLimit?: number;
}

// =============================================================================
// INSTRUCTIONS
// =============================================================================

export interface LabInstructions {
  /** Texto de instrucciones */
  text?: string;
  
  /** Formato */
  format?: 'text' | 'html' | 'markdown';
  
  /** Pasos */
  steps?: string[];
  
  /** Recursos externos */
  resources?: {
    type: 'pdf' | 'video' | 'link' | 'image';
    url: string;
    title?: string;
  }[];
  
  /** Notas para el instructor */
  instructorNotes?: string;
}

// =============================================================================
// RESOURCES
// =============================================================================

export interface LabResources {
  /** Archivo PKA original */
  pkaFile?: string;
  
  /** Archivo PKT original */
  pktFile?: string;
  
  /** Archivo de solución */
  solutionFile?: string;
  
  /** Archivos adicionales */
  additionalFiles?: string[];
}

// =============================================================================
// CANVAS CONFIGURATION
// =============================================================================

export interface LabCanvas {
  /** Ancho */
  width: number;
  
  /** Alto */
  height: number;
  
  /** Zoom */
  zoom?: number;
  
  /** Offset X */
  offsetX?: number;
  
  /** Offset Y */
  offsetY?: number;
  
  /** Grid visible */
  gridVisible?: boolean;
  
  /** Snap to grid */
  snapToGrid?: boolean;
  
  /** Tamaño del grid */
  gridSize?: number;
}

// =============================================================================
// ACTIVITY WIZARD (PKA)
// =============================================================================

export interface ActivityConfig {
  /** ¿Es una actividad (PKA)? */
  enabled: boolean;
  
  /** Red inicial */
  initialNetwork?: {
    devices: DeviceSpec[];
    connections: ConnectionSpec[];
  };
  
  /** Red de respuesta (solución) */
  answerNetwork?: {
    devices: DeviceSpec[];
    connections: ConnectionSpec[];
  };
  
  /** Variables */
  variables?: {
    name: string;
    type: 'string' | 'number' | 'ip' | 'mac';
    defaultValue: string | number;
    description?: string;
  }[];
  
  /** Instrucciones del Activity Wizard */
  instructions?: string;
}

// =============================================================================
// LAB SPECIFICATION
// =============================================================================

export interface LabSpec {
  // === Metadatos ===
  metadata: LabMetadata;
  
  // === Topología ===
  /** Dispositivos */
  devices: DeviceSpec[];
  
  /** Conexiones */
  connections: ConnectionSpec[];
  
  // === Objetivos de aprendizaje ===
  objectives?: LabObjective[];
  
  // === Instrucciones ===
  instructions?: LabInstructions;
  
  // === Validación ===
  validation?: LabValidation;
  
  // === Recursos ===
  resources?: LabResources;
  
  // === Canvas ===
  canvas?: LabCanvas;
  
  // === Activity (PKA) ===
  activity?: ActivityConfig;
  
  // === Metadatos adicionales ===
  /** Notas adicionales */
  notes?: string;
}

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
  static create(metadata: LabMetadata): LabSpec {
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
  static fromPartial(partial: Partial<LabSpec> & { metadata: LabMetadata }): LabSpec {
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
  static clone(lab: LabSpec): LabSpec {
    return JSON.parse(JSON.stringify(lab));
  }
  
  /**
   * Añade un dispositivo al laboratorio
   */
  static addDevice(lab: LabSpec, device: DeviceSpec): LabSpec {
    const cloned = this.clone(lab);
    cloned.devices.push(device);
    cloned.metadata.updatedAt = new Date();
    return cloned;
  }
  
  /**
   * Elimina un dispositivo del laboratorio
   */
  static removeDevice(lab: LabSpec, deviceId: string): LabSpec {
    const cloned = this.clone(lab);
    cloned.devices = cloned.devices.filter(d => d.id !== deviceId);
    // También eliminar conexiones asociadas
    cloned.connections = cloned.connections.filter(
      c => c.from.deviceId !== deviceId && c.to.deviceId !== deviceId
    );
    cloned.metadata.updatedAt = new Date();
    return cloned;
  }
  
  /**
   * Añade una conexión al laboratorio
   */
  static addConnection(lab: LabSpec, connection: ConnectionSpec): LabSpec {
    const cloned = this.clone(lab);
    cloned.connections.push(connection);
    cloned.metadata.updatedAt = new Date();
    return cloned;
  }
  
  /**
   * Elimina una conexión del laboratorio
   */
  static removeConnection(lab: LabSpec, connectionId: string): LabSpec {
    const cloned = this.clone(lab);
    cloned.connections = cloned.connections.filter(c => c.id !== connectionId);
    cloned.metadata.updatedAt = new Date();
    return cloned;
  }
  
  /**
   * Obtiene un dispositivo por nombre
   */
  static getDeviceByName(lab: LabSpec, name: string): DeviceSpec | undefined {
    return lab.devices.find(d => d.name === name);
  }
  
  /**
   * Obtiene un dispositivo por ID
   */
  static getDeviceById(lab: LabSpec, id: string): DeviceSpec | undefined {
    return lab.devices.find(d => d.id === id);
  }
  
  /**
   * Obtiene conexiones de un dispositivo
   */
  static getDeviceConnections(lab: LabSpec, deviceId: string): ConnectionSpec[] {
    return lab.connections.filter(
      c => c.from.deviceId === deviceId || c.to.deviceId === deviceId
    );
  }
  
  /**
   * Aplica layout automático a los dispositivos
   */
  static autoLayout(
    lab: LabSpec, 
    algorithm: 'grid' | 'circle' | 'tree' = 'grid'
  ): LabSpec {
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
  private static calculateLayout(
    count: number,
    width: number,
    height: number,
    algorithm: 'grid' | 'circle' | 'tree'
  ): CanvasPosition[] {
    const positions: CanvasPosition[] = [];
    
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
  static validate(lab: LabSpec): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar metadatos
    if (!lab.metadata.name) {
      errors.push('Lab name is required');
    }
    
    // Validar dispositivos
    if (lab.devices.length === 0) {
      warnings.push('Lab has no devices');
    }
    
    // Validar nombres de dispositivos únicos
    const deviceNames = new Set<string>();
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
  private static findIPConflicts(lab: LabSpec): string[] {
    const conflicts: string[] = [];
    const ips = new Map<string, string>();
    
    for (const device of lab.devices) {
      for (const iface of device.interfaces) {
        if (iface.ip) {
          const ipWithMask = `${iface.ip}/${iface.subnetMask || '255.255.255.0'}`;
          if (ips.has(ipWithMask)) {
            conflicts.push(
              `IP conflict: ${ipWithMask} used by ${ips.get(ipWithMask)} and ${device.name}`
            );
          } else {
            ips.set(ipWithMask, device.name);
          }
        }
      }
    }
    
    return conflicts;
  }
}
