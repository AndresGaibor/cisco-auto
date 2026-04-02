/**
 * MODULES CATALOG
 *
 * Catálogo de módulos de expansión para routers y switches
 */
import type { ModuleDefinition } from './schema';
export declare const moduleCatalog: ModuleDefinition[];
/**
 * Busca un módulo por código
 */
export declare function getModuleByCode(code: string): ModuleDefinition | undefined;
/**
 * Obtiene módulos por tipo de slot
 */
export declare function getModulesBySlotType(slotType: string): ModuleDefinition[];
/**
 * Obtiene los puertos totales de un módulo
 */
export declare function getModuleTotalPorts(module: ModuleDefinition): number;
export default moduleCatalog;
//# sourceMappingURL=modules.d.ts.map