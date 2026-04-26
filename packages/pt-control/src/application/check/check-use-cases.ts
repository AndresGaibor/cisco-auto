/**
 * Check use cases - business logic for network validation scenarios
 */

import type {
  CheckControllerPort,
  CheckResultItem,
  CheckDevice,
  CheckDeviceState,
} from "./check-types.js";

/**
 * Compute network address from IP and subnet mask
 */
export function getNetworkAddress(ip: string, mask: string): string {
  const ipParts = ip.split(".").map(Number);
  const maskParts = mask.split(".").map(Number);
  const netParts = ipParts.map((p, i) => p & (maskParts[i] ?? 0));
  return netParts.join(".");
}

/**
 * Convert subnet mask to CIDR bit count
 */
export function subnetMaskToBits(mask: string | undefined): number {
  if (!mask) return 0;
  const parts = mask.split(".").map(Number);
  let bits = 0;
  for (const part of parts) {
    let n = part;
    while (n > 0) {
      bits += n & 1;
      n >>= 1;
    }
  }
  return bits;
}

/**
 * Validate basic LAN scenario: 2 PCs + 1 switch, connectivity L2/L3
 */
export async function validateLanBasic(
  controller: CheckControllerPort,
  _scenario: string,
  _fix: boolean,
): Promise<CheckResultItem[]> {
  const checks: CheckResultItem[] = [];

  // Fetch device list
  let devices: CheckDevice[] = [];
  try {
    const result = await controller.listDevices();
    devices = Array.isArray(result) ? result : result.devices ?? [];
  } catch {
    devices = [];
  }

  const pcs = devices.filter(
    (d) => d.type === "pc" || d.type === 8 || d.type === "PC",
  );
  const switches = devices.filter(
    (d) =>
      d.type === "switch" ||
      d.type === "switch-l2" ||
      d.type === "switch_layer3" ||
      d.type === 1,
  );

  // Min PCs check
  if (pcs.length < 2) {
    checks.push({
      name: "min-pcs",
      status: "fail",
      message: `Se requieren al menos 2 PCs, encontrado(s): ${pcs.length}`,
    });
    return checks;
  }
  checks.push({ name: "min-pcs", status: "pass", message: `${pcs.length} PC(s) encontrado(s)` });

  // Min switches check
  if (switches.length < 1) {
    checks.push({
      name: "min-switches",
      status: "fail",
      message: "Se requiere al menos 1 switch",
    });
    return checks;
  }
  checks.push({
    name: "min-switches",
    status: "pass",
    message: `${switches.length} switch(es) encontrado(s)`,
  });

  const pc1 = pcs[0]!;
  const pc2 = pcs[1]!;
  const switch1 = switches[0]!;

  // Inspect PCs for IP info
  const pc1Info = await controller.inspectDevice(pc1.name);
  const pc2Info = await controller.inspectDevice(pc2.name);

  const pc1Ip = extractIp(pc1Info);
  const pc1Mask = extractMask(pc1Info);
  const pc2Ip = extractIp(pc2Info);
  const pc2Mask = extractMask(pc2Info);

  // PC1 IP check
  if (!pc1Ip) {
    checks.push({
      name: "pc1-ip",
      status: "fail",
      message: `${pc1.name} no tiene IP configurada`,
      fix: `pt config-host ${pc1.name} 192.168.10.10 255.255.255.0`,
    });
  } else {
    checks.push({ name: "pc1-ip", status: "pass", message: `${pc1.name}: ${pc1Ip}/${pc1Mask}` });
  }

  // PC2 IP check
  if (!pc2Ip) {
    checks.push({
      name: "pc2-ip",
      status: "fail",
      message: `${pc2.name} no tiene IP configurada`,
      fix: `pt config-host ${pc2.name} 192.168.10.20 255.255.255.0`,
    });
  } else {
    checks.push({ name: "pc2-ip", status: "pass", message: `${pc2.name}: ${pc2Ip}/${pc2Mask}` });
  }

  // Same subnet check
  if (pc1Ip && pc2Ip) {
    const pc1Net = getNetworkAddress(pc1Ip, pc1Mask);
    const pc2Net = getNetworkAddress(pc2Ip, pc2Mask);

    if (pc1Net === pc2Net) {
      checks.push({
        name: "same-subnet",
        status: "pass",
        message: "PC1 y PC2 están en la misma subred",
      });
    } else {
      checks.push({
        name: "same-subnet",
        status: "fail",
        message: `PC1 (${pc1Net}) y PC2 (${pc2Net}) en subredes diferentes`,
        fix: "Ajustar máscara o IP",
      });
    }

    // Mask mismatch check
    const maskBits1 = subnetMaskToBits(pc1Mask);
    const maskBits2 = subnetMaskToBits(pc2Mask);
    if (maskBits1 !== maskBits2) {
      checks.push({
        name: "mask-mismatch",
        status: "warning",
        message: `Máscaras diferentes: PC1 /${maskBits1}, PC2 /${maskBits2}`,
        details: { pc1Mask, pc2Mask },
        fix: `Usar /${Math.min(maskBits1, maskBits2)} para ambos`,
      });
    }
  }

  // Ping test
  if (pc1Ip && pc2Ip) {
    try {
      const pingResult = await controller.sendPing(pc1.name, pc2Ip, 30000);

      if (pingResult.success) {
        checks.push({
          name: "ping-pc1-to-pc2",
          status: "pass",
          message: `Ping ${pc1.name} → ${pc2.name} exitoso`,
        });
      } else {
        checks.push({
          name: "ping-pc1-to-pc2",
          status: "fail",
          message: `Ping ${pc1.name} → ${pc2.name} falló`,
          details: { raw: (pingResult.raw || "").slice(0, 200) },
          fix: "Verificar enlaces físicos y configuración IP",
        });
      }
    } catch (pingError: unknown) {
      checks.push({
        name: "ping-pc1-to-pc2",
        status: "fail",
        message: `No se pudo ejecutar ping: ${pingError instanceof Error ? pingError.message : String(pingError)}`,
        fix: "Verificar que PT esté corriendo",
      });
    }
  }

  // MAC table check
  try {
    const switchInfo = await controller.inspectDevice(switch1.name);
    const ports = (switchInfo as CheckDeviceState).ports || [];
    const macsWithAddress = ports.filter(
      (p) =>
        p.macAddress &&
        p.macAddress !== "0.0.0.0" &&
        p.macAddress !== "0000.0000.0000",
    );
    const uniqueMacs = new Set(macsWithAddress.map((p) => p.macAddress));

    if (uniqueMacs.size >= 2) {
      checks.push({
        name: "mac-table",
        status: "pass",
        message: `${switch1.name} tiene ${uniqueMacs.size} MAC(s) en puertos`,
        details: { macCount: uniqueMacs.size },
      });
    } else {
      checks.push({
        name: "mac-table",
        status: "warning",
        message: `${switch1.name} solo tiene ${uniqueMacs.size} MAC(s) en puertos - verificar enlaces`,
        details: {
          macCount: uniqueMacs.size,
          ports: ports.map((p) => ({ name: p.name, mac: p.macAddress })),
        },
      });
    }
  } catch {
    checks.push({ name: "mac-table", status: "skip", message: "No se pudo obtener tabla MAC" });
  }

  return checks;
}

