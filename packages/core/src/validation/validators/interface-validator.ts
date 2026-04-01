/**
 * Interface Validator - Validates interface specifications
 */

import type { DeviceSpec, InterfaceSpec } from "../../canonical/device.spec";
import type { ValidationError, ValidationWarning } from "../validation-types.js";
import { ValidationCodes } from "../validation-codes.js";

export class InterfaceValidator {
  static validate(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (!device.interfaces || device.interfaces.length === 0) {
      return;
    }

    const interfaceNames = new Set<string>();
    const ips = new Set<string>();

    for (const iface of device.interfaces) {
      if (!this.isValidInterfaceName(iface.name)) {
        errors.push({
          code: ValidationCodes.INVALID_INTERFACE_NAME,
          message: `Invalid interface name: ${iface.name}`,
          field: `interfaces[${iface.name}]`,
          severity: "error",
        });
        continue;
      }

      if (!this.interfaceExistsOnDevice(device, iface.name)) {
        errors.push({
          code: ValidationCodes.INTERFACE_NOT_ON_DEVICE,
          message: `Interface ${iface.name} does not exist on device ${device.model}`,
          field: `interfaces[${iface.name}]`,
          severity: "error",
        });
        continue;
      }

      if (interfaceNames.has(iface.name)) {
        errors.push({
          code: ValidationCodes.DUPLICATE_INTERFACE,
          message: `Duplicate interface: ${iface.name}`,
          field: `interfaces[${iface.name}]`,
          severity: "error",
        });
      }
      interfaceNames.add(iface.name);

      if (iface.ip) {
        if (!this.isValidIP(iface.ip)) {
          errors.push({
            code: ValidationCodes.INVALID_IP_FORMAT,
            message: `Invalid IP address: ${iface.ip}`,
            field: `interfaces[${iface.name}].ip`,
            severity: "error",
          });
        }

        if (ips.has(iface.ip)) {
          errors.push({
            code: ValidationCodes.INVALID_IP_FORMAT,
            message: `Duplicate IP address: ${iface.ip}`,
            field: `interfaces[${iface.name}].ip`,
            severity: "error",
          });
        }
        ips.add(iface.ip);
      }

      if (iface.subnetMask && !this.isValidIP(iface.subnetMask)) {
        errors.push({
          code: ValidationCodes.INVALID_SUBNET_MASK,
          message: `Invalid subnet mask: ${iface.subnetMask}`,
          field: `interfaces[${iface.name}].subnetMask`,
          severity: "error",
        });
      }

      if (iface.vlan && !Number.isInteger(iface.vlan)) {
        errors.push({
          code: ValidationCodes.INVALID_VLAN_RANGE,
          message: `Invalid VLAN ID: ${iface.vlan}`,
          field: `interfaces[${iface.name}].vlan`,
          severity: "error",
        });
      }
    }
  }

  private static isValidInterfaceName(name: string): boolean {
    const regex = /^(gi|fa|eth|te|po|lo)[\d/]*$/i;
    return regex.test(name);
  }

  private static interfaceExistsOnDevice(
    device: DeviceSpec,
    interfaceName: string,
  ): boolean {
    const ports = this.getAllDevicePorts(device);
    const portRegex = /^(\w+)(\d+)(?:\/(\d+))?(?:\/(\d+))?$/;
    const match = interfaceName.match(portRegex);

    if (!match || !match[1]) return false;

    const prefix = match[1].toLowerCase();
    const module = parseInt(match[3] || "1", 10);
    const port = parseInt(match[2] || "0", 10);

    for (const p of ports) {
      if (p.prefix === prefix) {
        if (module >= 1 && module <= p.module) {
          const [min, max] = p.range;
          if (port >= min && port <= max) return true;
        }
      }
    }

    return false;
  }

  private static getAllDevicePorts(
    device: DeviceSpec,
  ): Array<{ prefix: string; module: number; range: [number, number] }> {
    const ports: Array<{ prefix: string; module: number; range: [number, number] }> = [];

    const portMaps: Record<
      string,
      Array<{ prefix: string; module: number; range: [number, number] }>
    > = {
      "Catalyst 3650": [
        { prefix: "gi", module: 2, range: [1, 48] },
        { prefix: "te", module: 2, range: [1, 4] },
      ],
      "Catalyst 2960": [
        { prefix: "fa", module: 1, range: [1, 48] },
        { prefix: "gi", module: 1, range: [1, 2] },
      ],
      "Catalyst 9300": [
        { prefix: "gi", module: 3, range: [1, 48] },
        { prefix: "te", module: 3, range: [1, 6] },
      ],
    };

    return portMaps[device.model?.model || ''] || [];
  }

  private static isValidIP(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
}
