/**
 * Device Validator - Validates device specifications
 * Checks device types, models, capabilities, and configuration
 */
import type { DeviceSpec } from '../canonical/device.spec';
import type { ValidationResult } from './validation-types';
export declare class DeviceValidator {
    private static readonly VALID_DEVICE_TYPES;
    validateDevice(device: DeviceSpec): ValidationResult;
    validateDeviceType(type: string, model: string): ValidationResult;
    private isValidDeviceType;
    private isValidHostname;
    private modelExists;
    private isSwitchModel;
    private isRouterModel;
    private checkUnsupportedFeatures;
    private getDeviceFromCatalog;
    private supportsFeature;
}
//# sourceMappingURL=device-validator.d.ts.map