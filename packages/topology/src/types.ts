/**
 * TOPOLOGY QUERY TYPES
 * Types for querying topology from PT control v2
 */

// ============================================================================
// Query Types
// ============================================================================

/**
 * Type of topology query to perform
 */
export type TopologyQueryType = 'device' | 'link' | 'full';

/**
 * Query parameters for topology lookups
 */
export interface TopologyQuery {
  /** Type of query: device, link, or full topology */
  type: TopologyQueryType;
  /** Device name to query (for device queries) */
  name?: string;
  /** Device name for link queries (returns links connected to this device) */
  device?: string;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Device information returned from topology queries
 */
export interface DeviceInfo {
  /** Device name/hostname */
  name: string;
  /** Device type (router, switch, pc, etc.) */
  type?: string;
  /** Management or primary IP address */
  ip?: string;
  /** List of port names */
  ports?: string[];
}

/**
 * Link/connection information returned from topology queries
 */
export interface LinkInfo {
  /** Source device name */
  from: string;
  /** Destination device name */
  to: string;
  /** Source port name */
  fromPort?: string;
  /** Destination port name */
  toPort?: string;
  /** Cable type (straight, cross, fiber, etc.) */
  cableType?: string;
}

/**
 * Result from a topology query
 */
export interface TopologyResult {
  /** Whether the query found matching data */
  found: boolean;
  /** Single device info (for device queries) */
  device?: DeviceInfo;
  /** Links matching the query (for link queries) */
  links?: LinkInfo[];
  /** All devices (for full topology queries) */
  devices?: DeviceInfo[];
  /** Error message if query failed */
  error?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Options for topology query execution
 */
export interface TopologyQueryOptions {
  /** Include IP addresses in results */
  includeIPs?: boolean;
  /** Include port details in results */
  includePorts?: boolean;
  /** Include cable type information */
  includeCableTypes?: boolean;
  /** Filter by device type */
  deviceType?: string;
}

/**
 * Aggregated topology statistics
 */
export interface TopologyStats {
  /** Total number of devices */
  totalDevices: number;
  /** Total number of links */
  totalLinks: number;
  /** Device count by type */
  devicesByType: Record<string, number>;
  /** Link count by cable type */
  linksByType: Record<string, number>;
}
