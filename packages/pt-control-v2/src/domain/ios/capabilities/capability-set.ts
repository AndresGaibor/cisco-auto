// ============================================================================
// CapabilitySet - Rich capability model for IOS devices
// ============================================================================

import { IOSFamily } from "./device-capabilities.js";

/**
 * Switchport/Layer 2 features
 */
export interface SwitchportFeature {
  /** Supports switchport trunk encapsulation command (dot1q, isl) */
  trunkEncapsulation: boolean;
  /** Supports dot1q encapsulation on trunks */
  dot1q: boolean;
  /** Supports ISL encapsulation on trunks (legacy) */
  isl: boolean;
  /** Supports switchport mode trunk */
  trunkMode: boolean;
  /** Supports switchport mode access */
  accessMode: boolean;
  /** Supports VTP (VLAN Trunking Protocol) */
  vtp: boolean;
  /** Supports PortFast */
  portfast: boolean;
  /** Supports BPDU Guard */
  bpduGuard: boolean;
  /** Supports EtherChannel/PAgP/LACP */
  etherChannel: boolean;
}

/**
 * Routing/Layer 3 features
 */
export interface RoutingFeature {
  /** Enables IP routing globally */
  ipRouting: boolean;
  /** Router subinterfaces (not SVI) - for routers */
  subinterfaces: boolean;
  /** L3 switch SVIs (inter-VLAN routing) */
  svi: boolean;
  /** DHCP relay (ip helper-address) */
  dhcpRelay: boolean;
  /** NAT (primarily routers, limited on L3 switches) */
  nat: boolean;
  /** Standard and extended ACLs */
  acl: boolean;
  /** Policy-based routing */
  pbr: boolean;
  /** VRF support */
  vrf: boolean;
}

/**
 * Switching features
 */
export interface SwitchingFeature {
  /** VLAN support */
  vlan: boolean;
  /** Maximum number of VLANs supported */
  maxVlanCount: number;
  /** Spanning Tree Protocol */
  spanningTree: boolean;
  /** Portfast BPDU Guard */
  bpduGuard: boolean;
  /** EtherChannel */
  etherChannel: boolean;
  /** Storm control */
  stormControl: boolean;
  /** Port security */
  portSecurity: boolean;
}

/**
 * Security features
 */
export interface SecurityFeature {
  /** Standard ACLs */
  aclStandard: boolean;
  /** Extended ACLs */
  aclExtended: boolean;
  /** Reflexive ACLs */
  aclReflexive: boolean;
  /** Turbo ACL (some platforms) */
  aclTurbo: boolean;
  /** IPsec */
  ipsec: boolean;
  /** SSL VPN */
  sslVpn: boolean;
  /** 802.1X port authentication */
  dot1x: boolean;
}

/**
 * Management features
 */
export interface ManagementFeature {
  /** Telnet access */
  telnet: boolean;
  /** SSH access */
  ssh: boolean;
  /** Console access */
  console: boolean;
  /** HTTP/HTTPS management */
  http: boolean;
  /** SNMP */
  snmp: boolean;
  /** Syslog */
  syslog: boolean;
  /** NetFlow */
  netflow: boolean;
  /** RSPAN (Remote SPAN) */
  rspan: boolean;
}

/**
 * Rich capability model organized by feature areas.
 * Provides a more expressive and typed interface than flat boolean flags.
 */
export class CapabilitySet {
  public readonly model: string;
  public readonly family: IOSFamily;
  public readonly switchport: SwitchportFeature;
  public readonly routing: RoutingFeature;
  public readonly switching: SwitchingFeature;
  public readonly security: SecurityFeature;
  public readonly management: ManagementFeature;

  constructor(
    model: string,
    family: IOSFamily,
    switchport: SwitchportFeature,
    routing: RoutingFeature,
    switching: SwitchingFeature,
    security: SecurityFeature,
    management: ManagementFeature,
  ) {
    this.model = model;
    this.family = family;
    this.switchport = switchport;
    this.routing = routing;
    this.switching = switching;
    this.security = security;
    this.management = management;
  }

  /**
   * Get a human-readable family name
   */
  get familyName(): string {
    switch (this.family) {
      case IOSFamily.ROUTER: return "Router";
      case IOSFamily.SWITCH_L2: return "L2 Switch";
      case IOSFamily.SWITCH_L3: return "L3 Switch";
      default: return "Unknown";
    }
  }

  /**
   * Check if this device can act as a trunk port
   */
  get canBeTrunk(): boolean {
    return this.switchport.trunkMode && (this.switchport.trunkEncapsulation || this.switchport.dot1q);
  }

  /**
   * Check if this device supports inter-VLAN routing
   */
  get supportsInterVlanRouting(): boolean {
    return this.routing.ipRouting && (this.routing.svi || this.routing.subinterfaces);
  }

  /**
   * Check if this device can perform DHCP relay
   */
  get supportsDhcpHelper(): boolean {
    return this.routing.dhcpRelay;
  }

