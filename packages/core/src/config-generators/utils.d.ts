export declare class NetworkUtils {
    /**
     * Convierte CIDR a máscara de subred
     * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
     */
    static cidrToMask(cidr: number): string;
    /**
     * Convierte CIDR a wildcard mask
     * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
     */
    static cidrToWildcard(cidr: number): string;
}
//# sourceMappingURL=utils.d.ts.map