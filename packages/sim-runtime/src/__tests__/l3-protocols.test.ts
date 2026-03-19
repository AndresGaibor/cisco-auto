/**
 * Tests para protocolos de Capa 3
 */

import { describe, test, expect } from 'bun:test';

// ARP imports
import {
  ARPCache,
  createARPRequest,
  createARPReply,
  createGratuitousARP,
  serializeARP,
  deserializeARP,
  isGratuitousARP,
  ARP_DEFAULT_TIMEOUT
} from '../protocols/arp';

// IPv4 imports
import {
  createIPv4Packet,
  deserializeIPv4,
  serializeIPv4,
  ipToNumber,
  numberToIP,
  cidrToMask,
  maskToCidr,
  getNetworkAddress,
  getBroadcastAddress,
  isValidIP,
  isPrivateIP,
  isLoopbackIP,
  isLinkLocalIP,
  isMulticastIP,
  isIPInNetwork,
  getHostRange,
  decrementTTL,
  verifyChecksum,
  IPProtocol
} from '../protocols/ipv4';

// ICMP imports
import {
  ICMPType,
  createEchoRequest,
  createEchoReply,
  createDestinationUnreachable,
  createTimeExceeded,
  serializeICMP,
  deserializeICMP,
  verifyICMPChecksum,
  isICMPEcho,
  DestinationUnreachableCode,
  TimeExceededCode
} from '../protocols/icmp';

// Routing imports
import {
  RoutingTable,
  generateConnectedRoutes,
  createStaticRoute,
  validateRoute,
  ADMINISTRATIVE_DISTANCES
} from '../protocols/routing';

// =============================================================================
// ARP TESTS
// =============================================================================

