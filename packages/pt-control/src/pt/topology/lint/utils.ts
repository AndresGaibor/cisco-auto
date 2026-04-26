/**
 * Helper utilities para subnet calculations
 */

/**
 * Obtener clave de subred (network/mask) desde IP y mascara
 */
export function getSubnetKey(ip: string, mask: string): string {
  const ipParts = ip.split('.').map(Number);
  const maskParts = mask.split('.').map(Number);
  const network = ipParts.map((p, i) => (p ?? 0) & (maskParts[i] ?? 0)).join('.');
  return `${network}/${mask}`;
}

/**
 * Alias para getSubnetKey
 */
export function getSubnetKeyFromIp(ip: string, mask: string): string {
  return getSubnetKey(ip, mask);
}