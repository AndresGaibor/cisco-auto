/**
 * Device Validator - Validates device specifications
 * Checks device types, models, capabilities, and configuration
 */

import type { DeviceSpec } from '../canonical/device.spec';
import { switchCatalog, routerCatalog } from '../catalog/index.js';
import { createError, createWarning, createValidationResult } from './validation-types';
import { ValidationCodes } from './validation-codes';
import type { ValidationResult } from './validation-types';

export class DeviceValidator {
  private static readonly VALID_DEVICE_TYPES = ['switch', 'router', 'firewall', 'access-point'];

  validateDevice(device: DeviceSpec): ValidationResult {
    const errors: ReturnType<typeof createError>[] = [];
    const warnings: ReturnType<typeof createWarning>[] = [];

    // Validate device type
    if (!this.isValidDeviceType(device.type)) {
      errors.push(
        createError(
          ValidationCodes.DEVICE_INVALID_TYPE,
          `Invalid device type: ${device.type}`,
          'device.type'
        )
      );
      return createValidationResult(errors, warnings);
    }

    // Validate hostname
    if (!this.isValidHostname(device.hostname)) {
      errors.push(
        createError(
          ValidationCodes.INVALID_INPUT,
          `Invalid hostname: ${device.hostname || 'undefined'}`,
          'device.hostname'
        )
      );
    }

    // Validate model exists
    if (device.model && !this.modelExists(device.model.model)) {
      warnings.push(
        createWarning(
          ValidationCodes.DEVICE_NOT_SUPPORTED,
          `Device model may not be supported: ${device.model.model}`,
          'device.model'
        )
      );
    }

    // Validate device has required features (skip for now - property doesn't exist)
    /*
    if (device.requiredFeatures && device.requiredFeatures.length > 0) {
      const unsupported = this.checkUnsupportedFeatures(device.model, device.requiredFeatures);
      if (unsupported.length > 0) {
        warnings.push(
          createWarning(
            ValidationCodes.DEVICE_MISSING_FEATURES,
            `Device may not support features: ${unsupported.join(', ')}`,
            'device.requiredFeatures'
          )
        );
      }
    }
    */

    return createValidationResult(errors, warnings);
  }

  validateDeviceType(type: string, model: string): ValidationResult {
    const errors = [];

    if (!this.isValidDeviceType(type)) {
      errors.push(
        createError(
          ValidationCodes.DEVICE_INVALID_TYPE,
          `Invalid device type: ${type}`,
          'device.type'
        )
      );
    }

    // Validate model matches type
    if (type === 'switch' && !this.isSwitchModel(model)) {
      errors.push(
        createError(
          ValidationCodes.DEVICE_NOT_SUPPORTED,
          `Model ${model} is not a switch`,
          'device.model'
        )
      );
    } else if (type === 'router' && !this.isRouterModel(model)) {
      errors.push(
        createError(
          ValidationCodes.DEVICE_NOT_SUPPORTED,
          `Model ${model} is not a router`,
          'device.model'
        )
      );
    }

    return createValidationResult(errors);
  }

  private isValidDeviceType(type: string): boolean {
    return DeviceValidator.VALID_DEVICE_TYPES.includes(type.toLowerCase());
  }

  private isValidHostname(hostname: string | undefined): boolean {
    if (!hostname) return true;
    const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return pattern.test(hostname);
  }

  private modelExists(model: string | undefined): boolean {
    if (!model) return true;
    return this.isSwitchModel(model) || this.isRouterModel(model);
  }

  private isSwitchModel(model: string): boolean {
    return switchCatalog.some(d => d.model === model);
  }

  private isRouterModel(model: string): boolean {
    return routerCatalog.some(d => d.model === model);
  }

  private checkUnsupportedFeatures(model: string, features: string[]): string[] {
    const unsupported: string[] = [];

    // Get device capabilities from catalog
    const device = this.getDeviceFromCatalog(model);
    if (!device) {
      return features; // Assume unsupported if not in catalog
    }

    // Check each feature against device capabilities
    // This is simplified; actual implementation would check more deeply
    for (const feature of features) {
      // Placeholder check
      if (!this.supportsFeature(device, feature)) {
        unsupported.push(feature);
      }
    }

    return unsupported;
  }

  private getDeviceFromCatalog(model: string): typeof switchCatalog[0] | undefined {
    const switchDevice = switchCatalog.find(d => d.model === model);
    if (switchDevice) return switchDevice;
    return routerCatalog.find(d => d.model === model);
  }

  private supportsFeature(device: any, feature: string): boolean {
    // Placeholder implementation
    // Real implementation would check capabilities
    return true;
  }
}
