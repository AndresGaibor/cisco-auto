import { expect, test, describe } from 'bun:test';
import { IosVerificationService } from '../src/application/services/ios-verification-service.js';

function makeExec(rawMap: Record<string, { raw: string; parsed?: any }>) {
  return async (device: string, command: string, parse = true) => {
    const key = command.toLowerCase();
    if (rawMap[key]) return rawMap[key];
    return { raw: '' };
  };
}

describe('IosVerificationService - Fase 4', () => {
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

  test('verifyAccessPort detects access mode and vlan', async () => {
    const exec = makeExec({
      'show running-config': {
        raw: '! Running configuration\ninterface GigabitEthernet0/1\n switchport mode access\n switchport access vlan 10\n!\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyAccessPort('SW1', 'GigabitEthernet0/1', 10);
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.checks && res.checks.some(c => c.ok)).toBe(true);
  });

  test('verifyTrunkPort detects trunk mode and allowed vlans', async () => {
    const exec = makeExec({
      'show running-config': {
        raw: '! Running configuration\ninterface GigabitEthernet0/1\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30\n!\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyTrunkPort('SW1', 'GigabitEthernet0/1', [10, 20, 30]);
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
  });

  test('verifyStaticRoute detects route in raw output', async () => {
    const exec = makeExec({
      'show ip route': {
        raw: 'S    10.0.0.0/24 [1/0] via 192.168.1.1\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyStaticRoute('R1', '10.0.0.0', '255.255.255.0', '192.168.1.1');
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
  });

  test('verifyDhcpRelay detects helper-address', async () => {
    const exec = makeExec({
      'show running-config': {
        raw: '! Running configuration\ninterface GigabitEthernet0/0\n ip helper-address 10.0.0.5\n!\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyDhcpRelay('R1', 'GigabitEthernet0/0', '10.0.0.5');
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
  });

  test('verifyDhcpPool detects pool in running-config', async () => {
    const exec = makeExec({
      'show running-config': {
        raw: 'ip dhcp pool OFFICE\n   network 192.168.1.0 255.255.255.0\n   default-router 192.168.1.1\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyDhcpPool('R1', 'OFFICE');
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.checks && res.checks[0].ok).toBe(true);
  });

  test('verifyDhcpPool fails when pool not found', async () => {
    const exec = makeExec({
      'show running-config': {
        raw: 'no dhcp pools configured\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyDhcpPool('R1', 'MISSING');
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(false);
  });

  test('verifyOspf detects ospf in show ip protocols', async () => {
    const exec = makeExec({
      'show ip protocols': {
        raw: 'Routing Protocol is "ospf 1"\n  Sending updates every 30 seconds\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyOspf('R1', 1);
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
  });

  test('verifyOspf fails when ospf not present', async () => {
    const exec = makeExec({
      'show ip protocols': {
        raw: 'Routing Protocol is "eigrp 100"\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyOspf('R1');
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(false);
  });

  test('verifyAcl detects acl in show access-lists', async () => {
    const exec = makeExec({
      'show access-lists': {
        raw: 'Standard IP access list 10\n    10 permit 192.168.1.0 0.0.0.255\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyAcl('R1', 10);
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(true);
  });

  test('verifyAcl fails when acl not found', async () => {
    const exec = makeExec({
      'show access-lists': {
        raw: 'Standard IP access list 20\n    10 deny any\n',
      },
    });
    const svc = new IosVerificationService(exec as any);
    const res = await svc.verifyAcl('R1', 99);
    expect(res.executed).toBe(true);
    expect(res.verified).toBe(false);
  });
});
