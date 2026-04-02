import type { DeviceSpec, VLANSpec, VTPSpec, InterfaceSpec } from '../canonical/device.spec.ts';
export declare class VlanGenerator {
    /**
     * Generate VLAN commands from simple number array
     * @param vlanIds - Array of VLAN IDs (1-4094)
     * @param namePrefix - Optional prefix for VLAN names (e.g., "ADMIN" creates "ADMIN10", "ADMIN20")
     * @returns Array of IOS commands
     */
    static generateVLANsFromIds(vlanIds: number[], namePrefix?: string): string[];
    /**
     * Generate VLAN commands
     * Note: In canonical model, SVI IPs are on interfaces (name: 'Vlan<id>'), not on VLAN spec
     */
    static generateVLANs(vlans: VLANSpec[], vtp?: VTPSpec): string[];
    /**
     * Generate SVI (Switch Virtual Interface) configurations
     * In canonical model, SVIs are interfaces of type 'vlan' with IPs
     */
    static generateSVIs(interfaces: InterfaceSpec[]): string[];
    static generateVTP(vtp: VTPSpec): string[];
    static generateInterfaces(device: DeviceSpec): string[];
}
//# sourceMappingURL=vlan-generator.d.ts.map