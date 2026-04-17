// ============================================================================
// PT Compatibility Contract
//
// API PÚBLICA de compatibilidad con Packet Tracer.
// Esta es la ÚNICA interfaz que pt-control puede consumir de pt-runtime.
// No importar lógica interna del runtime desde aquí.
//
// Toda función aquí debe:
// - Ser estable y versionada
// - Validar contra el catálogo real de PT
// - Lanzar errores claros si PT no soporta lo solicitado
// ============================================================================

import {
  PT_MODEL_MAP,
  PT_DEVICE_TYPE_MAP,
  PT_NON_CREATABLE_MODELS,
  validatePTModel,
  getPTDeviceType,
  getAllValidModels,
} from "../value-objects/validated-models.js";

import {
  PT_PORT_MAP,
  PT_MODULE_CATALOG,
  PT_DEVICE_MODULE_SLOTS,
  validatePortExists,
  validateModuleExists,
  validateModuleSlotCompatible,
} from "../value-objects/hardware-maps.js";

// ---------------------------------------------------------------------------
// Catálogo - solo lectura
// ---------------------------------------------------------------------------

export { PT_MODEL_MAP, PT_DEVICE_TYPE_MAP, PT_NON_CREATABLE_MODELS, getAllValidModels };

// ---------------------------------------------------------------------------
// Device type IDs canónicos de PT
// ---------------------------------------------------------------------------

export const PT_DEVICE_TYPE_ID = {
  router: 0,
  switch: 1,
  hub: 2,
  bridge: 3,
  repeater: 4,
  pc: 8,
  server: 9,
  multilayerSwitch: 16,
  multilayerDevice: 16,
  accessPoint: 7,
  cloud: 2,
  firewall: 27,
  iot: 34,
} as const;

export type PTDeviceTypeId = (typeof PT_DEVICE_TYPE_ID)[keyof typeof PT_DEVICE_TYPE_ID];

// ---------------------------------------------------------------------------
// Cable type IDs canónicos de PT
// ---------------------------------------------------------------------------

export const PT_CABLE_TYPE_ID = {
  auto: -1,
  straight: 0,
  cross: 1,
  fiber: 2,
  serial: 3,
  console: 4,
  phone: 5,
  wireless: 8,
} as const;

export type PTCableTypeId = (typeof PT_CABLE_TYPE_ID)[keyof typeof PT_CABLE_TYPE_ID];

// ---------------------------------------------------------------------------
// Validaciones - público
// ---------------------------------------------------------------------------

export {
  getPTDeviceType,
  validatePTModel,
  validatePortExists,
  validateModuleExists,
  validateModuleSlotCompatible,
};

// ---------------------------------------------------------------------------
// Fallback adapters - cuando el catálogo no está generado
// ---------------------------------------------------------------------------

function catalogIsEmpty(catalog: Record<string, unknown>): boolean {
  return Object.keys(catalog).length === 0;
}

// ---------------------------------------------------------------------------
// Contrato de compatibilidad
// ---------------------------------------------------------------------------

export interface PTCatalogHealth {
  healthy: boolean;
  modelCount: number;
  portMapPopulated: boolean;
  moduleCatalogPopulated: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Valida que el catálogo de PT esté completamente poblado.
 * THROWS con mensaje claro si hay problemas críticos.
 */
export function assertCatalogHealth(): PTCatalogHealth {
  const warnings: string[] = [];
  const errors: string[] = [];

  const modelCount = Object.keys(PT_MODEL_MAP).length;
  if (modelCount === 0) {
    errors.push("PT_MODEL_MAP está vacío — catálogo no se generó correctamente");
  }

  if (catalogIsEmpty(PT_PORT_MAP)) {
    warnings.push("PT_PORT_MAP vacío — validación de puertos deshabilitada");
  }

  if (catalogIsEmpty(PT_MODULE_CATALOG)) {
    warnings.push("PT_MODULE_CATALOG vacío — validación de módulos deshabilitada");
  }

  if (catalogIsEmpty(PT_DEVICE_MODULE_SLOTS)) {
    warnings.push("PT_DEVICE_MODULE_SLOTS vacío — validación de slots deshabilitada");
  }

  const healthy = errors.length === 0;

  return {
    healthy,
    modelCount,
    portMapPopulated: !catalogIsEmpty(PT_PORT_MAP),
    moduleCatalogPopulated: !catalogIsEmpty(PT_MODULE_CATALOG),
    warnings,
    errors,
  };
}

/**
 * Valida que el catálogo esté listo. Lanza error si no.
 * Usar en LabRuntimeManager al arrancar.
 */
export function assertCatalogLoaded(): void {
  const health = assertCatalogHealth();

  if (!health.healthy) {
    throw new Error(
      `[PT Compatibility Contract] Catálogo de PT no disponible:\n` +
        health.errors.map((e) => `  - ${e}`).join("\n") +
        (health.warnings.length > 0
          ? "\n" + health.warnings.map((w) => `  ⚠ ${w}`).join("\n")
          : "") +
        "\nEjecutar: bun run generate-models en pt-runtime",
    );
  }
}

// ---------------------------------------------------------------------------
// Resumen del contrato - para debugging
// ---------------------------------------------------------------------------

export function getContractSummary(): {
  version: string;
  models: number;
  nonCreatable: number;
  portMapPopulated: boolean;
  moduleCatalogPopulated: boolean;
} {
  return {
    version: "1.0",
    models: Object.keys(PT_MODEL_MAP).length,
    nonCreatable: PT_NON_CREATABLE_MODELS.length,
    portMapPopulated: !catalogIsEmpty(PT_PORT_MAP),
    moduleCatalogPopulated: !catalogIsEmpty(PT_MODULE_CATALOG),
  };
}
