/**
 * Validación ligera de configuración IOS generada.
 * No intenta validar toda la sintaxis, solo errores comunes.
 */
export interface ConfigWarning {
    line: number;
    content: string;
    message: string;
    code: string;
}
export interface ConfigError {
    line: number;
    content: string;
    message: string;
    code: string;
}
export interface ConfigValidationResult {
    valid: boolean;
    lines: number;
    warnings: ConfigWarning[];
    errors: ConfigError[];
}
export declare function validateGeneratedConfig(lines: string[]): ConfigValidationResult;
//# sourceMappingURL=output-validator.d.ts.map