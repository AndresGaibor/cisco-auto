/**
 * Device Validator - Validates device specifications
 * Checks device types, models, capabilities, and configuration
 */
import { switchCatalog, routerCatalog } from '../catalog/index.js';
import { createError, createWarning, createValidationResult } from './validation-types';
import { ValidationCodes } from './validation-codes';
export class DeviceValidator {
    static VALID_DEVICE_TYPES = ['switch', 'router', 'firewall', 'access-point'];
    validateDevice(device) {
        const errors = [];
        const warnings = [];
        // Validate device type
        if (!this.isValidDeviceType(device.type)) {
            errors.push(createError(ValidationCodes.DEVICE_INVALID_TYPE, `Invalid device type: ${device.type}`, 'device.type'));
            return createValidationResult(errors, warnings);
        }
        // Validate hostname
        if (!this.isValidHostname(device.hostname)) {
            errors.push(createError(ValidationCodes.INVALID_INPUT, `Invalid hostname: ${device.hostname || 'undefined'}`, 'device.hostname'));
        }
        // Validate model exists
        if (device.model && !this.modelExists(device.model.model)) {
            warnings.push(createWarning(ValidationCodes.DEVICE_NOT_SUPPORTED, `Device model may not be supported: ${device.model.model}`, 'device.model'));
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
    validateDeviceType(type, model) {
        const errors = [];
        if (!this.isValidDeviceType(type)) {
            errors.push(createError(ValidationCodes.DEVICE_INVALID_TYPE, `Invalid device type: ${type}`, 'device.type'));
        }
        // Validate model matches type
        if (type === 'switch' && !this.isSwitchModel(model)) {
            errors.push(createError(ValidationCodes.DEVICE_NOT_SUPPORTED, `Model ${model} is not a switch`, 'device.model'));
        }
        else if (type === 'router' && !this.isRouterModel(model)) {
            errors.push(createError(ValidationCodes.DEVICE_NOT_SUPPORTED, `Model ${model} is not a router`, 'device.model'));
        }
        return createValidationResult(errors);
    }
    isValidDeviceType(type) {
        return DeviceValidator.VALID_DEVICE_TYPES.includes(type.toLowerCase());
    }
    isValidHostname(hostname) {
        if (!hostname)
            return true;
        const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        return pattern.test(hostname);
    }
    modelExists(model) {
        if (!model)
            return true;
        return this.isSwitchModel(model) || this.isRouterModel(model);
    }
    isSwitchModel(model) {
        return switchCatalog.some(d => d.model === model);
    }
    isRouterModel(model) {
        return routerCatalog.some(d => d.model === model);
    }
    checkUnsupportedFeatures(model, features) {
        const unsupported = [];
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
    getDeviceFromCatalog(model) {
        const switchDevice = switchCatalog.find(d => d.model === model);
        if (switchDevice)
            return switchDevice;
        return routerCatalog.find(d => d.model === model);
    }
    supportsFeature(device, feature) {
        // Placeholder implementation
        // Real implementation would check capabilities
        return true;
    }
}
//# sourceMappingURL=device-validator.js.map