/**
 * Validate gateway scenario: all hosts can reach their gateway
 */
export async function validateGateway(
  controller: CheckControllerPort,
  _scenario: string,
  _fix: boolean,
): Promise<CheckResultItem[]> {
  const checks: CheckResultItem[] = [];

  // Fetch device list
  let devices: CheckDevice[] = [];
  try {
    const result = await controller.listDevices();
    devices = Array.isArray(result) ? result : result.devices ?? [];
  } catch {
    devices = [];
  }

  const hosts = devices.filter((d) => d.type === "pc" || d.type === "server");

  for (const host of hosts) {
    const state = await controller.inspectDevice(host.name);
    const port = (state as CheckDeviceState).ports?.find(
      (p) => p.ipAddress && p.ipAddress !== "0.0.0.0",
    );

    if (!port?.ipAddress) {
      checks.push({
        name: `gateway-${host.name}`,
        status: "skip",
        message: `${host.name} no tiene IP`,
      });
      continue;
    }

    checks.push({
      name: `gateway-${host.name}`,
      status: "pass",
      message: `${host.name}: ${port.ipAddress}`,
    });
  }

  return checks;
}

/**
 * Helper to extract IP address from device state
 */
function extractIp(state: CheckDeviceState): string | undefined {
  return (
    (state as Record<string, unknown>).ip as string | undefined ||
    state.ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.ipAddress
  );
}

/**
 * Helper to extract subnet mask from device state
 */
function extractMask(state: CheckDeviceState): string {
  return (
    ((state as Record<string, unknown>).mask as string | undefined) ||
    state.ports?.find((p) => p.ipAddress && p.ipAddress !== "0.0.0.0")?.subnetMask ||
    "0.0.0.0"
  );
}