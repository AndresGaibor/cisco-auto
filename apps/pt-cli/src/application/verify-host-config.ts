#!/usr/bin/env bun
/**
 * Verificación para el comando config-host.
 * Inspecciona el dispositivo y verifica que la configuración IP se aplicó correctamente.
 */

import { type PTController } from "@cisco-auto/pt-control/controller";

export interface HostConfigVerificationData {
  deviceName: string;
  ip: string | null;
  mask: string | null;
  gateway: string | null;
  dns: string | null;
  dhcp: boolean;
  configApplied: boolean;
}

export async function verifyHostConfig(
  controller: PTController,
  deviceName: string,
  expectedIp?: string,
  expectedMask?: string,
  expectedGateway?: string,
  expectedDns?: string,
  expectedDhcp?: boolean
): Promise<HostConfigVerificationData> {
  const data: HostConfigVerificationData = {
    deviceName,
    ip: null,
    mask: null,
    gateway: null,
    dns: null,
    dhcp: false,
    configApplied: false,
  };

  try {
    const deviceInfo = await controller.inspectDevice(deviceName);
    
    if (deviceInfo) {
      data.ip = deviceInfo.ip ?? null;
      data.mask = deviceInfo.mask ?? null;
      data.gateway = deviceInfo.gateway ?? null;
      data.dns = deviceInfo.dns ?? null;
      data.dhcp = deviceInfo.dhcp ?? false;

      // Verificar que la configuración se aplicó
      let ipMatch = true;
      let maskMatch = true;
      let gatewayMatch = true;
      let dnsMatch = true;
      let dhcpMatch = true;

      if (expectedIp !== undefined) {
        ipMatch = data.ip === expectedIp;
      }
      if (expectedMask !== undefined) {
        maskMatch = data.mask === expectedMask;
      }
      if (expectedGateway !== undefined) {
        gatewayMatch = data.gateway === expectedGateway;
      }
      if (expectedDns !== undefined) {
        dnsMatch = data.dns === expectedDns;
      }
      if (expectedDhcp !== undefined) {
        dhcpMatch = data.dhcp === expectedDhcp;
      }

      // Si se proporcionaron expectativas, todas deben cumplirse
      if (expectedIp !== undefined || expectedMask !== undefined || 
          expectedGateway !== undefined || expectedDns !== undefined || 
          expectedDhcp !== undefined) {
        data.configApplied = ipMatch && maskMatch && gatewayMatch && dnsMatch && dhcpMatch;
      } else {
        // Si no hay expectativas, verificar que hay qualche configuración
        data.configApplied = !!(data.ip || data.dhcp);
      }
    }
  } catch {
    // Si falla la verificación, retornamos datos parciales
  }

  return data;
}

export function buildHostConfigVerificationChecks(
  data: HostConfigVerificationData,
  expectedIp?: string,
  expectedMask?: string,
  expectedGateway?: string,
  expectedDns?: string,
  expectedDhcp?: boolean
): Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> {
  const checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> = [];

  // Check 1: Device existe y responde
  checks.push({
    name: 'device-accessible',
    ok: data.ip !== null || data.dhcp,
    details: { device: data.deviceName },
  });

  // Check 2: IP configurada (si no es DHCP)
  if (!data.dhcp && expectedIp) {
    checks.push({
      name: 'ip-applied',
      ok: data.ip === expectedIp,
      details: { expected: expectedIp, actual: data.ip },
    });
  }

  // Check 3: Máscara configurada
  if (!data.dhcp && expectedMask) {
    checks.push({
      name: 'mask-applied',
      ok: data.mask === expectedMask,
      details: { expected: expectedMask, actual: data.mask },
    });
  }

  // Check 4: Gateway configurado (si se proporcionó)
  if (expectedGateway && !data.dhcp) {
    checks.push({
      name: 'gateway-applied',
      ok: data.gateway === expectedGateway,
      details: { expected: expectedGateway, actual: data.gateway },
    });
  }

  // Check 5: DNS configurado (si se proporcionó)
  if (expectedDns && !data.dhcp) {
    checks.push({
      name: 'dns-applied',
      ok: data.dns === expectedDns,
      details: { expected: expectedDns, actual: data.dns },
    });
  }

  // Check 6: Modo DHCP correcto
  if (expectedDhcp !== undefined) {
    checks.push({
      name: 'dhcp-mode',
      ok: data.dhcp === expectedDhcp,
      details: { expected: expectedDhcp, actual: data.dhcp },
    });
  }

  // Check 7: Configuración general aplicada
  checks.push({
    name: 'config-applied',
    ok: data.configApplied,
    details: {
      ip: data.ip,
      mask: data.mask,
      gateway: data.gateway,
      dns: data.dns,
      dhcp: data.dhcp,
    },
  });

  return checks;
}