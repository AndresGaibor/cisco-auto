/**
 * Runtime DHCP Server Handlers Template
 * Handles DHCP server configuration and inspection
 */

export function generateDhcpServerHandlersTemplate(): string {
  return `// ============================================================================
// DHCP Server Handlers
// ============================================================================

function tryGetProcess(dev, names) {
  for (var i = 0; i < names.length; i++) {
    try {
      var p = dev.getProcess(names[i]);
      if (p) return { name: names[i], proc: p };
    } catch (e) {}
  }
  return null;
}

function handleConfigDhcpServer(payload) {
  var net = getNet();
  var device = net.getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };

  dprint("[handleConfigDhcpServer] device=" + payload.device + " enabled=" + payload.enabled);

  var portName = payload.port || "FastEthernet0";

  if (typeof device.getProcess !== "function") {
    return { ok: false, error: "Device does not support getProcess" };
  }

  var dhcpMainResult = tryGetProcess(device, ["DhcpServerMainProcess", "DHCPServerMainProcess", "DhcpServerMain"]);
  if (!dhcpMainResult) {
    return { ok: false, error: "DHCP server not available" };
  }

  var dhcpMain = dhcpMainResult.proc;

  var dhcpServerProcess = null;
  try {
    dhcpServerProcess = dhcpMain.getDhcpServerProcessByPortName(portName);
  } catch (e) {
    return { ok: false, error: "Failed to get DHCP server for port " + portName + ": " + String(e) };
  }

  if (!dhcpServerProcess) return { ok: false, error: "DHCP server not found for port " + portName };

  try {
    dhcpServerProcess.setEnable(!!payload.enabled);
  } catch (e) {
    return { ok: false, error: "Failed to set DHCP enabled state: " + String(e) };
  }

  var configuredPools = [];

  if (payload.pools && Array.isArray(payload.pools)) {
    for (var i = 0; i < payload.pools.length; i++) {
      var poolConfig = payload.pools[i];
      try {
        dhcpServerProcess.addPool(poolConfig.name);
        var pool = dhcpServerProcess.getPool(poolConfig.name);
        if (pool) {
          if (poolConfig.network) pool.setNetworkAddress(poolConfig.network);
          if (poolConfig.mask) pool.setNetworkMask(poolConfig.network, poolConfig.mask);
          if (poolConfig.defaultRouter) pool.setDefaultRouter(poolConfig.defaultRouter);
          if (poolConfig.dns) pool.setDnsServerIp(poolConfig.dns);
          if (poolConfig.startIp) pool.setStartIp(poolConfig.startIp);
          if (poolConfig.endIp) pool.setEndIp(poolConfig.endIp);
          if (poolConfig.maxUsers !== undefined) pool.setMaxUsers(poolConfig.maxUsers);

          configuredPools.push({
            name: poolConfig.name,
            network: poolConfig.network || "",
            mask: poolConfig.mask || ""
          });
        }
      } catch (e) {
        dprint("[handleConfigDhcpServer] Failed to configure pool " + poolConfig.name + ": " + String(e));
      }
    }
  }

  if (payload.excluded && Array.isArray(payload.excluded)) {
    for (var j = 0; j < payload.excluded.length; j++) {
      var exc = payload.excluded[j];
      if (exc.start && exc.end) {
        try {
          dhcpServerProcess.addExcludedAddress(exc.start, exc.end);
        } catch (e) {
          dprint("[handleConfigDhcpServer] Failed to add excluded range " + exc.start + "-" + exc.end + ": " + String(e));
        }
      }
    }
  }

  dprint("[handleConfigDhcpServer] SUCCESS for " + payload.device);

  return {
    ok: true,
    device: payload.device,
    enabled: !!payload.enabled,
    pools: configuredPools
  };
}

function handleInspectDhcpServer(payload) {
  var net = getNet();
  var device = net.getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };

  dprint("[handleInspectDhcpServer] device=" + payload.device);

  var portName = payload.port || "FastEthernet0";

  if (typeof device.getProcess !== "function") {
    return { ok: false, error: "Device does not support getProcess" };
  }

  var dhcpMainResult = tryGetProcess(device, ["DhcpServerMainProcess", "DHCPServerMainProcess", "DhcpServerMain"]);
  if (!dhcpMainResult) {
    return { ok: false, error: "DHCP server not available" };
  }

  var dhcpMain = dhcpMainResult.proc;

  var dhcpServerProcess = null;
  try {
    dhcpServerProcess = dhcpMain.getDhcpServerProcessByPortName(portName);
  } catch (e) {
    return { ok: false, error: "Failed to get DHCP server for port " + portName + ": " + String(e) };
  }

  if (!dhcpServerProcess) return { ok: false, error: "DHCP server not found for port " + portName };

  var enabled = false;
  try {
    enabled = !!dhcpServerProcess.isEnabled();
  } catch (e) {
    dprint("[handleInspectDhcpServer] isEnabled failed: " + String(e));
  }

  var pools = [];
  var poolCount = 0;
  try {
    poolCount = dhcpServerProcess.getPoolCount();
  } catch (e) {
    dprint("[handleInspectDhcpServer] getPoolCount failed: " + String(e));
  }

  for (var i = 0; i < poolCount; i++) {
    try {
      var pool = dhcpServerProcess.getPoolAt(i);
      if (pool) {
        var leaseCount = 0;
        var leases = [];
        try {
          leaseCount = pool.getLeaseCount();
        } catch (e) {}

        for (var k = 0; k < leaseCount; k++) {
          try {
            var lease = pool.getLeaseAt(k);
            if (lease) {
              leases.push({
                mac: lease.getMac ? lease.getMac() : "",
                ip: lease.getIp ? lease.getIp() : "",
                expires: lease.getExpires ? lease.getExpires() : 0
              });
            }
          } catch (e) {}
        }

        pools.push({
          name: pool.getDhcpPoolName ? pool.getDhcpPoolName() : "",
          network: pool.getNetworkAddress ? pool.getNetworkAddress() : "",
          mask: pool.getSubnetMask ? pool.getSubnetMask() : "",
          defaultRouter: pool.getDefaultRouter ? pool.getDefaultRouter() : "",
          dns: pool.getDnsServerIp ? pool.getDnsServerIp() : "",
          startIp: pool.getStartIp ? pool.getStartIp() : "",
          endIp: pool.getEndIp ? pool.getEndIp() : "",
          maxUsers: pool.getMaxUsers ? pool.getMaxUsers() : 0,
          leaseCount: leaseCount,
          leases: leases
        });
      }
    } catch (e) {
      dprint("[handleInspectDhcpServer] Failed to read pool at " + i + ": " + String(e));
    }
  }

  var excludedAddresses = [];
  var excCount = 0;
  try {
    excCount = dhcpServerProcess.getExcludedAddressCount();
  } catch (e) {
    dprint("[handleInspectDhcpServer] getExcludedAddressCount failed: " + String(e));
  }

  for (var j = 0; j < excCount; j++) {
    try {
      var exc = dhcpServerProcess.getExcludedAddressAt(j);
      if (exc) {
        excludedAddresses.push({
          start: exc.getStart ? exc.getStart() : "",
          end: exc.getEnd ? exc.getEnd() : ""
        });
      }
    } catch (e) {
      dprint("[handleInspectDhcpServer] Failed to read excluded address at " + j + ": " + String(e));
    }
  }

  return {
    ok: true,
    device: payload.device,
    enabled: enabled,
    pools: pools,
    excludedAddresses: excludedAddresses
  };
}
`;
}