describe('ARP Protocol', () => {
  test('creates ARP request correctly', () => {
    const request = createARPRequest('aa:bb:cc:dd:ee:ff', '192.168.1.1', '192.168.1.2');
    
    expect(request.htype).toBe(1);
    expect(request.ptype).toBe(0x0800);
    expect(request.hlen).toBe(6);
    expect(request.plen).toBe(4);
    expect(request.operation).toBe(1);
    expect(request.senderHWA).toBe('aa:bb:cc:dd:ee:ff');
    expect(request.senderPA).toBe('192.168.1.1');
    expect(request.targetPA).toBe('192.168.1.2');
    expect(request.targetHWA).toBe('00:00:00:00:00:00');
  });

  test('creates ARP reply correctly', () => {
    const reply = createARPReply(
      'aa:bb:cc:dd:ee:ff',
      '192.168.1.2',
      '11:22:33:44:55:66',
      '192.168.1.1'
    );
    
    expect(reply.operation).toBe(2);
    expect(reply.senderHWA).toBe('aa:bb:cc:dd:ee:ff');
    expect(reply.senderPA).toBe('192.168.1.2');
    expect(reply.targetHWA).toBe('11:22:33:44:55:66');
    expect(reply.targetPA).toBe('192.168.1.1');
  });

  test('creates gratuitous ARP correctly', () => {
    const gratuitous = createGratuitousARP('aa:bb:cc:dd:ee:ff', '192.168.1.1');
    
    expect(isGratuitousARP(gratuitous)).toBe(true);
    expect(gratuitous.senderPA).toBe(gratuitous.targetPA);
  });

  test('serializes and deserializes ARP packet', () => {
    const request = createARPRequest('aa:bb:cc:dd:ee:ff', '192.168.1.1', '192.168.1.2');
    const serialized = serializeARP(request);
    
    expect(serialized.length).toBe(28);
    
    const deserialized = deserializeARP(serialized);
    
    expect(deserialized).not.toBeNull();
    expect(deserialized!.operation).toBe(1);
    expect(deserialized!.senderHWA).toBe('aa:bb:cc:dd:ee:ff');
    expect(deserialized!.senderPA).toBe('192.168.1.1');
    expect(deserialized!.targetPA).toBe('192.168.1.2');
  });

  test('ARP Cache - basic operations', () => {
    const cache = new ARPCache();
    cache.setTime(0);
    
    // Add entry
    cache.set('192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'eth0');
    
    expect(cache.hasValidEntry('192.168.1.1')).toBe(true);
    expect(cache.getMAC('192.168.1.1')).toBe('aa:bb:cc:dd:ee:ff');
    
    // Delete entry
    cache.delete('192.168.1.1');
    expect(cache.hasValidEntry('192.168.1.1')).toBe(false);
  });

  test('ARP Cache - static entries never expire', () => {
    const cache = new ARPCache(10); // 10 second timeout
    cache.setTime(0);
    
    cache.setStatic('192.168.1.1', 'aa:bb:cc:dd:ee:ff', 'eth0');
    
    // Advance time beyond normal timeout
    cache.setTime(20000);
    
    expect(cache.hasValidEntry('192.168.1.1')).toBe(true);
  });

  test('ARP Cache - incomplete entries', () => {
    const cache = new ARPCache();
    cache.setTime(0);
    
    const entry = cache.markIncomplete('192.168.1.1', 'eth0');
    
    expect(entry.state).toBe('incomplete');
    expect(entry.attempts).toBe(1);
    expect(cache.getMAC('192.168.1.1')).toBeUndefined();
  });
});

// =============================================================================
// IPv4 TESTS
// =============================================================================

describe('IPv4 Protocol', () => {
  test('IP address conversions', () => {
    expect(ipToNumber('192.168.1.1')).toBe(3232235777);
    expect(numberToIP(3232235777)).toBe('192.168.1.1');
    expect(numberToIP(0)).toBe('0.0.0.0');
    expect(numberToIP(0xFFFFFFFF)).toBe('255.255.255.255');
  });

  test('CIDR to mask conversion', () => {
    expect(cidrToMask(24)).toBe('255.255.255.0');
    expect(cidrToMask(16)).toBe('255.255.0.0');
    expect(cidrToMask(8)).toBe('255.0.0.0');
    expect(cidrToMask(32)).toBe('255.255.255.255');
    expect(cidrToMask(0)).toBe('0.0.0.0');
  });

  test('Mask to CIDR conversion', () => {
    expect(maskToCidr('255.255.255.0')).toBe(24);
    expect(maskToCidr('255.255.0.0')).toBe(16);
    expect(maskToCidr('255.0.0.0')).toBe(8);
    expect(maskToCidr('255.255.255.255')).toBe(32);
    expect(maskToCidr('0.0.0.0')).toBe(0);
  });

  test('Network address calculation', () => {
    expect(getNetworkAddress('192.168.1.100', '255.255.255.0')).toBe('192.168.1.0');
    expect(getNetworkAddress('10.0.0.1', '255.0.0.0')).toBe('10.0.0.0');
    expect(getNetworkAddress('172.16.5.10', '255.255.0.0')).toBe('172.16.0.0');
  });

  test('Broadcast address calculation', () => {
    expect(getBroadcastAddress('192.168.1.0', '255.255.255.0')).toBe('192.168.1.255');
    expect(getBroadcastAddress('10.0.0.0', '255.0.0.0')).toBe('10.255.255.255');
  });

  test('IP validation', () => {
    expect(isValidIP('192.168.1.1')).toBe(true);
    expect(isValidIP('0.0.0.0')).toBe(true);
    expect(isValidIP('255.255.255.255')).toBe(true);
    expect(isValidIP('256.1.1.1')).toBe(false);
    expect(isValidIP('192.168.1')).toBe(false);
    expect(isValidIP('192.168.1.1.1')).toBe(false);
    expect(isValidIP('abc.def.ghi.jkl')).toBe(false);
  });

  test('IP classification - private', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('172.15.0.1')).toBe(false);
    expect(isPrivateIP('172.32.0.1')).toBe(false);
  });

  test('IP classification - special', () => {
    expect(isLoopbackIP('127.0.0.1')).toBe(true);
    expect(isLoopbackIP('127.255.255.255')).toBe(true);
    expect(isLoopbackIP('128.0.0.1')).toBe(false);
    
    expect(isLinkLocalIP('169.254.1.1')).toBe(true);
    expect(isLinkLocalIP('169.254.255.255')).toBe(true);
    expect(isLinkLocalIP('169.255.1.1')).toBe(false);
    
    expect(isMulticastIP('224.0.0.1')).toBe(true);
    expect(isMulticastIP('239.255.255.255')).toBe(true);
    expect(isMulticastIP('240.0.0.1')).toBe(false);
  });

  test('IP in network check', () => {
    expect(isIPInNetwork('192.168.1.100', '192.168.1.0', '255.255.255.0')).toBe(true);
    expect(isIPInNetwork('192.168.2.100', '192.168.1.0', '255.255.255.0')).toBe(false);
    expect(isIPInNetwork('10.0.5.100', '10.0.0.0', '255.0.0.0')).toBe(true);
  });

  test('Host range calculation', () => {
    const range = getHostRange('192.168.1.0', '255.255.255.0');
    
    expect(range.first).toBe('192.168.1.1');
    expect(range.last).toBe('192.168.1.254');
    expect(range.total).toBe(254);
  });

  test('Create IPv4 packet', () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const packet = createIPv4Packet('192.168.1.1', '192.168.1.2', IPProtocol.UDP, payload);
    
    expect(packet.version).toBe(4);
    expect(packet.ttl).toBe(64);
    expect(packet.protocol).toBe(IPProtocol.UDP);
    expect(packet.srcIP).toBe('192.168.1.1');
    expect(packet.dstIP).toBe('192.168.1.2');
    expect(packet.flags.dontFragment).toBe(true);
    expect(packet.payload).toEqual(payload);
  });

  test('IPv4 packet serialization/deserialization', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const packet = createIPv4Packet('10.0.0.1', '10.0.0.2', IPProtocol.TCP, payload);
    const serialized = serializeIPv4(packet);
    
    expect(serialized.length).toBe(20 + payload.length);
    expect(verifyChecksum(packet)).toBe(true);
    
    const deserialized = deserializeIPv4(serialized);
    
    expect(deserialized).not.toBeNull();
    expect(deserialized!.srcIP).toBe('10.0.0.1');
    expect(deserialized!.dstIP).toBe('10.0.0.2');
    expect(deserialized!.protocol).toBe(IPProtocol.TCP);
    expect(deserialized!.ttl).toBe(64);
  });

  test('TTL decrement', () => {
    const payload = new Uint8Array([1, 2, 3]);
    const packet = createIPv4Packet('1.1.1.1', '2.2.2.2', IPProtocol.ICMP, payload, { ttl: 2 });
    
    expect(decrementTTL(packet)).toBe(true);
    expect(packet.ttl).toBe(1);
    
    expect(decrementTTL(packet)).toBe(false);
    expect(packet.ttl).toBe(0);
  });
});

