#!/usr/bin/env bun
/**
 * Verificación para el comando link add.
 * Inspecciona dispositivos y verifica que el enlace se creó correctamente.
 */

import type { PTController } from '@cisco-auto/pt-control';

export interface LinkVerificationData {
  endpointA: {
    device: string;
    port: string;
    exists: boolean;
  };
  endpointB: {
    device: string;
    port: string;
    exists: boolean;
  };
  linkVisible: boolean;
  linkUp: boolean;
  linkDetails?: {
    device1: string;
    port1: string;
    device2: string;
    port2: string;
    status1?: string;
    status2?: string;
  };
}

export async function verifyLink(
  controller: PTController,
  device1: string,
  port1: string,
  device2: string,
  port2: string
): Promise<LinkVerificationData> {
  const data: LinkVerificationData = {
    endpointA: {
      device: device1,
      port: port1,
      exists: false,
    },
    endpointB: {
      device: device2,
      port: port2,
      exists: false,
    },
    linkVisible: false,
  };

  try {
    const dev1Info = await controller.inspectDevice(device1);
    const dev1Port = dev1Info?.ports?.find(
      (p) => p.name.toLowerCase() === port1.toLowerCase()
    );
    data.endpointA.exists = !!dev1Port;
    
    // Verificar si el puerto tiene un enlace
    const port1HasLink = !!dev1Port?.link;
    
    const dev2Info = await controller.inspectDevice(device2);
    const dev2Port = dev2Info?.ports?.find(
      (p) => p.name.toLowerCase() === port2.toLowerCase()
    );
    data.endpointB.exists = !!dev2Port;
    
    // Verificar si el puerto tiene un enlace
    const port2HasLink = !!dev2Port?.link;
    
    // El enlace está visible si ambos puertos tienen link
    data.linkVisible = port1HasLink && port2HasLink;
    
    const isUp1 = dev1Port?.status === 'up' || (dev1Port as any)?.up === true;
    const isUp2 = dev2Port?.status === 'up' || (dev2Port as any)?.up === true;
    data.linkUp = isUp1 && isUp2;

    if (data.linkVisible) {
      data.linkDetails = {
        device1: device1,
        port1: port1,
        device2: device2,
        port2: port2,
        status1: dev1Port?.status || 'unknown',
        status2: dev2Port?.status || 'unknown',
      };
    }
  } catch {
    // Si falla la verificación, retornamos datos parciales
  }

  return data;
}

export function buildLinkVerificationChecks(
  data: LinkVerificationData
): Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> {
  const checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> = [];

  checks.push({
    name: 'endpoint-a-exists',
    ok: data.endpointA.exists,
    details: {
      device: data.endpointA.device,
      port: data.endpointA.port,
    },
  });

  checks.push({
    name: 'endpoint-b-exists',
    ok: data.endpointB.exists,
    details: {
      device: data.endpointB.device,
      port: data.endpointB.port,
    },
  });

  checks.push({
    name: 'link-visible',
    ok: data.linkVisible,
    details: data.linkDetails,
  });

  checks.push({
    name: 'link-up',
    ok: data.linkUp,
    details: data.linkUp ? { status: 'Operational' } : { status: 'Electrical Down (Red)' },
  });

  return checks;
}
