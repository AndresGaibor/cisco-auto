/**
 * DEVICE CATALOG SERVICE
 *
 * Servicio principal para búsqueda y consulta del catálogo de dispositivos.
 * Proporciona API unificada para acceder a todos los catálogos.
 */
import type { DeviceCatalogEntry, CatalogQuery } from './schema';
import type { DeviceType, DeviceFamily } from '../canonical/types';
export interface DeviceCatalogConfig {
    extraDevices?: DeviceCatalogEntry[];
    skipDefaults?: boolean;
}
export declare class DeviceCatalog {
    private devices;
    private byType;
    private byFamily;
    private byVendor;
    constructor(config?: DeviceCatalogConfig);
    /** Registra un dispositivo en el catálogo en todos los índices */
    register(device: DeviceCatalogEntry): void;
    /**
     * Obtiene un dispositivo por ID
     */
    getById(id: string): DeviceCatalogEntry | undefined;
    /**
     * Obtiene un dispositivo por modelo
     */
    getByModel(model: string): DeviceCatalogEntry | undefined;
    /**
     * Obtiene todos los dispositivos
     */
    getAll(): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos por tipo
     */
    getByType(type: DeviceType): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos por familia
     */
    getByFamily(family: DeviceFamily): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos por vendor
     */
    getByVendor(vendor: string): DeviceCatalogEntry[];
    /**
     * Permite inyectar dispositivos adicionales en runtime.
     */
    addDevices(devices: DeviceCatalogEntry[]): void;
    /**
     * Búsqueda avanzada con múltiples criterios
     */
    search(query: CatalogQuery): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos con routing
     */
    getRouters(): DeviceCatalogEntry[];
    /**
     * Obtiene switches L2
     */
    getLayer2Switches(): DeviceCatalogEntry[];
    /**
     * Obtiene switches L3 (multilayer)
     */
    getLayer3Switches(): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos con PoE
     */
    getPoEDevices(): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos wireless
     */
    getWirelessDevices(): DeviceCatalogEntry[];
    /**
     * Obtiene firewalls/dispositivos de seguridad
     */
    getSecurityDevices(): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos industriales
     */
    getIndustrialDevices(): DeviceCatalogEntry[];
    /**
     * Obtiene dispositivos para CCNA
     */
    getCCNADevices(): DeviceCatalogEntry[];
    /**
     * Obtiene el total de puertos de un dispositivo
     */
    getDevicePortCount(deviceId: string): number;
    /**
     * Verifica compatibilidad de dispositivos
     */
    areCompatible(device1Id: string, device2Id: string): {
        compatible: boolean;
        reasons: string[];
    };
    /**
     * Obtiene estadísticas del catálogo
     */
    getStats(): {
        total: number;
        byType: Record<string, number>;
        byFamily: Record<string, number>;
        byVendor: Record<string, number>;
        generic: number;
        legacy: number;
    };
}
export declare function getDefaultCatalog(): DeviceCatalog;
export declare function resetDefaultCatalog(): void;
export declare const deviceCatalog: DeviceCatalog;
export default deviceCatalog;
//# sourceMappingURL=service.d.ts.map