// =============================================================================
// ICMP TESTS
// =============================================================================

describe('ICMP Protocol', () => {
  test('Create Echo Request (ping)', () => {
    const request = createEchoRequest(1234, 1, new Uint8Array(56));
    
    expect(request.type).toBe(ICMPType.ECHO_REQUEST);
    expect(request.code).toBe(0);
    expect(request.identifier).toBe(1234);
    expect(request.sequenceNumber).toBe(1);
    expect(request.data.length).toBe(56);
    expect(verifyICMPChecksum(request)).toBe(true);
  });

  test('Create Echo Reply', () => {
    const reply = createEchoReply(1234, 1, new Uint8Array(56));
    
    expect(reply.type).toBe(ICMPType.ECHO_REPLY);
    expect(reply.code).toBe(0);
    expect(reply.identifier).toBe(1234);
    expect(reply.sequenceNumber).toBe(1);
    expect(verifyICMPChecksum(reply)).toBe(true);
  });

  test('ICMP Echo serialization/deserialization', () => {
    const request = createEchoRequest(0xABCD, 0x0001, new Uint8Array(32));
    const serialized = serializeICMP(request);
    
    expect(serialized.length).toBe(8 + 32);
    
    const deserialized = deserializeICMP(serialized);
    
    expect(deserialized).not.toBeNull();
    expect(isICMPEcho(deserialized!)).toBe(true);
    
    const echo = deserialized as any;
    expect(echo.type).toBe(ICMPType.ECHO_REQUEST);
    expect(echo.identifier).toBe(0xABCD);
    expect(echo.sequenceNumber).toBe(0x0001);
    expect(echo.data.length).toBe(32);
  });

  test('Create Destination Unreachable', () => {
    const originalPacket = createIPv4Packet(
      '1.1.1.1',
      '2.2.2.2',
      IPProtocol.UDP,
      new Uint8Array(8)
    );
    
    const destUnreach = createDestinationUnreachable(
      DestinationUnreachableCode.HOST_UNREACHABLE,
      originalPacket
    );
    
    expect(destUnreach.type).toBe(ICMPType.DESTINATION_UNREACHABLE);
    expect(destUnreach.code).toBe(DestinationUnreachableCode.HOST_UNREACHABLE);
    expect(destUnreach.originalIPHeader.length).toBe(20);
    expect(destUnreach.originalData.length).toBe(8);
  });

  test('Create Time Exceeded', () => {
    const originalPacket = createIPv4Packet(
      '1.1.1.1',
      '2.2.2.2',
      IPProtocol.UDP,
      new Uint8Array(8)
    );
    
    const timeExceeded = createTimeExceeded(
      TimeExceededCode.TTL_EXCEEDED,
      originalPacket
    );
    
    expect(timeExceeded.type).toBe(ICMPType.TIME_EXCEEDED);
    expect(timeExceeded.code).toBe(TimeExceededCode.TTL_EXCEEDED);
  });
});

