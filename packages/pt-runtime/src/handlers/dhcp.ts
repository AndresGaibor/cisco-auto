import type { PtDeps } from "../pt-api/pt-deps.js";
import { ptError, ptSuccess, PtErrorCode, type PtResult } from "../pt-api/pt-results.js";
import type {
  PTDhcpServerMainProcess,
  PTDhcpServerProcess,
  PTDhcpPoolProcess,
  PTDeviceWithProcesses,
} from "../pt-api/pt-processes.js";
import { getDhcpServerMainProcess, ptHasMethod, ptSafeGet } from "../pt-api/pt-processes.js";

/**
 * Payload para configurar el servidor DHCP en un dispositivo.
 * Soporta múltiples pools, rangos excluidos, y habilitación/deshabilitación.
 * 
 * @example
 * {
 *   type: "configDhcpServer",
 *   device: "Router1",
 *   enabled: true,
 *   port: "FastEthernet0/0",
 *   pools: [{
 *     name: "LAN_POOL",
 *     network: "192.168.1.0",
 *     mask: "255.255.255.0",
 *     defaultRouter: "192.168.1.1",
 *     dns: "8.8.8.8",
 *     startIp: "192.168.1.10",
 *     endIp: "192.168.1.200"
 *   }],
 *   excluded: [{ start: "192.168.1.1", end: "192.168.1.9" }]
 * }
 */
export interface ConfigDhcpServerPayload {
  type: "configDhcpServer";
  device: string;
  enabled?: boolean;
  port?: string;
  pools?: Array<{
    name: string;
    network?: string;
    mask?: string;
    defaultRouter?: string;
    dns?: string;
    startIp?: string;
    endIp?: string;
    maxUsers?: number;
  }>;
  excluded?: Array<{ start: string; end: string }>;
}

/**
 * Payload para inspeccionar el estado del servidor DHCP.
 * Devuelve pools configurados, leases activos, y direcciones excluidas.
 */
export interface InspectDhcpServerPayload {
  type: "inspectDhcpServer";
  device: string;
  port?: string;
}

function getDhcpMainProcess(device: PTDeviceWithProcesses): PTDhcpServerMainProcess | null {
  const { process } = getDhcpServerMainProcess(device);
  return process;
}

function getDhcpServerProcess(
  main: PTDhcpServerMainProcess,
  portName: string,
): PTDhcpServerProcess | null {
  try {
    const maybeProcess = main as unknown as PTDhcpServerProcess;
    if (
      typeof maybeProcess.setEnable === "function" &&
      typeof maybeProcess.getPoolCount === "function"
    ) {
      return maybeProcess;
    }
    return main.getDhcpServerProcessByPortName(portName);
  } catch {
    return null;
  }
}

function getPoolByName(dhcpProcess: PTDhcpServerProcess, name: string): PTDhcpPoolProcess | null {
  return dhcpProcess.getPoolByName(name) as PTDhcpPoolProcess | null;
}

/**
 * Configura el servidor DHCP en un router.
 * Crea pools, establece opciones de red, y configura rangos excluidos.
 * 
 * @param payload - ConfigDhcpServerPayload con device y configuración DHCP
 * @param deps - PtDeps con acceso a red y fileManager
 * @returns PtResult con pools configurados y cualquier error
 */
