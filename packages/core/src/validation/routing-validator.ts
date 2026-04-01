/**
 * Routing Validator - Validates routing configurations
 * Checks routing protocols, networks, metrics, and AS numbers
 */

import type { RoutingSpec, OSPFSpec, EIGRPSpec, BGPSpec } from '../canonical/device.spec';
import { createError, createWarning, createValidationResult } from './validation-types';
import { ValidationCodes } from './validation-codes';
import type { ValidationResult } from './validation-types';

export class RoutingValidator {
  validateRoutingSpec(routing: RoutingSpec): ValidationResult {
    const errors: ReturnType<typeof createError>[] = [];
    const warnings: ReturnType<typeof createWarning>[] = [];

    // Determinar el protocolo activo basándose en qué propiedades están presentes
    const activeProtocol = this.getActiveProtocol(routing);
    
    if (!activeProtocol) {
      // No hay protocolo de routing configurado, es válido
      return createValidationResult(errors, warnings);
    }

    // Validar protocolo específico
    switch (activeProtocol) {
      case 'ospf':
        if (routing.ospf) {
          const ospfResult = this.validateOSPF(routing.ospf);
          errors.push(...ospfResult.errors);
          warnings.push(...ospfResult.warnings);
        }
        break;
      case 'eigrp':
        if (routing.eigrp) {
          const eigrpResult = this.validateEIGRP(routing.eigrp);
          errors.push(...eigrpResult.errors);
          warnings.push(...eigrpResult.warnings);
        }
        break;
      case 'bgp':
        if (routing.bgp) {
          const bgpResult = this.validateBGP(routing.bgp);
          errors.push(...bgpResult.errors);
          warnings.push(...bgpResult.warnings);
        }
        break;
      case 'static':
        if (routing.static && routing.static.length > 0) {
          for (const route of routing.static) {
            const routeErrors = this.validateStaticRoute(route);
            errors.push(...routeErrors);
          }
        }
        break;
    }

    return createValidationResult(errors, warnings);
  }

  private getActiveProtocol(routing: RoutingSpec): 'ospf' | 'eigrp' | 'bgp' | 'static' | null {
    if (routing.ospf) return 'ospf';
    if (routing.eigrp) return 'eigrp';
    if (routing.bgp) return 'bgp';
    if (routing.static && routing.static.length > 0) return 'static';
    return null;
  }

  private validateOSPF(ospf: OSPFSpec): ValidationResult {
    const errors: ReturnType<typeof createError>[] = [];
    const warnings: ReturnType<typeof createWarning>[] = [];

    // Validate PID
    if (!Number.isInteger(ospf.processId) || ospf.processId < 1 || ospf.processId > 65535) {
      errors.push(
        createError(
          ValidationCodes.OSPF_INVALID_PID,
          `Invalid OSPF process ID: ${ospf.processId} (1-65535)`,
          'routing.ospf.processId'
        )
      );
    }

    // Validate areas
    if (ospf.areas && ospf.areas.length > 0) {
      for (const area of ospf.areas) {
        if (!this.isValidAreaId(area.areaId)) {
          errors.push(
            createError(
              ValidationCodes.OSPF_INVALID_AREA,
              `Invalid OSPF area: ${area.areaId}`,
              'routing.ospf.areas'
            )
          );
        }

        if (area.type && !this.isValidAreaType(area.type)) {
          errors.push(
            createError(
              ValidationCodes.OSPF_INVALID_AREA,
              `Invalid OSPF area type: ${area.type}`,
              'routing.ospf.areas'
            )
          );
        }
      }
    }

    return createValidationResult(errors, warnings);
  }

  private validateEIGRP(eigrp: EIGRPSpec): ValidationResult {
    const errors: ReturnType<typeof createError>[] = [];
    const warnings: ReturnType<typeof createWarning>[] = [];

    // Validate AS
    if (!Number.isInteger(eigrp.asNumber) || eigrp.asNumber < 1 || eigrp.asNumber > 65535) {
      errors.push(
        createError(
          ValidationCodes.EIGRP_INVALID_AS,
          `Invalid EIGRP AS: ${eigrp.asNumber} (1-65535)`,
          'routing.eigrp.asNumber'
        )
      );
    }

    return createValidationResult(errors, warnings);
  }

  private validateBGP(bgp: BGPSpec): ValidationResult {
    const errors: ReturnType<typeof createError>[] = [];
    const warnings: ReturnType<typeof createWarning>[] = [];

    // Validate AS (bgp.asn, not asNumber)
    if (!Number.isInteger(bgp.asn) || bgp.asn < 1 || bgp.asn > 4294967295) {
      errors.push(
        createError(
          ValidationCodes.BGP_INVALID_ASN,
          `Invalid BGP AS: ${bgp.asn} (1-4294967295)`,
          'routing.bgp.asn'
        )
      );
    }

    // Validate router ID format if present
    if (bgp.routerId && !this.isValidIpAddress(bgp.routerId)) {
      errors.push(
        createError(
          ValidationCodes.BGP_INVALID_ROUTEID,
          `Invalid BGP router ID: ${bgp.routerId}`,
          'routing.bgp.routerId'
        )
      );
    }

    // Validate neighbors
    if (bgp.neighbors && bgp.neighbors.length > 0) {
      for (const neighbor of bgp.neighbors) {
        if (!this.isValidIpAddress(neighbor.ip)) {
          errors.push(
            createError(
              ValidationCodes.INVALID_INPUT,
              `Invalid BGP neighbor IP: ${neighbor.ip}`,
              'routing.bgp.neighbors'
            )
          );
        }

        if (!Number.isInteger(neighbor.remoteAs) || neighbor.remoteAs < 1 || neighbor.remoteAs > 4294967295) {
          errors.push(
            createError(
              ValidationCodes.BGP_INVALID_ASN,
              `Invalid BGP neighbor AS: ${neighbor.remoteAs}`,
              'routing.bgp.neighbors'
            )
          );
        }
      }
    }

    return createValidationResult(errors, warnings);
  }

  private validateStaticRoute(route: any): any[] {
    const errors = [];

    if (!this.isValidNetwork(route.network)) {
      errors.push(
        createError(
          ValidationCodes.ROUTING_INVALID_NETWORK,
          `Invalid network: ${route.network}`,
          'routing.staticRoutes'
        )
      );
    }

    if (route.metric !== undefined) {
      if (!Number.isInteger(route.metric) || route.metric < 1 || route.metric > 4294967295) {
        errors.push(
          createError(
            ValidationCodes.ROUTING_INVALID_METRIC,
            `Invalid metric: ${route.metric}`,
            'routing.staticRoutes'
          )
        );
      }
    }

    return errors;
  }

  private isValidProtocol(protocol: string): boolean {
    return ['static', 'ospf', 'eigrp', 'bgp', 'rip'].includes(protocol);
  }

  private isValidAreaId(id: string): boolean {
    // Area ID can be 0-4294967295 or x.x.x.x format
    if (/^\d+$/.test(id)) {
      const num = parseInt(id, 10);
      return num >= 0 && num <= 4294967295;
    }
    return this.isValidIpAddress(id);
  }

  private isValidAreaType(type: string): boolean {
    return ['backbone', 'normal', 'stubby', 'totally-stubby', 'nssa'].includes(type);
  }

  private isValidIpAddress(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  private isValidNetwork(network: string): boolean {
    // Validate CIDR notation
    const [ip, prefix] = network.split('/');
    if (!ip || !prefix) return false;

    const prefixNum = parseInt(prefix, 10);
    return this.isValidIpAddress(ip) && prefixNum >= 0 && prefixNum <= 32;
  }
}
