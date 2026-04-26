/**
 * DHCP Server Use Cases
 *
 * Business logic for DHCP server configuration and inspection.
 */

import type {
  DhcpPoolConfig,
  DhcpServerApplyResult,
  DhcpServerConfig,
  DhcpServerInspectResult,
  DhcpServerInspectRaw,
  DhcpServerUseCaseResult,
} from "./dhcp-server-types.js";

/**
 * Port interface for DHCP server operations.
 * Abstracts the controller to allow testing without PT.
 */
export interface DhcpServerPort {
  configureDhcpServer(
    device: string,
    options: DhcpServerConfig,
  ): Promise<void>;
  inspectDhcpServer(
    device: string,
    port?: string,
  ): Promise<DhcpServerInspectRaw>;
}

/**
 * Parses a pool configuration string.
 * Format: name,network,mask,router
 *
 * @example
 * parsePool("LAN,192.168.1.0,255.255.255.0,192.168.1.1")
 * // => { name: "LAN", network: "192.168.1.0", mask: "255.255.255.0", router: "192.168.1.1" }
 */
export function parsePool(poolStr: string): DhcpPoolConfig {
  const parts = poolStr.split(",");
  if (parts.length !== 4) {
    throw new Error(
      `Pool inválido: ${poolStr}. Formato esperado: name,network,mask,router`,
    );
  }
  const name = parts[0]!.trim();
  const network = parts[1]!.trim();
  const mask = parts[2]!.trim();
  const router = parts[3]!.trim();
  return { name, network, mask, router };
}

/**
 * Parses multiple pool configuration strings.
 */
export function parsePools(poolStrings: string[]): DhcpPoolConfig[] {
  return poolStrings.map(parsePool);
}

/**
 * Applies DHCP server configuration to a device.
 *
 * @param controller - The DHCP server port (controller)
 * @param deviceName - Target device name
 * @param enabled - Whether to enable DHCP
 * @param port - Port name (default: FastEthernet0)
 * @param pools - Pool configurations
 * @param excludedRanges - Excluded IP ranges
 */
export async function applyDhcpServerConfig(
  controller: DhcpServerPort,
  deviceName: string,
  enabled: boolean,
  port: string,
  pools: DhcpPoolConfig[],
  excludedRanges: string[],
): Promise<DhcpServerUseCaseResult<DhcpServerApplyResult>> {
  try {
    await controller.configureDhcpServer(deviceName, {
      enabled,
      port,
      pools: pools.map((p) => ({
        name: p.name,
        network: p.network,
        mask: p.mask,
        defaultRouter: p.router,
      })),
      excluded: excludedRanges.map((r) => {
        const [start, end] = r.split("-");
        return { start: start || "", end: end || "" };
      }),
    });

    return {
      ok: true,
      data: {
        device: deviceName,
        enabled,
        port,
        pools,
        excludedRanges,
      },
      advice: [
        `Usa pt dhcp-server inspect ${deviceName} para verificar`,
        `Usa pt show ip-int-brief ${deviceName} para ver las interfaces`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : String(error),
        details: { device: deviceName },
      },
    };
  }
}

/**
 * Inspects DHCP server state on a device.
 *
 * @param controller - The DHCP server port (controller)
 * @param deviceName - Target device name
 * @param port - Port name (default: FastEthernet0)
 */
export async function inspectDhcpServer(
  controller: DhcpServerPort,
  deviceName: string,
  port: string,
): Promise<DhcpServerUseCaseResult<DhcpServerInspectResult>> {
  try {
    const inspectResult = await controller.inspectDhcpServer(deviceName, port);

    if (!inspectResult.ok) {
      return {
        ok: false,
        error: {
          message: `No se pudo inspeccionar el servidor DHCP en ${deviceName}`,
          details: { device: deviceName, port },
        },
      };
    }

    const resultData: DhcpServerInspectResult = {
      device: deviceName,
      port,
      enabled: inspectResult.enabled,
      pools: (inspectResult.pools ?? []).map((p) => ({
        name: p.name,
        network: p.network,
        mask: p.mask ?? "",
        router: p.defaultRouter ?? "",
      })),
      excludedRanges: (inspectResult.excludedAddresses ?? []).map(
        (e) => `${e.start}-${e.end}`,
      ),
    };

    return {
      ok: true,
      data: resultData,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : String(error),
        details: { device: deviceName, port },
      },
    };
  }
}
