import type { PtDeps } from "../pt-api/pt-deps.js";
import { ptError, ptSuccess, PtErrorCode, type PtResult } from "../pt-api/pt-results.js";
import type { PTDhcpServerMainProcess, PTDhcpServerProcess, PTDhcpPool } from "../utils/helpers.js";

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

export interface InspectDhcpServerPayload {
  type: "inspectDhcpServer";
  device: string;
  port?: string;
}

function getDhcpMainProcess(device: any): PTDhcpServerMainProcess | null {
  try {
    const candidates = ["DhcpServerMainProcess", "DHCPServerMainProcess", "DhcpServerMain"];
    for (const name of candidates) {
      const dhcpProcess = device.getProcess(name);
      if (dhcpProcess) return dhcpProcess as PTDhcpServerMainProcess;
    }
  } catch {
    return null;
  }
  return null;
}

function getDhcpServerProcess(main: PTDhcpServerMainProcess, portName: string): PTDhcpServerProcess | null {
  try {
    const maybeProcess = main as unknown as PTDhcpServerProcess;
    if (typeof maybeProcess.setEnable === "function" && typeof maybeProcess.getPoolCount === "function") {
      return maybeProcess;
    }
    return main.getDhcpServerProcessByPortName(portName);
  } catch {
    return null;
  }
}

function getPoolByName(dhcpProcess: PTDhcpServerProcess, name: string): PTDhcpPool | null {
  return (dhcpProcess.getPoolByName(name) as PTDhcpPool | null) ?? null;
}

export function handleConfigDhcpServer(payload: ConfigDhcpServerPayload, deps: PtDeps): PtResult {
  const device = deps.getDeviceByName(payload.device) as any;
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const portName = payload.port || "FastEthernet0";
  const dhcpMain = getDhcpMainProcess(device);
  if (!dhcpMain) return ptError("DHCP server not available", PtErrorCode.UNSUPPORTED_OPERATION);

  const dhcpServerProcess = getDhcpServerProcess(dhcpMain, portName);
  if (!dhcpServerProcess) return ptError(`DHCP server not found for port ${portName}`, PtErrorCode.UNSUPPORTED_OPERATION);

  try {
    dhcpServerProcess.setEnable(!!payload.enabled);
  } catch (error) {
    return ptError(`Failed to set DHCP enabled state: ${error instanceof Error ? error.message : String(error)}`);
  }

  const configuredPools: Array<{ name: string; network: string; mask: string }> = [];
  for (const poolConfig of payload.pools || []) {
    try {
      if (typeof (dhcpServerProcess as any).addNewPool === "function") {
        (dhcpServerProcess as any).addNewPool(poolConfig.name);
      } else if (typeof (dhcpServerProcess as any).addPool === "function") {
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

      configuredPools.push({ name: poolConfig.name, network: poolConfig.network || "", mask: poolConfig.mask || "" });
    } catch (error) {
      deps.dprint(`[handleConfigDhcpServer] Failed to configure pool ${poolConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const exc of payload.excluded || []) {
    if (!exc.start || !exc.end) continue;
    try {
      dhcpServerProcess.addExcludedAddress(exc.start, exc.end);
    } catch (error) {
      deps.dprint(`[handleConfigDhcpServer] Failed to add excluded range ${exc.start}-${exc.end}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return ptSuccess({ device: payload.device, enabled: !!payload.enabled, pools: configuredPools });
}

export function handleInspectDhcpServer(payload: InspectDhcpServerPayload, deps: PtDeps): PtResult {
  const device = deps.getDeviceByName(payload.device) as any;
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const portName = payload.port || "FastEthernet0";
  const dhcpMain = getDhcpMainProcess(device);
  if (!dhcpMain) return ptError("DHCP server not available", PtErrorCode.UNSUPPORTED_OPERATION);

  const dhcpServerProcess = getDhcpServerProcess(dhcpMain, portName);
  if (!dhcpServerProcess) return ptError(`DHCP server not found for port ${portName}`, PtErrorCode.UNSUPPORTED_OPERATION);

  const enabled = !!dhcpServerProcess.isEnabled();

  const pools: Array<Record<string, unknown>> = [];
  const poolCount = dhcpServerProcess.getPoolCount();
  for (let i = 0; i < poolCount; i++) {
    const pool = dhcpServerProcess.getPoolAt(i) as any;
    if (!pool) continue;

    const leases: Array<Record<string, unknown>> = [];
    const leaseCount = pool.getLeaseCount ? pool.getLeaseCount() : 0;
    for (let j = 0; j < leaseCount; j++) {
      const lease = pool.getLeaseAt ? pool.getLeaseAt(j) : null;
      if (!lease) continue;
      leases.push({
        mac: lease.getMac ? lease.getMac() : "",
        ip: lease.getIp ? lease.getIp() : "",
        expires: lease.getExpires ? lease.getExpires() : 0,
      });
    }

    pools.push({
      name: pool.getDhcpPoolName ? pool.getDhcpPoolName() : pool.getPoolName ? pool.getPoolName() : "",
      network: pool.getNetworkAddress ? pool.getNetworkAddress() : "",
      mask: pool.getSubnetMask ? pool.getSubnetMask() : pool.getNetworkMask ? pool.getNetworkMask() : "",
      defaultRouter: pool.getDefaultRouter ? pool.getDefaultRouter() : "",
      dns: pool.getDnsServerIp ? pool.getDnsServerIp() : "",
      startIp: pool.getStartIp ? pool.getStartIp() : "",
      endIp: pool.getEndIp ? pool.getEndIp() : "",
      maxUsers: pool.getMaxUsers ? pool.getMaxUsers() : 0,
      leaseCount,
      leases,
    });
  }

  const excludedAddresses: Array<Record<string, unknown>> = [];
  const excCount = dhcpServerProcess.getExcludedAddressCount();
  for (let i = 0; i < excCount; i++) {
    const exc = dhcpServerProcess.getExcludedAddressAt(i) as any;
    if (!exc) continue;
    excludedAddresses.push({
      start: exc.getStart ? exc.getStart() : exc.start || "",
      end: exc.getEnd ? exc.getEnd() : exc.end || "",
    });
  }

  return ptSuccess({ device: payload.device, enabled, pools, excludedAddresses });
}