export function handleConfigDhcpServer(payload: ConfigDhcpServerPayload, deps: PtDeps): PtResult {
  const device = deps.getDeviceByName(payload.device) as PTDeviceWithProcesses | null;
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const portName = payload.port || "FastEthernet0";
  const dhcpMain = getDhcpMainProcess(device);
  if (!dhcpMain) return ptError("DHCP server not available", PtErrorCode.UNSUPPORTED_OPERATION);

  const dhcpServerProcess = getDhcpServerProcess(dhcpMain, portName);
  if (!dhcpServerProcess)
    return ptError(`DHCP server not found for port ${portName}`, PtErrorCode.UNSUPPORTED_OPERATION);

  try {
    dhcpServerProcess.setEnable(!!payload.enabled);
  } catch (error) {
    return ptError(
      `Failed to set DHCP enabled state: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const configuredPools: Array<{ name: string; network: string; mask: string }> = [];
  for (const poolConfig of payload.pools || []) {
    try {
      if (ptHasMethod(dhcpServerProcess, "addNewPool")) {
        dhcpServerProcess.addNewPool(poolConfig.name);
      } else if (ptHasMethod(dhcpServerProcess, "addPool")) {
        (dhcpServerProcess as any).addPool(poolConfig.name);
      }
      const pool = getPoolByName(dhcpServerProcess, poolConfig.name);
      if (!pool) continue;

      if (poolConfig.network) pool.setNetworkAddress(poolConfig.network);
      if (poolConfig.mask) pool.setNetworkMask(poolConfig.mask);
      if (poolConfig.defaultRouter) pool.setDefaultRouter(poolConfig.defaultRouter);
      if (poolConfig.dns) pool.setDnsServerIp(poolConfig.dns);
      if (poolConfig.startIp) pool.setStartIp(poolConfig.startIp);
      if (poolConfig.endIp) pool.setEndIp(poolConfig.endIp);
      if (poolConfig.maxUsers !== undefined) pool.setMaxUsers(poolConfig.maxUsers);

      configuredPools.push({
        name: poolConfig.name,
        network: poolConfig.network || "",
        mask: poolConfig.mask || "",
      });
    } catch (error) {
      deps.dprint(
        `[handleConfigDhcpServer] Failed to configure pool ${poolConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (const exc of payload.excluded || []) {
    if (!exc.start || !exc.end) continue;
    try {
      dhcpServerProcess.addExcludedAddress(exc.start, exc.end);
    } catch (error) {
      deps.dprint(
        `[handleConfigDhcpServer] Failed to add excluded range ${exc.start}-${exc.end}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return ptSuccess({ device: payload.device, enabled: !!payload.enabled, pools: configuredPools });
}

/**
 * Inspecciona el estado actual del servidor DHCP en un dispositivo.
 * Devuelve información de pools, leases activos, y direcciones excluidas.
 * 
 * @param payload - InspectDhcpServerPayload con device y puerto opcional
 * @param deps - PtDeps con acceso a red y fileManager
 * @returns PtResult con estado DHCP, pools, y leases
 * 
 * @example
 * handleInspectDhcpServer({ type: "inspectDhcpServer", device: "Router1" }, deps)
 * // → {
 * //   ok: true,
 * //   device: "Router1",
 * //   enabled: true,
 * //   pools: [{ name: "LAN_POOL", network: "192.168.1.0", leases: [...] }],
 * //   excludedAddresses: [{ start: "192.168.1.1", end: "192.168.1.9" }]
 * // }
 */
export function handleInspectDhcpServer(payload: InspectDhcpServerPayload, deps: PtDeps): PtResult {
  const device = deps.getDeviceByName(payload.device) as PTDeviceWithProcesses | null;
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const portName = payload.port || "FastEthernet0";
  const dhcpMain = getDhcpMainProcess(device);
  if (!dhcpMain) return ptError("DHCP server not available", PtErrorCode.UNSUPPORTED_OPERATION);

  const dhcpServerProcess = getDhcpServerProcess(dhcpMain, portName);
  if (!dhcpServerProcess)
    return ptError(`DHCP server not found for port ${portName}`, PtErrorCode.UNSUPPORTED_OPERATION);

  const enabled = !!dhcpServerProcess.isEnabled();

  const pools: Array<Record<string, unknown>> = [];
  const poolCount = dhcpServerProcess.getPoolCount();
  for (let i = 0; i < poolCount; i++) {
    const pool = dhcpServerProcess.getPoolAt(i);
    if (!pool) continue;

    const leases: Array<Record<string, unknown>> = [];
    const leaseCount = ptSafeGet(pool, (p) => p.getLeaseCount?.()) ?? 0;
    for (let j = 0; j < leaseCount; j++) {
      const lease = ptSafeGet(pool, (p) => p.getLeaseAt?.(j) ?? null);
      if (!lease) continue;
      leases.push({
        mac: ptSafeGet(lease, (l) => l.getMac?.()) ?? "",
        ip: ptSafeGet(lease, (l) => l.getIp?.()) ?? "",
        expires: ptSafeGet(lease, (l) => l.getExpires?.()) ?? "",
      });
    }

    pools.push({
      name:
        ptSafeGet(pool, (p) => p.getDhcpPoolName?.()) ??
        ptSafeGet(pool, (p) => p.getPoolName?.()) ??
        "",
      network: ptSafeGet(pool, (p) => p.getNetworkAddress?.()) ?? "",
      mask:
        ptSafeGet(pool, (p) => p.getSubnetMask?.()) ??
        ptSafeGet(pool, (p) => p.getNetworkMask?.()) ??
        "",
      defaultRouter: ptSafeGet(pool, (p) => p.getDefaultRouter?.()) ?? "",
      dns: ptSafeGet(pool, (p) => p.getDnsServerIp?.()) ?? "",
      startIp: ptSafeGet(pool, (p) => p.getStartIp?.()) ?? "",
      endIp: ptSafeGet(pool, (p) => p.getEndIp?.()) ?? "",
      maxUsers: ptSafeGet(pool, (p) => p.getMaxUsers?.()) ?? 0,
      leaseCount,
      leases,
    });
  }

  const excludedAddresses: Array<Record<string, unknown>> = [];
  const excCount = dhcpServerProcess.getExcludedAddressCount();
  for (let i = 0; i < excCount; i++) {
    const exc = dhcpServerProcess.getExcludedAddressAt(i);
    if (!exc) continue;
    excludedAddresses.push({
      start: ptSafeGet(exc, (e) => e.start) ?? "",
      end: ptSafeGet(exc, (e) => e.end) ?? "",
    });
  }

  return ptSuccess({ device: payload.device, enabled, pools, excludedAddresses });
}
