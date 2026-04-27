import type { PTDevice, PTPort } from "../pt-api/pt-api-registry.js";
import { normalizePortKey } from "./port-utils.js";

/** Get the available port names for a device. */
export function getDevicePortNames(device: PTDevice): string[] {
  const names: string[] = [];
  const count = device.getPortCount?.() ?? 0;

  for (let i = 0; i < count; i++) {
    const port = device.getPortAt(i);
    if (port) {
      const portName = port.getName?.();
      if (portName) names.push(String(portName));
    }
  }

  return names;
}

/** Resolve a requested port name against the device ports.
 * Two-pass strategy:
 * - Pass 1: exact match across ALL ports (case-insensitive, whitespace-normalized)
 * - Pass 2: suffix match as fallback (for abbreviated names like Gi0/1 matching GigabitEthernet0/1)
 */
export function resolveDevicePortName(device: PTDevice, requested: string): string | null {
  const wanted = String(requested || "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const names = getDevicePortNames(device);

  for (const candidate of names) {
    const candidateValue = String(candidate || "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (candidateValue === wanted) return candidate;
  }

  const wantedKey = normalizePortKey(requested);
  for (const candidate of names) {
    if (normalizePortKey(candidate) === wantedKey) return candidate;
  }

  return null;
}

/**
 * Collect detailed port data from a device.
 * Uses PT API safely with checks for existence of methods.
 */
export function collectPorts(device: PTDevice): Array<Record<string, any>> {
  const ports: Array<Record<string, any>> = [];
  const count = typeof device.getPortCount === "function" ? device.getPortCount() : 0;

  for (let i = 0; i < count; i++) {
    const port = typeof device.getPortAt === "function" ? (device.getPortAt(i) as PTPort | null) : null;
    if (!port || typeof port.getName !== "function") continue;

    let ip = typeof port.getIpAddress === "function" ? String(port.getIpAddress()) : "";
    let mask = typeof port.getSubnetMask === "function" ? String(port.getSubnetMask()) : "";

    // OMNISCIENCE BYPASS: If no IP on port, check device IPv4 Manager (for PCs/Servers)
    if (
      (!ip || ip === "0.0.0.0" || ip === "") &&
      typeof (device as any).getIPv4Config === "function"
    ) {
      const ipv4 = (device as any).getIPv4Config();
      if (ipv4 && ipv4.getIpAddress) {
          try { ip = String(ipv4.getIpAddress().toString()); } catch(e) { ip = String(ipv4.getIpAddress()); }
          try { mask = String(ipv4.getSubnetMask().toString()); } catch(e) { mask = String(ipv4.getSubnetMask()); }
      }
    }

    const data: Record<string, any> = {
      name: String(port.getName()),
      ipAddress: String(ip),
      subnetMask: String(mask),
      macAddress: String(typeof port.getMacAddress === "function" ? port.getMacAddress() : ""),
      status: (typeof port.isPortUp === "function" ? port.isPortUp() : false) ? "up" : "down",
      protocol: (typeof port.isProtocolUp === "function" ? port.isProtocolUp() : false)
        ? "up"
        : "down",
    };

    if (typeof (port as any).getVlan === "function") {
      data.vlan = (port as any).getVlan();
    }

    try {
      const linkObj = typeof (port as any).getLink === "function" ? (port as any).getLink() : null;
      if (linkObj) {
        let otherPort: PTPort | null = null;
        if (typeof (linkObj as any).getOtherPort === "function") {
          otherPort = (linkObj as any).getOtherPort(port) as PTPort | null;
        } else if (
          typeof (linkObj as any).getPort1 === "function" &&
          typeof (linkObj as any).getPort2 === "function"
        ) {
          const p1 = (linkObj as any).getPort1() as PTPort | null;
          const p2 = (linkObj as any).getPort2() as PTPort | null;
          const ourMac = data.macAddress?.toLowerCase().replace(/[:.-]/g, "") || "";
          const p1Mac =
            p1 && typeof p1.getMacAddress === "function"
              ? p1.getMacAddress().toLowerCase().replace(/[:.-]/g, "")
              : null;
          const p2Mac =
            p2 && typeof p2.getMacAddress === "function"
              ? p2.getMacAddress().toLowerCase().replace(/[:.-]/g, "")
              : null;
          if (ourMac && p1Mac && p2Mac) {
            otherPort = ourMac === p1Mac ? p2 : p1;
          } else {
            const ourName = data.name;
            const p1Name = p1 && typeof p1.getName === "function" ? p1.getName() : null;
            otherPort = ourName === p1Name ? p2 : p1;
          }
        }
        if (otherPort && typeof otherPort.getName === "function") {
          data.linkedPortName = otherPort.getName();
          if (typeof otherPort.getMacAddress === "function") {
            data.linkedPortMac = otherPort.getMacAddress().toLowerCase().replace(/[:.-]/g, "");
          }
        }
      }
    } catch {
      // getLink() puede no estar disponible en algunos tipos de puerto
    }

    ports.push(data);
  }
  return ports;
}
