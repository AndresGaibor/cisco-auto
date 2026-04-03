/**
 * Port specification parser utilities
 * Handles parsing and validation of port specs like "R1:GigabitEthernet0/0"
 */

/**
 * Port specification parsed into device and port components
 */
export interface ParsedPortSpec {
  device: string;
  port: string;
}

/**
 * Validates port specification format
 * @param spec - Port specification (e.g., "R1:GigabitEthernet0/0")
 * @returns true if valid format
 */
export function isValidPortSpec(spec: string): boolean {
  if (!spec || typeof spec !== 'string') {
    return false;
  }
  const parts = spec.split(':');
  return parts.length >= 2 && parts[0]!.length > 0 && parts[1]!.length > 0;
}

/**
 * Parses port specification into device and port
 * @param spec - Port specification (e.g., "R1:GigabitEthernet0/0")
 * @returns Parsed device and port
 * @throws Error if spec is invalid
 */
export function parsePortSpec(spec: string): ParsedPortSpec {
  if (!isValidPortSpec(spec)) {
    throw new Error(`Invalid port specification format. Expected: device:port, got: ${spec}`);
  }

  const [device, ...portParts] = spec.split(':');
  return {
    device: device!,
    port: portParts.join(':'),
  };
}

/**
 * Formats device and port back into port spec
 * @param device - Device name
 * @param port - Port name
 * @returns Port specification
 */
export function formatPortSpec(device: string, port: string): string {
  return `${device}:${port}`;
}

/**
 * Validates that two port specs are different (prevents same port on both ends)
 * @param spec1 - First port specification
 * @param spec2 - Second port specification
 * @returns true if specs are different
 */
export function arePortSpecsDifferent(spec1: string, spec2: string): boolean {
  return spec1 !== spec2;
}
