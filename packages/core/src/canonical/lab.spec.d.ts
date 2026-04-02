/**
 * LAB SPECIFICATION - MODELO CANÓNICO DE LABORATORIO
 *
 * Este es el modelo raíz que representa un laboratorio completo.
 * Incluye dispositivos, conexiones, metadatos y configuración de validación.
 */
import type { DifficultyLevel, ValidationType } from './types';
import type { DeviceSpec } from './device.spec';
import type { ConnectionSpec } from './connection.spec';
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
export interface LabSpec {
    metadata: LabMetadata;
    /** Dispositivos */
    devices: DeviceSpec[];
    /** Conexiones */
    connections: ConnectionSpec[];
    objectives?: LabObjective[];
    instructions?: LabInstructions;
    validation?: LabValidation;
    resources?: LabResources;
    canvas?: LabCanvas;
    activity?: ActivityConfig;
    /** Notas adicionales */
    notes?: string;
}
/**
 * Factory para crear laboratorios
 */
export declare class LabSpecFactory {
    /**
     * Crea un laboratorio vacío
     */
    static create(metadata: LabMetadata): LabSpec;
    /**
     * Crea un laboratorio desde un partial
     */
    static fromPartial(partial: Partial<LabSpec> & {
        metadata: LabMetadata;
    }): LabSpec;
    /**
     * Clona un laboratorio
     */
    static clone(lab: LabSpec): LabSpec;
    /**
     * Añade un dispositivo al laboratorio
     */
    static addDevice(lab: LabSpec, device: DeviceSpec): LabSpec;
    /**
     * Elimina un dispositivo del laboratorio
     */
    static removeDevice(lab: LabSpec, deviceId: string): LabSpec;
    /**
     * Añade una conexión al laboratorio
     */
    static addConnection(lab: LabSpec, connection: ConnectionSpec): LabSpec;
    /**
     * Elimina una conexión del laboratorio
     */
    static removeConnection(lab: LabSpec, connectionId: string): LabSpec;
    /**
     * Obtiene un dispositivo por nombre
     */
    static getDeviceByName(lab: LabSpec, name: string): DeviceSpec | undefined;
    /**
     * Obtiene un dispositivo por ID
     */
    static getDeviceById(lab: LabSpec, id: string): DeviceSpec | undefined;
    /**
     * Obtiene conexiones de un dispositivo
     */
    static getDeviceConnections(lab: LabSpec, deviceId: string): ConnectionSpec[];
    /**
     * Aplica layout automático a los dispositivos
     */
    static autoLayout(lab: LabSpec, algorithm?: 'grid' | 'circle' | 'tree'): LabSpec;
    /**
     * Calcula posiciones de layout
     */
    private static calculateLayout;
}
/**
 * Validador de laboratorios
 */
export declare class LabValidator {
    /**
     * Valida un laboratorio completo
     */
    static validate(lab: LabSpec): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Encuentra conflictos de IP
     */
    private static findIPConflicts;
}
//# sourceMappingURL=lab.spec.d.ts.map