import { describe, expect, it } from 'bun:test';
import { generateIosCommands, ptGenerateScriptTool } from '../generate-script';
import type { TopologyPlan } from '../../..';

function crearPlan(): TopologyPlan {
  return {
    id: 'plan-1',
    name: 'Lab-Completo',
    devices: [
      {
        id: 'S1',
        name: 'Switch1',
        model: {
          name: '2960',
          type: 'switch',
          ptType: '2960',
          ports: [],
        },
        position: { x: 0, y: 0 },
        interfaces: [
          {
            name: 'FastEthernet0/1',
            configured: true,
            vlan: 10,
            description: 'PC1',
          },
          {
            name: 'GigabitEthernet0/1',
            configured: true,
            description: 'Uplink',
          },
        ],
        vlans: [
          { id: 10, name: 'USERS', ipRange: '192.168.10.0/24' },
          { id: 20, name: 'SERVERS' },
        ],
        dhcp: [
          {
            poolName: 'USERS_POOL',
            network: '192.168.10.0',
            subnetMask: '255.255.255.0',
            defaultRouter: '192.168.10.1',
            dnsServer: '8.8.8.8',
            exclude: ['192.168.10.1', '192.168.10.10'],
          },
        ],
        routing: {
          static: [
            {
              network: '0.0.0.0',
              mask: '0.0.0.0',
              nextHop: '192.168.1.1',
            },
          ],
          ospf: {
            processId: 1,
            routerId: '1.1.1.1',
            defaultRoute: true,
            areas: [
              {
                area: 0,
                networks: ['10.0.0.0/24'],
              },
            ],
          },
          eigrp: {
            asNumber: 100,
            networks: ['172.16.0.0'],
            defaultRoute: false,
          },
        },
        credentials: {
          username: 'admin',
          password: 'cisco',
        },
        stp: {
          mode: 'rapid-pvst',
          portfastDefault: true,
          bpduguardDefault: true,
          interfaceConfig: [
            { interface: 'FastEthernet0/1', portfast: true, bpduguard: true },
          ],
        },
        acls: [
          {
            name: 'BLOCK_TELNET',
            type: 'extended',
            entries: [
              {
                action: 'deny',
                protocol: 'tcp',
                source: 'any',
                destination: 'any',
                port: '23',
                log: true,
              },
            ],
          },
        ],
        services: {
          ntp: {
            servers: [{ ip: '10.0.0.1', prefer: true }],
          },
          snmp: {
            contact: 'NOC',
            location: 'Lab',
            communities: [{ name: 'public', access: 'ro' }],
          },
          http: { enabled: true },
          ftp: { enabled: true },
          syslog: { servers: [{ ip: '10.0.0.2' }] },
        },
        lines: {
          console: { login: true, execTimeout: 10 },
          vty: { start: 0, end: 4, login: true, transportInput: 'ssh' },
        },
      } as any,
    ],
    links: [],
    params: {
      routerCount: 0,
      switchCount: 1,
      pcCount: 0,
      networkType: 'single_lan',
    },
    validation: { valid: true, errors: [], warnings: [] },
    metadata: { createdAt: new Date() },
  } as TopologyPlan;
}

describe('generate-script', () => {
  it('genera comandos IOS completos con VLAN, STP, routing, ACL y servicios', () => {
    const plan = crearPlan();
    const commands = generateIosCommands(plan.devices[0]!);

    expect(commands).toContain('vlan 10');
    expect(commands).toContain('spanning-tree mode rapid-pvst');
    expect(commands).toContain('ip route 0.0.0.0 255.255.255.255 192.168.1.1');
    expect(commands).toContain('router ospf 1');
    expect(commands).toContain('router eigrp 100');
    expect(commands).toContain('access-list BLOCK_TELNET deny tcp any any eq 23 log');
    expect(commands).toContain('ip dhcp pool USERS_POOL');
    expect(commands).toContain('ntp server 10.0.0.1 prefer');
  });

  it('incluye los comandos IOS completos en el script JavaScript', async () => {
    const plan = crearPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'javascript' } as any, {} as any);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as any;
    expect(data.script).toContain('pt.configureIosDevice("S1", [');
    expect(data.script).toContain('spanning-tree mode rapid-pvst');
    expect(data.script).toContain('access-list BLOCK_TELNET deny tcp any any eq 23 log');
  });

  it('incluye los comandos IOS completos en el script Python', async () => {
    const plan = crearPlan();
    const result = await ptGenerateScriptTool.handler({ plan, format: 'python' } as any, {} as any);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as any;
    expect(data.script).toContain('pt.configure_ios_device("S1", """');
    expect(data.script).toContain('spanning-tree mode rapid-pvst');
    expect(data.script).toContain('ip dhcp pool USERS_POOL');
  });
});