  /**
   * Check if this is a layer 2 only device
   */
  get isL2Only(): boolean {
    return this.family === IOSFamily.SWITCH_L2;
  }

  /**
   * Check if this is a layer 3 capable device
   */
  get isL3Capable(): boolean {
    return this.family === IOSFamily.ROUTER || this.family === IOSFamily.SWITCH_L3;
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  static router(model: string): CapabilitySet {
    return new CapabilitySet(
      model,
      IOSFamily.ROUTER,
      {
        trunkEncapsulation: true,
        dot1q: true,
        isl: true,
        trunkMode: true,
        accessMode: true,
        vtp: false,
        portfast: true,
        bpduGuard: true,
        etherChannel: true,
      },
      {
        ipRouting: true,
        subinterfaces: true,
        svi: false,
        dhcpRelay: true,
        nat: true,
        acl: true,
        pbr: true,
        vrf: true,
      },
      {
        vlan: false,
        maxVlanCount: 0,
        spanningTree: false,
        bpduGuard: false,
        etherChannel: false,
        stormControl: false,
        portSecurity: false,
      },
      {
        aclStandard: true,
        aclExtended: true,
        aclReflexive: true,
        aclTurbo: false,
        ipsec: true,
        sslVpn: true,
        dot1x: true,
      },
      {
        telnet: true,
        ssh: true,
        console: true,
        http: true,
        snmp: true,
        syslog: true,
        netflow: true,
        rspan: false,
      }
    );
  }

  static l2Switch(model: string): CapabilitySet {
    return new CapabilitySet(
      model,
      IOSFamily.SWITCH_L2,
      {
        trunkEncapsulation: false,
        dot1q: true,
        isl: false,
        trunkMode: true,
        accessMode: true,
        vtp: true,
        portfast: true,
        bpduGuard: true,
        etherChannel: true,
      },
      {
        ipRouting: false,
        subinterfaces: false,
        svi: false,
        dhcpRelay: false,
        nat: false,
        acl: true,
        pbr: false,
        vrf: false,
      },
      {
        vlan: true,
        maxVlanCount: 255,
        spanningTree: true,
        bpduGuard: true,
        etherChannel: true,
        stormControl: true,
        portSecurity: true,
      },
      {
        aclStandard: true,
        aclExtended: true,
        aclReflexive: false,
        aclTurbo: false,
        ipsec: false,
        sslVpn: false,
        dot1x: true,
      },
      {
        telnet: true,
        ssh: true,
        console: true,
        http: true,
        snmp: true,
        syslog: true,
        netflow: false,
        rspan: true,
      }
    );
  }

  static l3Switch(model: string): CapabilitySet {
    return new CapabilitySet(
      model,
      IOSFamily.SWITCH_L3,
      {
        trunkEncapsulation: true,
        dot1q: true,
        isl: false,
        trunkMode: true,
        accessMode: true,
        vtp: true,
        portfast: true,
        bpduGuard: true,
        etherChannel: true,
      },
      {
        ipRouting: true,
        subinterfaces: false,
        svi: true,
        dhcpRelay: true,
        nat: false,
        acl: true,
        pbr: true,
        vrf: true,
      },
      {
        vlan: true,
        maxVlanCount: 255,
        spanningTree: true,
        bpduGuard: true,
        etherChannel: true,
        stormControl: true,
        portSecurity: true,
      },
      {
        aclStandard: true,
        aclExtended: true,
        aclReflexive: false,
        aclTurbo: false,
        ipsec: true,
        sslVpn: false,
        dot1x: true,
      },
      {
        telnet: true,
        ssh: true,
        console: true,
        http: true,
        snmp: true,
        syslog: true,
        netflow: true,
        rspan: true,
      }
    );
  }

  static unknown(model: string): CapabilitySet {
    return new CapabilitySet(
      model,
      IOSFamily.UNKNOWN,
      {
        trunkEncapsulation: false,
        dot1q: false,
        isl: false,
        trunkMode: false,
        accessMode: false,
        vtp: false,
        portfast: false,
        bpduGuard: false,
        etherChannel: false,
      },
      {
        ipRouting: false,
        subinterfaces: false,
        svi: false,
        dhcpRelay: false,
        nat: false,
        acl: false,
        pbr: false,
        vrf: false,
      },
      {
        vlan: false,
        maxVlanCount: 0,
        spanningTree: false,
        bpduGuard: false,
        etherChannel: false,
        stormControl: false,
        portSecurity: false,
      },
      {
        aclStandard: false,
        aclExtended: false,
        aclReflexive: false,
        aclTurbo: false,
        ipsec: false,
        sslVpn: false,
        dot1x: false,
      },
      {
        telnet: false,
        ssh: false,
        console: false,
        http: false,
        snmp: false,
        syslog: false,
        netflow: false,
        rspan: false,
      }
    );
  }
}
