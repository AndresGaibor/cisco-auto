/**
 * PROTOCOL GENERATORS TESTS
 */

import { describe, test, expect } from 'bun:test';
import { STPGenerator } from '../../src/core/config-generators/stp.generator';
import { EtherChannelGenerator } from '../../src/core/config-generators/etherchannel.generator';
import { AdvancedRoutingGenerator } from '../../src/core/config-generators/advanced-routing.generator';
import { IPv6Generator } from '../../src/core/config-generators/ipv6.generator';
import { ServicesGenerator } from '../../src/core/config-generators/services.generator';
import type { 
  STPSpec, 
  EtherChannelSpec,
  RIPSpec,
  BGPSpec,
  IPv6Spec,
  DHCPServerSpec,
  NTPSpec
} from '../../src/core/canonical/protocol.spec';

describe('STPGenerator', () => {
  describe('generate', () => {
    test('should generate rapid-pvst mode', () => {
      const spec: STPSpec = { mode: 'rapid-pvst' };
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('! Spanning Tree Protocol Configuration');
      expect(config).toContain('spanning-tree mode rapid-pvst');
    });
    
    test('should generate root primary', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        rootPrimary: [1, 10, 20]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('spanning-tree vlan 1,10,20 root primary');
    });
    
    test('should generate portfast and bpduguard defaults', () => {
      const spec: STPSpec = {
        mode: 'pvst',
        portfastDefault: true,
        bpduguardDefault: true
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('spanning-tree portfast default');
      expect(config).toContain('spanning-tree portfast bpduguard default');
    });
    
    test('should generate interface configuration', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        interfaceConfig: [
          {
            interface: 'FastEthernet0/1',
            portfast: true,
            bpduguard: true
          }
        ]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('interface FastEthernet0/1');
      expect(config).toContain(' spanning-tree portfast');
      expect(config).toContain(' spanning-tree bpduguard enable');
    });
    
    test('should generate VLAN-specific configuration', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        vlanConfig: [
          { vlanId: 10, priority: 4096 },
          { vlanId: 20, rootPrimary: true }
        ]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('spanning-tree vlan 10 priority 4096');
      expect(config).toContain('spanning-tree vlan 20 root primary');
    });
  });
  
  describe('validate', () => {
    test('should validate correct priority', () => {
      const spec: STPSpec = { mode: 'rapid-pvst', priority: 4096 };
      const result = STPGenerator.validate(spec);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    test('should reject non-multiple-of-4096 priority', () => {
      const spec: STPSpec = { mode: 'rapid-pvst', priority: 5000 };
      const result = STPGenerator.validate(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('multiple of 4096'))).toBe(true);
    });
    
    test('should warn about portfast without bpduguard', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        portfastDefault: true
      };
      const result = STPGenerator.validate(spec);
      
      expect(result.warnings.some(w => w.includes('security risk'))).toBe(true);
    });
  });
});

describe('EtherChannelGenerator', () => {
  describe('generate', () => {
    test('should generate LACP configuration', () => {
      const spec: EtherChannelSpec = {
        groupId: 1,
        mode: 'active',
        protocol: 'lacp',
        interfaces: ['Gi0/1', 'Gi0/2'],
        portChannel: 'Port-channel1',
        trunkMode: 'trunk'
      };
      
      const config = EtherChannelGenerator.generate([spec]);
      
      expect(config).toContain('interface Gi0/1');
      expect(config).toContain(' channel-group 1 mode active');
      expect(config).toContain('interface Port-channel1');
      expect(config).toContain(' switchport mode trunk');
    });
    
    test('should generate PAgP configuration', () => {
      const spec: EtherChannelSpec = {
        groupId: 2,
        mode: 'desirable',
        protocol: 'pagp',
        interfaces: ['Gi1/0/1', 'Gi1/0/2'],
        portChannel: 'Port-channel2',
        trunkMode: 'access',
        accessVlan: 10
      };
      
      const config = EtherChannelGenerator.generate([spec]);
      
      expect(config).toContain(' channel-group 2 mode desirable');
      expect(config).toContain(' switchport mode access');
      expect(config).toContain(' switchport access vlan 10');
    });
    
    test('should generate static (on) configuration', () => {
      const spec: EtherChannelSpec = {
        groupId: 3,
        mode: 'on',
        protocol: 'static',
        interfaces: ['Gi0/3', 'Gi0/4'],
        portChannel: 'Port-channel3'
      };
      
      const config = EtherChannelGenerator.generate([spec]);
      
      expect(config).toContain(' channel-group 3 mode on');
    });
    
    test('should generate allowed VLANs for trunk', () => {
      const spec: EtherChannelSpec = {
        groupId: 1,
        mode: 'active',
        protocol: 'lacp',
        interfaces: ['Gi0/1', 'Gi0/2'],
        portChannel: 'Port-channel1',
        trunkMode: 'trunk',
        allowedVlans: [1, 10, 20, 30],
        nativeVlan: 99
      };
      
      const config = EtherChannelGenerator.generate([spec]);
      
      expect(config).toContain(' switchport trunk allowed vlan 1,10,20,30');
      expect(config).toContain(' switchport trunk native vlan 99');
    });
  });
  
  describe('validate', () => {
    test('should reject invalid group ID', () => {
      const spec: EtherChannelSpec = {
        groupId: 100,
        mode: 'active',
        protocol: 'lacp',
        interfaces: ['Gi0/1'],
        portChannel: 'Port-channel100'
      };
      
      const result = EtherChannelGenerator.validate(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be between 1 and 64'))).toBe(true);
    });
    
    test('should reject LACP with wrong mode', () => {
      const spec: EtherChannelSpec = {
        groupId: 1,
        mode: 'desirable',
        protocol: 'lacp',
        interfaces: ['Gi0/1', 'Gi0/2'],
        portChannel: 'Port-channel1'
      };
      
      const result = EtherChannelGenerator.validate(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('active\' or \'passive\''))).toBe(true);
    });
    
    test('should warn about static mode', () => {
      const spec: EtherChannelSpec = {
        groupId: 1,
        mode: 'on',
        protocol: 'static',
        interfaces: ['Gi0/1', 'Gi0/2'],
        portChannel: 'Port-channel1'
      };
      
      const result = EtherChannelGenerator.validate(spec);
      
      expect(result.warnings.some(w => w.includes('does not use LACP/PAgP'))).toBe(true);
    });
  });
});

