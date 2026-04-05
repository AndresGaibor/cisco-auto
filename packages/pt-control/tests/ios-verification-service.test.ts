import { expect, test } from 'bun:test';
import { IosVerificationService } from '../src/application/services/ios-verification-service.js';

// Mock exec function
function makeExec(rawMap: Record<string, { raw: string; parsed?: any }>) {
  return async (device: string, command: string, parse = true) => {
    const key = command.toLowerCase();
    if (rawMap[key]) return rawMap[key];
    return { raw: '' };
  };
}

test('verifyInterfaceIp detects correct ip from parsed entries', async () => {
  const exec = makeExec({
    'show ip interface brief': {
      raw: 'Interface IP-Address OK? Method Status Protocol\nGi0/1 10.0.0.1 YES manual up up',
      parsed: { entries: [{ interface: 'Gi0/1', ipAddress: '10.0.0.1' }] },
    },
  });

  const svc = new IosVerificationService(exec as any);
  const res = await svc.verifyInterfaceIp('R1', 'Gi0/1', '10.0.0.1');
  expect(res.executed).toBe(true);
  expect(res.verified).toBe(true);
  expect(res.checks && res.checks[0].ok).toBe(true);
});

test('verifyVlanExists detects existing vlan in parsed entries', async () => {
  const exec = makeExec({
    'show vlan brief': {
      raw: 'VLAN Name Status Ports\n10 ADMIN active Gi0/1',
      parsed: { entries: [{ id: 10, name: 'ADMIN', status: 'active', ports: ['Gi0/1'] }] },
    },
  });

  const svc = new IosVerificationService(exec as any);
  const res = await svc.verifyVlanExists('SW1', 10);
  expect(res.executed).toBe(true);
  expect(res.verified).toBe(true);
  expect(res.checks && res.checks[0].ok).toBe(true);
});
