// packages/pt-runtime/src/runtime/security.ts
// Funciones de seguridad orthogonales a la validación

export function isValidIpv4(ip: string): boolean {
  var parts = ip.split(".");
  if (parts.length !== 4) return false;
  for (var i = 0; i < 4; i++) {
    var num = parseInt(parts[i], 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }
  return true;
}

export function hasPrototypePollution(payload: Record<string, unknown>): boolean {
  return (
    payload.__proto__ !== undefined ||
    payload.constructor !== undefined ||
    payload.prototype !== undefined
  );
}