// =============================================================================
// ROUTING TESTS
// =============================================================================

describe('Routing Table', () => {
  test('Add and lookup routes', () => {
    const table = new RoutingTable();
    
    table.addConnectedRoute('192.168.1.1', '255.255.255.0', 'eth0');
    table.addStaticRoute('0.0.0.0', '0.0.0.0', '192.168.1.254', 'eth0');
    
    // Lookup local network
    const result1 = table.lookup('192.168.1.100');
    expect(result1.route).not.toBeNull();
    expect(result1.route?.protocol).toBe('connected');
    expect(result1.route?.interface).toBe('eth0');
    expect(result1.isConnected).toBe(true);
    
    // Lookup external (default route)
    const result2 = table.lookup('8.8.8.8');
    expect(result2.route).not.toBeNull();
    expect(result2.route?.protocol).toBe('static');
    expect(result2.route?.nextHop).toBe('192.168.1.254');
    expect(result2.isDefaultRoute).toBe(true);
  });

  test('Longest prefix match', () => {
    const table = new RoutingTable();
    
    table.addStaticRoute('10.0.0.0', '255.0.0.0', '10.0.0.1', 'eth0');
    table.addStaticRoute('10.1.0.0', '255.255.0.0', '10.1.0.1', 'eth1');
    table.addStaticRoute('10.1.1.0', '255.255.255.0', '10.1.1.1', 'eth2');
    
    // Should match most specific route
    const result = table.lookup('10.1.1.50');
    
    expect(result.route).not.toBeNull();
    expect(result.route?.cidr).toBe(24);
    expect(result.route?.network).toBe('10.1.1.0');
    expect(result.route?.interface).toBe('eth2');
  });

  test('Administrative distance priority', () => {
    const table = new RoutingTable();
    
    // Add same route with different protocols
    table.addRoute({
      network: '192.168.2.0',
      mask: '255.255.255.0',
      nextHop: '10.0.0.1',
      interface: 'eth0',
      administrativeDistance: 110, // OSPF
      metric: 10,
      protocol: 'ospf'
    });
    
    table.addRoute({
      network: '192.168.2.0',
      mask: '255.255.255.0',
      nextHop: '10.0.0.2',
      interface: 'eth0',
      administrativeDistance: 1, // Static
      metric: 0,
      protocol: 'static'
    });
    
    // Static route should win due to lower AD
    const result = table.lookup('192.168.2.1');
    
    expect(result.route?.protocol).toBe('static');
    expect(result.route?.administrativeDistance).toBe(1);
  });

  test('Remove routes', () => {
    const table = new RoutingTable();
    
    table.addStaticRoute('10.0.0.0', '255.0.0.0', '10.0.0.1', 'eth0');
    table.addStaticRoute('192.168.0.0', '255.255.0.0', '192.168.0.1', 'eth1');
    
    expect(table.size).toBe(2);
    
    const removed = table.removeRoute('10.0.0.0', '255.0.0.0');
    expect(removed).toBe(1);
    expect(table.size).toBe(1);
    
    const result = table.lookup('10.0.0.100');
    expect(result.route).toBeNull();
  });

  test('Generate connected routes from interfaces', () => {
    const interfaces = [
      { name: 'eth0', ip: '192.168.1.1', subnetMask: '255.255.255.0', linkStatus: 'up' as const },
      { name: 'eth1', ip: '10.0.0.1', subnetMask: '255.0.0.0', linkStatus: 'up' as const },
      { name: 'eth2', ip: '172.16.1.1', subnetMask: '255.255.0.0', linkStatus: 'down' as const }
    ];
    
    const routes = generateConnectedRoutes(interfaces);
    
    // Only 2 routes for interfaces that are UP
    expect(routes.length).toBe(2);
    
    const eth0Route = routes.find(r => r.interface === 'eth0');
    expect(eth0Route?.network).toBe('192.168.1.0');
    expect(eth0Route?.protocol).toBe('connected');
    expect(eth0Route?.administrativeDistance).toBe(0);
  });

  test('Default route', () => {
    const table = new RoutingTable();
    
    table.addDefaultRoute('192.168.1.254', 'eth0');
    
    const result = table.lookup('8.8.8.8');
    
    expect(result.route).not.toBeNull();
    expect(result.route?.cidr).toBe(0);
    expect(result.route?.nextHop).toBe('192.168.1.254');
    expect(result.isDefaultRoute).toBe(true);
  });

  test('No route to destination', () => {
    const table = new RoutingTable();
    
    table.addConnectedRoute('192.168.1.1', '255.255.255.0', 'eth0');
    
    const result = table.lookup('10.0.0.1');
    
    expect(result.route).toBeNull();
    expect(result.interface).toBeNull();
    expect(result.nextHop).toBeNull();
  });

  test('Route validation', () => {
    const validRoute = {
      network: '192.168.1.0',
      mask: '255.255.255.0',
      nextHop: '192.168.1.254',
      interface: 'eth0'
    };
    
    const result1 = validateRoute(validRoute);
    expect(result1.valid).toBe(true);
    
    const invalidRoute = {
      network: '192.168.1.300', // Invalid IP
      mask: '255.255.255.0',
      interface: 'eth0'
    };
    
    const result2 = validateRoute(invalidRoute);
    expect(result2.valid).toBe(false);
    expect(result2.errors.length).toBeGreaterThan(0);
  });

  test('Administrative distances constants', () => {
    expect(ADMINISTRATIVE_DISTANCES.connected).toBe(0);
    expect(ADMINISTRATIVE_DISTANCES.static).toBe(1);
    expect(ADMINISTRATIVE_DISTANCES.ospf).toBe(110);
    expect(ADMINISTRATIVE_DISTANCES.rip).toBe(120);
    expect(ADMINISTRATIVE_DISTANCES.connected).toBeLessThan(ADMINISTRATIVE_DISTANCES.static);
  });

  test('Routing table string format', () => {
    const table = new RoutingTable();
    
    table.addConnectedRoute('192.168.1.1', '255.255.255.0', 'eth0');
    table.addStaticRoute('0.0.0.0', '0.0.0.0', '192.168.1.254', 'eth0');
    
    const str = table.toString();
    
    expect(str).toContain('C');
    expect(str).toContain('S');
    expect(str).toContain('192.168.1.0/24');
    expect(str).toContain('0.0.0.0/0');
    expect(str).toContain('directly connected');
    expect(str).toContain('via');
  });
});