describe('AdvancedRoutingGenerator', () => {
  describe('generateRIP', () => {
    test('should generate RIPv2 configuration', () => {
      const spec: RIPSpec = {
        version: 2,
        networks: ['192.168.1.0', '192.168.2.0'],
        autoSummary: false
      };
      
      const config = AdvancedRoutingGenerator.generateRIP(spec);
      
      expect(config).toContain('router rip');
      expect(config).toContain(' version 2');
      expect(config).toContain(' network 192.168.1.0');
      expect(config).toContain(' no auto-summary');
    });
    
    test('should generate passive interfaces', () => {
      const spec: RIPSpec = {
        version: 2,
        networks: ['10.0.0.0'],
        passiveInterfaces: ['Gi0/0', 'Gi0/1']
      };
      
      const config = AdvancedRoutingGenerator.generateRIP(spec);
      
      expect(config).toContain(' passive-interface Gi0/0');
      expect(config).toContain(' passive-interface Gi0/1');
    });
    
    test('should generate default-information originate', () => {
      const spec: RIPSpec = {
        version: 2,
        networks: ['10.0.0.0'],
        defaultInformation: 'originate always'
      };
      
      const config = AdvancedRoutingGenerator.generateRIP(spec);
      
      expect(config).toContain(' default-information originate always');
    });
  });
  
  describe('generateBGP', () => {
    test('should generate eBGP configuration', () => {
      const spec: BGPSpec = {
        asn: 65001,
        routerId: '1.1.1.1',
        neighbors: [
          { ip: '203.0.113.1', remoteAs: 65002 }
        ]
      };
      
      const config = AdvancedRoutingGenerator.generateBGP(spec);
      
      expect(config).toContain('router bgp 65001');
      expect(config).toContain(' bgp router-id 1.1.1.1');
      expect(config).toContain(' neighbor 203.0.113.1 remote-as 65002');
    });
    
    test('should generate neighbor with options', () => {
      const spec: BGPSpec = {
        asn: 65001,
        neighbors: [
          {
            ip: '10.0.0.1',
            remoteAs: 65001,
            description: 'iBGP Peer',
            updateSource: 'Loopback0',
            nextHopSelf: true
          }
        ]
      };
      
      const config = AdvancedRoutingGenerator.generateBGP(spec);
      
      expect(config).toContain(' neighbor 10.0.0.1 description iBGP Peer');
      expect(config).toContain(' neighbor 10.0.0.1 update-source Loopback0');
      expect(config).toContain(' neighbor 10.0.0.1 next-hop-self');
    });
    
    test('should generate networks', () => {
      const spec: BGPSpec = {
        asn: 65001,
        neighbors: [{ ip: '10.0.0.1', remoteAs: 65002 }],
        networks: [
          { network: '192.168.0.0', mask: '255.255.0.0' }
        ]
      };
      
      const config = AdvancedRoutingGenerator.generateBGP(spec);
      
      expect(config).toContain(' network 192.168.0.0 mask 255.255.0.0');
    });
  });
});

