/**
 * DEVICE CATALOG - INDEX
 * 
 * Punto de entrada único para el catálogo de dispositivos.
 */

// Schema
export * from './schema';

// Catálogos individuales
export { routerCatalog } from './routers';
export { switchCatalog } from './switches';
export { endDeviceCatalog } from './end-devices';
export { wirelessCatalog } from './wireless';
export { securityCatalog } from './security';
export { otherDeviceCatalog } from './other-devices';
export { moduleCatalog, getModuleByCode, getModulesBySlotType, getModuleTotalPorts } from './modules';

// Servicio principal
export { DeviceCatalog, deviceCatalog, getDefaultCatalog, resetDefaultCatalog } from './service';

// Default export
export { deviceCatalog as default } from './service';
