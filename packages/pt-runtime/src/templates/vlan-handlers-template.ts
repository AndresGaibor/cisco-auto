/**
 * Runtime VLAN Handlers Template
 * Handles VLAN creation and SVI interface configuration for multilayer switches
 */

export function generateVlanHandlersTemplate(): string {
  return `// ============================================================================
// VLAN Handlers
// ============================================================================

function handleEnsureVlans(payload) {
  var net = getNet();
  var deviceName = payload.device;
  var vlans = payload.vlans || [];

  dprint("[handleEnsureVlans] Device: " + deviceName + ", VLANs: " + JSON.stringify(vlans));

  var device = net.getDevice(deviceName);
  if (!device) {
    return { ok: false, error: "Device not found: " + deviceName };
  }

  if (typeof device.getProcess !== "function") {
    return { ok: false, error: "Device does not support getProcess: " + deviceName };
  }

  var vlanManager;
  try {
    vlanManager = device.getProcess("VlanManager");
  } catch (e) {
    return { ok: false, error: "Failed to get VlanManager: " + String(e) };
  }

  if (!vlanManager) {
    return { ok: false, error: "VlanManager not available on device: " + deviceName };
  }

  var results = [];

  for (var i = 0; i < vlans.length; i++) {
    var vlan = vlans[i];
    var vlanId = vlan.id;
    var vlanName = vlan.name || "VLAN" + vlanId;
    var created = false;

    try {
      var vlanCount = vlanManager.getVlanCount();
      var found = false;

      for (var j = 0; j < vlanCount; j++) {
        try {
          var existingVlan = vlanManager.getVlanAt(j);
          if (existingVlan && existingVlan.id === vlanId) {
            found = true;
            dprint("[handleEnsureVlans] VLAN " + vlanId + " already exists");
            break;
          }
        } catch (e) {}
      }

      if (!found) {
        var added = vlanManager.addVlan(vlanId, vlanName);
        if (added) {
          created = true;
          dprint("[handleEnsureVlans] Created VLAN " + vlanId + " (" + vlanName + ")");
        } else {
          dprint("[handleEnsureVlans] Failed to create VLAN " + vlanId);
        }
      }

      results.push({
        id: vlanId,
        name: vlanName,
        created: created
      });
    } catch (e) {
      dprint("[handleEnsureVlans] Error handling VLAN " + vlanId + ": " + String(e));
      results.push({
        id: vlanId,
        name: vlanName,
        created: false,
        error: String(e)
      });
    }
  }

  return {
    ok: true,
    device: deviceName,
    vlans: results
  };
}

function handleConfigVlanInterfaces(payload) {
  var net = getNet();
  var deviceName = payload.device;
  var interfaces = payload.interfaces || [];

  dprint("[handleConfigVlanInterfaces] Device: " + deviceName + ", Interfaces: " + JSON.stringify(interfaces));

  var device = net.getDevice(deviceName);
  if (!device) {
    return { ok: false, error: "Device not found: " + deviceName };
  }

  if (typeof device.getProcess !== "function") {
    return { ok: false, error: "Device does not support getProcess: " + deviceName };
  }

  var vlanManager;
  try {
    vlanManager = device.getProcess("VlanManager");
  } catch (e) {
    return { ok: false, error: "Failed to get VlanManager: " + String(e) };
  }

  if (!vlanManager) {
    return { ok: false, error: "VlanManager not available on device: " + deviceName };
  }

  var results = [];

  for (var i = 0; i < interfaces.length; i++) {
    var iface = interfaces[i];
    var vlanId = iface.vlanId;
    var ip = iface.ip;
    var mask = iface.mask;

    dprint("[handleConfigVlanInterfaces] Configuring VLAN " + vlanId + " with IP " + ip + "/" + mask);

    try {
      var vlanExists = false;
      var vlanCount = vlanManager.getVlanCount();

      for (var j = 0; j < vlanCount; j++) {
        try {
          var existingVlan = vlanManager.getVlanAt(j);
          if (existingVlan && existingVlan.id === vlanId) {
            vlanExists = true;
            break;
          }
        } catch (e) {}
      }

      if (!vlanExists) {
        dprint("[handleConfigVlanInterfaces] VLAN " + vlanId + " does not exist, creating it");
        var added = vlanManager.addVlan(vlanId, "VLAN" + vlanId);
        if (!added) {
          results.push({
            vlanId: vlanId,
            ip: ip,
            mask: mask,
            error: "Failed to create VLAN"
          });
          continue;
        }
      }

      var sviCreated = false;
      var svi = vlanManager.getVlanInt(vlanId);
      if (!svi) {
        sviCreated = vlanManager.addVlanInt(vlanId);
        if (sviCreated) {
          svi = vlanManager.getVlanInt(vlanId);
          dprint("[handleConfigVlanInterfaces] Created SVI for VLAN " + vlanId);
        }
      }

      if (!svi) {
        results.push({
          vlanId: vlanId,
          ip: ip,
          mask: mask,
          error: "Failed to get or create SVI interface"
        });
        continue;
      }

      if (ip && mask) {
        try {
          svi.setIpSubnetMask(ip, mask);
          dprint("[handleConfigVlanInterfaces] Set IP " + ip + "/" + mask + " on VLAN " + vlanId);
        } catch (e) {
          results.push({
            vlanId: vlanId,
            ip: ip,
            mask: mask,
            error: "Failed to set IP: " + String(e)
          });
          continue;
        }
      }

      results.push({
        vlanId: vlanId,
        ip: ip,
        mask: mask
      });
    } catch (e) {
      dprint("[handleConfigVlanInterfaces] Error configuring VLAN " + vlanId + ": " + String(e));
      results.push({
        vlanId: vlanId,
        ip: ip,
        mask: mask,
        error: String(e)
      });
    }
  }

  return {
    ok: true,
    device: deviceName,
    interfaces: results
  };
}
`;
}
