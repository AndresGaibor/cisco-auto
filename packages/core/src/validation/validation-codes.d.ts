/**
 * Validation Error Codes - Centralized error code definitions
 * Used by all validators for consistent error reporting
 */
export declare const ValidationCodes: {
    readonly INVALID_INTERFACE_NAME: "IFACE_INVALID_NAME";
    readonly INTERFACE_NOT_ON_DEVICE: "IFACE_NOT_ON_DEVICE";
    readonly DUPLICATE_INTERFACE: "IFACE_DUPLICATE";
    readonly INVALID_IP_FORMAT: "IFACE_INVALID_IP";
    readonly INVALID_SUBNET_MASK: "IFACE_INVALID_MASK";
    readonly INVALID_VLAN_RANGE: "IFACE_INVALID_VLAN";
    readonly NATIVE_VLAN_MISMATCH: "IFACE_NATIVE_VLAN_MISMATCH";
    readonly VLAN_INVALID_ID: "VLAN_INVALID_ID";
    readonly VLAN_DUPLICATE: "VLAN_DUPLICATE";
    readonly VLAN_INVALID_NAME: "VLAN_INVALID_NAME";
    readonly VLAN_RANGE_EXCEEDED: "VLAN_RANGE_EXCEEDED";
    readonly ROUTING_INVALID_PROTOCOL: "ROUTE_INVALID_PROTOCOL";
    readonly ROUTING_INVALID_NETWORK: "ROUTE_INVALID_NETWORK";
    readonly ROUTING_INVALID_METRIC: "ROUTE_INVALID_METRIC";
    readonly ROUTING_INVALID_PRIORITY: "ROUTE_INVALID_PRIORITY";
    readonly OSPF_INVALID_PID: "OSPF_INVALID_PID";
    readonly OSPF_INVALID_AREA: "OSPF_INVALID_AREA";
    readonly OSPF_INVALID_COST: "OSPF_INVALID_COST";
    readonly EIGRP_INVALID_AS: "EIGRP_INVALID_AS";
    readonly BGP_INVALID_ASN: "BGP_INVALID_ASN";
    readonly BGP_INVALID_ROUTEID: "BGP_INVALID_ROUTEID";
    readonly DEVICE_NOT_FOUND: "DEV_NOT_FOUND";
    readonly DEVICE_DUPLICATE: "DEV_DUPLICATE";
    readonly DEVICE_INVALID_TYPE: "DEV_INVALID_TYPE";
    readonly DEVICE_NOT_SUPPORTED: "DEV_NOT_SUPPORTED";
    readonly DEVICE_MISSING_FEATURES: "DEV_MISSING_FEATURES";
    readonly NETWORK_INVALID_SUBNET: "NET_INVALID_SUBNET";
    readonly NETWORK_OVERLAP: "NET_OVERLAP";
    readonly NETWORK_TOO_SMALL: "NET_TOO_SMALL";
    readonly NETWORK_HOST_CONFLICT: "NET_HOST_CONFLICT";
    readonly LINK_DUPLICATE: "LINK_DUPLICATE";
    readonly LINK_ENDPOINTS_INVALID: "LINK_ENDPOINTS_INVALID";
    readonly LINK_SPEED_MISMATCH: "LINK_SPEED_MISMATCH";
    readonly LINK_NOT_FOUND: "LINK_NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
};
export type ValidationCode = typeof ValidationCodes[keyof typeof ValidationCodes];
/**
 * Get error message template for code
 */
export declare function getErrorMessage(code: ValidationCode): string;
//# sourceMappingURL=validation-codes.d.ts.map