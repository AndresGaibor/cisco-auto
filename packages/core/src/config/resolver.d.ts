import { type CiscoAutoConfig, type ResolveOptions, type ResolvedConfig } from './types.ts';
export declare class ConfigValidationError extends Error {
    constructor(message: string);
}
export declare class ConfigResolver {
    private config;
    private resolvedKeys;
    constructor();
    loadDefaults(): this;
    loadGlobal(): this;
    loadProject(dir?: string): this;
    loadEnv(): this;
    applyFlags(flags: Partial<CiscoAutoConfig>): this;
    private mergeConfig;
    resolve(): CiscoAutoConfig;
    getResolved(key: string): ResolvedConfig | undefined;
    getAllResolved(): ResolvedConfig[];
    getSource(key: string): string;
}
export declare function resolveConfig(options?: ResolveOptions): CiscoAutoConfig;
export declare function getConfigValue(key: keyof CiscoAutoConfig, options?: ResolveOptions): unknown;
export declare function getConfigSource(key: string, options?: ResolveOptions): string;
//# sourceMappingURL=resolver.d.ts.map