/**
 * Routing Use Cases
 *
 * Business logic for routing configuration.
 * These functions orchestrate IOS builders and return structured results.
 */

import type {
  RoutingResult,
  RoutingUseCaseResult,
  StaticRouteConfig,
} from './routing-types.js';

import {
  validarIPv4,
  validarCIDR,
  parseEnteroObligatorio,
  cidrToSubnetMask,
  buildStaticRouteCommands,
  buildOspfEnableCommands,
  buildOspfAddNetworkCommands,
  buildEigrpEnableCommands,
  buildBgpEnableCommands,
} from './ios-builders.js';

export interface StaticRouteInput {
  deviceName: string;
  network: string;
  nextHop: string;
}

export interface StaticRouteResult {
  device: string;
  network: string;
  nextHop: string;
  commands: string[];
}

export interface OspfEnableInput {
  deviceName: string;
  processId: number;
}

export interface OspfEnableResult {
  device: string;
  processId: number;
  commands: string[];
}

export interface OspfAddNetworkInput {
  deviceName: string;
  network: string;
  area: number | string;
  processId?: number;
}

export interface OspfAddNetworkResult {
  device: string;
  network: string;
  area: string;
  commands: string[];
}

export interface EigrpEnableInput {
  deviceName: string;
  asn: number;
}

export interface EigrpEnableResult {
  device: string;
  asn: number;
  commands: string[];
}

export interface BgpEnableInput {
  deviceName: string;
  asn: number;
}

export interface BgpEnableResult {
  device: string;
  asn: number;
  commands: string[];
}

export function executeStaticRoute(
  input: StaticRouteInput,
): RoutingResult<StaticRouteResult> {
  try {
    if (!validarCIDR(input.network)) {
      return {
        ok: false,
        error: {
          message: `La red debe tener formato CIDR válido: ${input.network}`,
        },
      };
    }

    if (input.nextHop !== 'null0' && !validarIPv4(input.nextHop)) {
      return {
        ok: false,
        error: {
          message: `El next-hop debe ser una IPv4 válida o null0: ${input.nextHop}`,
        },
      };
    }

    const commands = buildStaticRouteCommands(input.deviceName, input.network, input.nextHop);

    return {
      ok: true,
      data: {
        device: input.deviceName,
        network: input.network,
        nextHop: input.nextHop,
        commands,
      },
      advice: [`Usa pt show ip-route ${input.deviceName} para verificar`],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function executeOspfEnable(
  input: OspfEnableInput,
): RoutingResult<OspfEnableResult> {
  try {
    const commands = buildOspfEnableCommands(input.deviceName, input.processId);

    return {
      ok: true,
      data: {
        device: input.deviceName,
        processId: input.processId,
        commands,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function executeOspfAddNetwork(
  input: OspfAddNetworkInput,
): RoutingResult<OspfAddNetworkResult> {
  try {
    if (!validarCIDR(input.network)) {
      return {
        ok: false,
        error: {
          message: `La red debe tener formato CIDR válido: ${input.network}`,
        },
      };
    }

    const processId = input.processId ?? 1;
    const commands = buildOspfAddNetworkCommands(
      input.deviceName,
      processId,
      input.network,
      input.area,
    );

    return {
      ok: true,
      data: {
        device: input.deviceName,
        network: input.network,
        area: String(input.area),
        commands,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function executeEigrpEnable(
  input: EigrpEnableInput,
): RoutingResult<EigrpEnableResult> {
  try {
    const commands = buildEigrpEnableCommands(input.deviceName, input.asn);

    return {
      ok: true,
      data: {
        device: input.deviceName,
        asn: input.asn,
        commands,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function executeBgpEnable(
  input: BgpEnableInput,
): RoutingResult<BgpEnableResult> {
  try {
    const commands = buildBgpEnableCommands(input.deviceName, input.asn);

    return {
      ok: true,
      data: {
        device: input.deviceName,
        asn: input.asn,
        commands,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export {
  validarIPv4,
  validarCIDR,
  parseEnteroObligatorio,
  cidrToSubnetMask,
  buildStaticRouteCommands,
  buildOspfEnableCommands,
  buildOspfAddNetworkCommands,
  buildEigrpEnableCommands,
  buildBgpEnableCommands,
} from './ios-builders.js';
