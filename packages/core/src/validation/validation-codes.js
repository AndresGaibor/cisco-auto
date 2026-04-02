/**
 * Validation Error Codes - Centralized error code definitions
 * Used by all validators for consistent error reporting
 */
export const ValidationCodes = {
    // Interfaces
    INVALID_INTERFACE_NAME: 'IFACE_INVALID_NAME',
    INTERFACE_NOT_ON_DEVICE: 'IFACE_NOT_ON_DEVICE',
    DUPLICATE_INTERFACE: 'IFACE_DUPLICATE',
    INVALID_IP_FORMAT: 'IFACE_INVALID_IP',
    INVALID_SUBNET_MASK: 'IFACE_INVALID_MASK',
    INVALID_VLAN_RANGE: 'IFACE_INVALID_VLAN',
    NATIVE_VLAN_MISMATCH: 'IFACE_NATIVE_VLAN_MISMATCH',
    // VLANs
    VLAN_INVALID_ID: 'VLAN_INVALID_ID',
    VLAN_DUPLICATE: 'VLAN_DUPLICATE',
    VLAN_INVALID_NAME: 'VLAN_INVALID_NAME',
    VLAN_RANGE_EXCEEDED: 'VLAN_RANGE_EXCEEDED',
    // Routing
    ROUTING_INVALID_PROTOCOL: 'ROUTE_INVALID_PROTOCOL',
    ROUTING_INVALID_NETWORK: 'ROUTE_INVALID_NETWORK',
    ROUTING_INVALID_METRIC: 'ROUTE_INVALID_METRIC',
    ROUTING_INVALID_PRIORITY: 'ROUTE_INVALID_PRIORITY',
    OSPF_INVALID_PID: 'OSPF_INVALID_PID',
    OSPF_INVALID_AREA: 'OSPF_INVALID_AREA',
    OSPF_INVALID_COST: 'OSPF_INVALID_COST',
    EIGRP_INVALID_AS: 'EIGRP_INVALID_AS',
    BGP_INVALID_ASN: 'BGP_INVALID_ASN',
    BGP_INVALID_ROUTEID: 'BGP_INVALID_ROUTEID',
    // Device
    DEVICE_NOT_FOUND: 'DEV_NOT_FOUND',
    DEVICE_DUPLICATE: 'DEV_DUPLICATE',
    DEVICE_INVALID_TYPE: 'DEV_INVALID_TYPE',
    DEVICE_NOT_SUPPORTED: 'DEV_NOT_SUPPORTED',
    DEVICE_MISSING_FEATURES: 'DEV_MISSING_FEATURES',
    // Network
    NETWORK_INVALID_SUBNET: 'NET_INVALID_SUBNET',
    NETWORK_OVERLAP: 'NET_OVERLAP',
    NETWORK_TOO_SMALL: 'NET_TOO_SMALL',
    NETWORK_HOST_CONFLICT: 'NET_HOST_CONFLICT',
    // Links
    LINK_DUPLICATE: 'LINK_DUPLICATE',
    LINK_ENDPOINTS_INVALID: 'LINK_ENDPOINTS_INVALID',
    LINK_SPEED_MISMATCH: 'LINK_SPEED_MISMATCH',
    LINK_NOT_FOUND: 'LINK_NOT_FOUND',
    // General
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
};
/**
 * Get error message template for code
 */
export function getErrorMessage(code) {
    const messages = {
        [ValidationCodes.INVALID_INTERFACE_NAME]: 'Invalid interface name format',
        [ValidationCodes.INTERFACE_NOT_ON_DEVICE]: 'Interface not found on device',
        [ValidationCodes.DUPLICATE_INTERFACE]: 'Duplicate interface configuration',
        [ValidationCodes.INVALID_IP_FORMAT]: 'Invalid IP address format',
        [ValidationCodes.INVALID_SUBNET_MASK]: 'Invalid subnet mask',
        [ValidationCodes.INVALID_VLAN_RANGE]: 'VLAN ID out of valid range (1-4094)',
        [ValidationCodes.NATIVE_VLAN_MISMATCH]: 'Native VLAN mismatch on trunk',
        [ValidationCodes.VLAN_INVALID_ID]: 'Invalid VLAN ID',
        [ValidationCodes.VLAN_DUPLICATE]: 'VLAN already exists',
        [ValidationCodes.VLAN_INVALID_NAME]: 'Invalid VLAN name',
        [ValidationCodes.VLAN_RANGE_EXCEEDED]: 'Exceeds maximum number of VLANs',
        [ValidationCodes.DEVICE_NOT_FOUND]: 'Device not found in topology',
        [ValidationCodes.DEVICE_DUPLICATE]: 'Duplicate device',
        [ValidationCodes.DEVICE_INVALID_TYPE]: 'Invalid device type',
        [ValidationCodes.DEVICE_NOT_SUPPORTED]: 'Device type not supported',
        [ValidationCodes.DEVICE_MISSING_FEATURES]: 'Device missing required features',
    };
    return messages[code] ?? 'Unknown validation error';
}
//# sourceMappingURL=validation-codes.js.map