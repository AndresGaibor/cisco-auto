// ============================================================================
// CapabilityMatrixService - Servicio de capabilities por modelo
// ============================================================================

import type {
  ICapabilityMatrixService,
  DeviceCapabilities,
  SurfaceType,
  OperationType,
  ParserType,
  ModelInfo,
  CapabilityLookupResult,
} from './capability-types.js';
import { getCapabilitiesForModel, getModelInfo, getAllModels } from './model-capabilities.js';

/**
 * CapabilityMatrixService - lookup de capabilities por device/model
 */
export class CapabilityMatrixService implements ICapabilityMatrixService {
  private deviceModelMap: Map<string, string> = new Map(); // device name -> model

  /**
   * Registrar modelo para un device
   */
  registerDeviceModel(deviceName: string, model: string): void {
    this.deviceModelMap.set(deviceName, model);
  }

  /**
   * Obtener capabilities para un device
   */
  getCapabilities(device: string): DeviceCapabilities {
    const model = this.deviceModelMap.get(device) || device;
    const capabilities = getCapabilitiesForModel(model);
    
    if (!capabilities) {
      // Return unknown capabilities
      return this.createUnknownCapabilities(model);
    }
    
    return capabilities;
  }

  /**
   * Verificar si puede ejecutar una operación
   */
  canExecute(device: string, operation: OperationType): boolean {
    const capabilities = this.getCapabilities(device);
    const opCapability = capabilities.operations[operation];
    return opCapability?.supported || false;
  }

  /**
   * Verificar si puede ejecutar en una superficie
   */
  canExecuteOnSurface(device: string, surface: SurfaceType): boolean {
    const capabilities = this.getCapabilities(device);
    const surfaceCap = capabilities.surfaces[surface];
    return surfaceCap?.supported || false;
  }

  /**
   * Obtener superficie recomendada para una operación
   */
  getRecommendedSurface(device: string, operation: OperationType): SurfaceType {
    const capabilities = this.getCapabilities(device);
    
    // Buscar superficie que soporte la operación
    for (const [surface, surfaceCap] of Object.entries(capabilities.surfaces)) {
      if (surfaceCap.supported) {
        const opCap = capabilities.operations[operation];
        if (opCap?.supported) {
          return surface as SurfaceType;
        }
      }
    }
    
    // Default a IOS si ninguna soporta
    return 'ios';
  }

  /**
   * Obtener parsers disponibles para un device
   */
  getAvailableParsers(device: string): ParserType[] {
    const capabilities = this.getCapabilities(device);
    return capabilities.parserSupport as ParserType[];
  }

  /**
   * Obtener info de modelo
   */
  getModelInfo(model: string): ModelInfo | null {
    return getModelInfo(model);
  }

  /**
   * Lookup completo de capability
   */
  lookupCapability(device: string, operation: OperationType): CapabilityLookupResult {
    const model = this.deviceModelMap.get(device) || device;
    const capabilities = getCapabilitiesForModel(model);
    
    if (!capabilities) {
      return {
        device,
        model,
        surface: 'ios',
        operation,
        supported: false,
        reason: `Modelo ${model} desconocido`,
      };
    }

    // Buscar superficie que soporte la operación
    let recommendedSurface: SurfaceType | undefined;
    for (const [surface, surfaceCap] of Object.entries(capabilities.surfaces)) {
      if (surfaceCap.supported) {
        const opCap = capabilities.operations[operation];
        if (opCap?.supported) {
          recommendedSurface = surface as SurfaceType;
          break;
        }
      }
    }

    const opCapability = capabilities.operations[operation];
    const supported = opCapability?.supported || false;

    return {
      device,
      model,
      surface: recommendedSurface || 'ios',
      operation,
      supported,
      recommendedSurface,
      reason: supported ? undefined : opCapability?.notes || 'Operación no soportada',
    };
  }

  /**
   * Listar todos los modelos disponibles
   */
  listModels(): string[] {
    return getAllModels();
  }

  /**
   * Crear capabilities para modelo desconocido
   */
  private createUnknownCapabilities(model: string): DeviceCapabilities {
    return {
      model,
      surfaces: {
        ios: { supported: true },
        hostport: { supported: true },
        'dhcp-appliance': { supported: false },
        'wireless-ap': { supported: false },
      },
      operations: {
        'vlan': { supported: false },
        'trunk': { supported: false },
        'access-port': { supported: false },
        'svi': { supported: false },
        'subinterface': { supported: false },
        'dhcp-pool': { supported: false },
        'dhcp-relay': { supported: false },
        'static-route': { supported: false },
        'ospf': { supported: false },
        'eigrp': { supported: false },
        'bgp': { supported: false },
        'acl-standard': { supported: false },
        'acl-extended': { supported: false },
        'nat': { supported: false },
        'ssh': { supported: false },
        'tunnel': { supported: false },
        'backup': { supported: false },
      },
      interfaceNaming: {
        pattern: /^.*$/,
        validRanges: {},
      },
      parserSupport: [],
    };
  }
}

/**
 * Factory para crear CapabilityMatrixService
 */
export function createCapabilityMatrixService(): CapabilityMatrixService {
  return new CapabilityMatrixService();
}