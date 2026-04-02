/**
 * DEVICE CATALOG - INDEX
 *
 * Punto de entrada único para el catálogo de dispositivos.
 */
export * from './schema';
export { routerCatalog } from './routers';
export { switchCatalog } from './switches';
export { endDeviceCatalog } from './end-devices';
export { wirelessCatalog } from './wireless';
export { securityCatalog } from './security';
export { otherDeviceCatalog } from './other-devices';
export { moduleCatalog, getModuleByCode, getModulesBySlotType, getModuleTotalPorts } from './modules';
export { DeviceCatalog, deviceCatalog, getDefaultCatalog, resetDefaultCatalog } from './service';
export { deviceCatalog as default } from './service';
//# sourceMappingURL=index.d.ts.map