describe('IPv6Generator', () => {
  describe('generate', () => {
    test('should enable IPv6 routing', () => {
      const spec: IPv6Spec = { routing: true };
      const config = IPv6Generator.generate(spec);
      
      expect(config).toContain('ipv6 unicast-routing');
    });
    
    test('should configure IPv6 address on interface', () => {
      const spec: IPv6Spec = {
        routing: true,
        interfaces: [
          {
            name: 'GigabitEthernet0/0',
            address: '2001:db8::1/64',
            linkLocal: 'fe80::1'
          }
        ]
      };
      
      const config = IPv6Generator.generate(spec);
      
      expect(config).toContain('interface GigabitEthernet0/0');
      expect(config).toContain(' ipv6 enable');
      expect(config).toContain(' ipv6 address 2001:db8::1/64');
      expect(config).toContain(' ipv6 address fe80::1 link-local');
    });
    
    test('should configure static route', () => {
      const spec: IPv6Spec = {
        routing: true,
        staticRoutes: [
          { network: '2001:db8:100::/64', nextHop: '2001:db8::2' }
        ]
      };
      
      const config = IPv6Generator.generate(spec);
      
      expect(config).toContain('ipv6 route 2001:db8:100::/64 2001:db8::2');
    });
    
    test('should configure OSPFv3', () => {
      const spec: IPv6Spec = {
        routing: true,
        interfaces: [
          {
            name: 'Gi0/0',
            ospfv3: { processId: 1, area: '0' }
          }
        ],
        ospfv3: {
          processId: 1,
          routerId: '1.1.1.1',
          areas: [{ areaId: '0', type: 'normal' }]
        }
      };
      
      const config = IPv6Generator.generate(spec);
      
      expect(config).toContain('ipv6 router ospf 1');
      expect(config).toContain(' router-id 1.1.1.1');
      expect(config).toContain(' ipv6 ospf 1 area 0');
    });
  });
  
  describe('validate', () => {
    test('should validate IPv6 addresses', () => {
      const spec: IPv6Spec = {
        routing: true,
        interfaces: [
          { name: 'Gi0/0', address: 'invalid-ipv6' }
        ]
      };
      
      const result = IPv6Generator.validate(spec);
      
      expect(result.valid).toBe(false);
    });
  });
});

describe('ServicesGenerator', () => {
  describe('generateDHCP', () => {
    test('should generate DHCP pool', () => {
      const specs: DHCPServerSpec[] = [{
        poolName: 'VLAN10',
        network: '192.168.10.0',
        subnetMask: '255.255.255.0',
        defaultRouter: '192.168.10.1'
      }];
      
      const config = ServicesGenerator.generateDHCP(specs);
      
      expect(config).toContain('ip dhcp pool VLAN10');
      expect(config).toContain(' network 192.168.10.0 255.255.255.0');
      expect(config).toContain(' default-router 192.168.10.1');
    });
    
    test('should generate excluded addresses', () => {
      const specs: DHCPServerSpec[] = [{
        poolName: 'POOL1',
        network: '10.0.0.0',
        subnetMask: '255.255.255.0',
        excludedAddresses: ['10.0.0.1', '10.0.0.10']
      }];
      
      const config = ServicesGenerator.generateDHCP(specs);
      
      expect(config).toContain('ip dhcp excluded-address 10.0.0.1');
      expect(config).toContain('ip dhcp excluded-address 10.0.0.10');
    });
    
    test('should generate DNS and domain', () => {
      const specs: DHCPServerSpec[] = [{
        poolName: 'POOL1',
        network: '10.0.0.0',
        subnetMask: '255.255.255.0',
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        domainName: 'example.com'
      }];
      
      const config = ServicesGenerator.generateDHCP(specs);
      
      expect(config).toContain(' dns-server 8.8.8.8 8.8.4.4');
      expect(config).toContain(' domain-name example.com');
    });
  });
  
  describe('generateNTP', () => {
    test('should generate NTP servers', () => {
      const spec: NTPSpec = {
        servers: [
          { ip: '0.pool.ntp.org', prefer: true },
          { ip: '1.pool.ntp.org' }
        ]
      };
      
      const config = ServicesGenerator.generateNTP(spec);
      
      expect(config).toContain('ntp server 0.pool.ntp.org prefer');
      expect(config).toContain('ntp server 1.pool.ntp.org');
    });
    
    test('should generate NTP authentication', () => {
      const spec: NTPSpec = {
        servers: [{ ip: '10.0.0.1' }],
        authentication: {
          enabled: true,
          keys: [{ id: 1, md5: 'secret' }],
          trustedKeys: [1]
        }
      };
      
      const config = ServicesGenerator.generateNTP(spec);
      
      expect(config).toContain('ntp authenticate');
      expect(config).toContain('ntp authentication-key 1 md5 secret');
      expect(config).toContain('ntp trusted-key 1');
    });
    
    test('should generate NTP master', () => {
      const spec: NTPSpec = {
        servers: [],
        master: true,
        stratum: 5
      };
      
      const config = ServicesGenerator.generateNTP(spec);
      
      expect(config).toContain('ntp master 5');
    });
  });
  
  describe('validateDHCP', () => {
    test('should require pool name', () => {
      const spec: DHCPServerSpec = {
        poolName: '',
        network: '192.168.1.0',
        subnetMask: '255.255.255.0'
      };
      
      const result = ServicesGenerator.validateDHCP(spec);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
    });
    
    test('should warn about missing default gateway', () => {
      const spec: DHCPServerSpec = {
        poolName: 'POOL1',
        network: '192.168.1.0',
        subnetMask: '255.255.255.0'
      };
      
      const result = ServicesGenerator.validateDHCP(spec);
      
      expect(result.warnings.some(w => w.includes('default gateway'))).toBe(true);
    });
  });
});
