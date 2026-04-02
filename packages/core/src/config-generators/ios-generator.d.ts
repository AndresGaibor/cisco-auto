import type { DeviceSpec } from '../canonical/device.spec.ts';
export interface GeneratedConfig {
    hostname: string;
    commands: string[];
    sections: Record<string, string[]>;
}
/**
 * Orden predeterminado de secciones IOS (best practice Cisco)
 */
export declare const DEFAULT_SECTION_ORDER: string[];
/**
 * Orden personalizado de secciones IOS
 * Permite reordenar las secciones según preferencias del usuario
 */
export declare class SectionOrderConfig {
    /**
     * Genera configuración IOS con orden personalizado de secciones
     * @param device - Especificación del dispositivo
     * @param sectionOrder - Orden de secciones (default: DEFAULT_SECTION_ORDER)
     */
    static generate(device: DeviceSpec, sectionOrder?: string[]): GeneratedConfig;
    /**
     * Valida que un orden de secciones sea válido
     */
    static validateOrder(sectionOrder: string[]): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Obtiene el orden predeterminado
     */
    static getDefaultOrder(): string[];
    /**
     * Crea un orden personalizado moviendo secciones específicas
     * @param moves - Objeto con secciones a mover { sectionName: newIndex }
     */
    static customizeOrder(moves: Record<string, number>): string[];
}
export declare class IOSGenerator {
    static generate(device: DeviceSpec): GeneratedConfig;
    static formatCommands(commands: string[]): string;
}
export declare function generateIOS(device: DeviceSpec): GeneratedConfig;
//# sourceMappingURL=ios-generator.d.ts.map