import { describe, expect, it } from 'bun:test';
import { ServicesGenerator } from './services.generator.ts';
import { IPv6Generator } from './ipv6.generator.ts';
import { EtherChannelGenerator } from './etherchannel.generator.ts';
import { STPGenerator } from './stp.generator.ts';
import { AdvancedRoutingGenerator } from './advanced-routing.generator.ts';

describe('Wave 10 generator coverage', () => {
  it('genera servicios DHCP y NTP', () => {
    const commands = ServicesGenerator.generateServices({
      dhcp: [
        {
          poolName: 'LAN',
          network: '192.168.10.0',
          subnetMask: '255.255.255.0',
          defaultRouter: '192.168.10.1',
          dnsServers: ['8.8.8.8'],
        },
      ],
      ntp: {
        servers: [{ ip: '10.0.0.10', prefer: true }],
      },
    });

    expect(commands.join('\n')).toContain('ip dhcp pool LAN');
    expect(commands.join('\n')).toContain('ntp server 10.0.0.10');
  });

  it('genera IPv6 básico', () => {
    const commands = IPv6Generator.generate({
      routing: true,
      interfaces: [{ name: 'GigabitEthernet0/0', address: '2001:db8:1::1/64' }],
    });

    expect(commands).toContain('ipv6 unicast-routing');
    expect(commands.join('\n')).toContain('interface GigabitEthernet0/0');
  });

  it('genera EtherChannel y STP', () => {
    const ether = EtherChannelGenerator.generate([
      {
        groupId: 1,
        mode: 'active',
        protocol: 'lacp',
        interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
        portChannel: 'Port-channel1',
        trunkMode: 'trunk',
        allowedVlans: [10, 20],
      },
    ]);

    const stp = STPGenerator.generate({
      mode: 'rapid-pvst',
      rootPrimary: [10],
      interfaceConfig: [{ interface: 'FastEthernet0/1', portfast: true, bpduguard: true }],
    });

    expect(ether.join('\n')).toContain('channel-group 1 mode active');
    expect(stp.join('\n')).toContain('spanning-tree vlan 10 root primary');
  });

  it('genera BGP avanzado', () => {
    const commands = AdvancedRoutingGenerator.generateBGP({
      asn: 65000,
      routerId: '1.1.1.1',
      neighbors: [{ ip: '10.0.0.1', remoteAs: 65001, nextHopSelf: true }],
      networks: [{ network: '192.168.0.0', mask: '255.255.0.0' }],
    });

    expect(commands.join('\n')).toContain('router bgp 65000');
    expect(commands.join('\n')).toContain('neighbor 10.0.0.1 next-hop-self');
  });
});
