/**
 * Validate use cases - Laboratory validation business logic
 */

import type { ValidationIssue, ValidationResult, ValidateUseCaseResult } from "./validate-types.js";

export interface LabSpecDevice {
  id?: string;
  name: string;
  type: string;
  hostname?: string;
  interfaces?: Array<{ ip?: string; name?: string }>;
  vlans?: unknown[];
  routing?: unknown;
}

export interface LabSpecConnection {
  from: { deviceName: string };
  to: { deviceName: string };
  cableType?: string;
}

export interface LabSpec {
  metadata: { name?: string };
  devices: LabSpecDevice[];
  connections: LabSpecConnection[];
}

/**
 * Valida un laboratorio y retorna issues detallados
 */
export function validateLab(spec: LabSpec): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!spec.metadata?.name) {
    issues.push({
      severity: "warning",
      category: "structure",
      message: "El laboratorio no tiene nombre definido",
      suggestion: "Agrega metadata.name en el archivo YAML",
    });
  }

  if (!spec.devices || spec.devices.length === 0) {
    issues.push({
      severity: "error",
      category: "structure",
      message: "No hay dispositivos definidos",
    });
    return createValidationResult(issues);
  }

  const deviceNames = new Map<string, string[]>();
  for (const device of spec.devices) {
    const name = device.name;
    if (!deviceNames.has(name)) {
      deviceNames.set(name, []);
    }
    deviceNames.get(name)!.push(device.id ?? name);

    if (!device.hostname) {
      issues.push({
        severity: "warning",
        category: "structure",
        message: `Dispositivo '${name}' no tiene hostname`,
        device: name,
        suggestion: "Define un hostname para identificación en IOS",
      });
    }
  }

  for (const [name, ids] of deviceNames) {
    if (ids.length > 1) {
      issues.push({
        severity: "error",
        category: "structure",
        message: `Dispositivo duplicado: '${name}' aparece ${ids.length} veces`,
        suggestion: "Cada dispositivo debe tener un nombre único",
      });
    }
  }

  const deviceNameSet = new Set(spec.devices.map((d) => d.name));
  for (const conn of spec.connections) {
    if (!deviceNameSet.has(conn.from.deviceName)) {
      issues.push({
        severity: "error",
        category: "topology",
        message: `Conexión refiere dispositivo inexistente: '${conn.from.deviceName}'`,
        connection: `${conn.from.deviceName} -> ${conn.to.deviceName}`,
      });
    }
    if (!deviceNameSet.has(conn.to.deviceName)) {
      issues.push({
        severity: "error",
        category: "topology",
        message: `Conexión refere dispositivo inexistente: '${conn.to.deviceName}'`,
        connection: `${conn.from.deviceName} -> ${conn.to.deviceName}`,
      });
    }
  }

  for (const device of spec.devices) {
    if (device.type === "router" && (!device.interfaces || device.interfaces.length === 0)) {
      issues.push({
        severity: "warning",
        category: "physical",
        message: `Router '${device.name}' no tiene interfaces definidas`,
        device: device.name,
        suggestion: "Los routers necesitan al menos una interfaz configurada",
      });
    }
  }

  for (const device of spec.devices) {
    if (device.type === "switch" && device.vlans && (device.vlans as unknown[]).length > 0) {
      const hasTrunk = spec.connections.some(
        (conn) =>
          (conn.from.deviceName === device.name || conn.to.deviceName === device.name) &&
          String(conn.cableType).includes("trunk"),
      );
      if (!hasTrunk && spec.devices.filter((d) => d.type === "switch").length > 1) {
        issues.push({
          severity: "info",
          category: "best-practice",
          message: `Switch '${device.name}' tiene VLANs pero no hay enlace trunk detectado`,
          device: device.name,
          suggestion: "Configura un puerto trunk para comunicación inter-switch",
        });
      }
    }
  }

  for (const device of spec.devices) {
    if (device.type === "pc" && device.interfaces && device.interfaces.length > 0) {
      const hasIP = device.interfaces.some((i) => i.ip);
      if (!hasIP) {
        issues.push({
          severity: "info",
          category: "logical",
          message: `PC '${device.name}' no tiene IP configurada`,
          device: device.name,
          suggestion: "Configura IP estática o habilita DHCP",
        });
      }
    }
  }

  const connectedDevices = new Set<string>();
  for (const conn of spec.connections) {
    connectedDevices.add(conn.from.deviceName);
    connectedDevices.add(conn.to.deviceName);
  }
  for (const device of spec.devices) {
    if (!connectedDevices.has(device.name)) {
      issues.push({
        severity: "warning",
        category: "topology",
        message: `Dispositivo '${device.name}' no tiene conexiones`,
        device: device.name,
        suggestion: "Conecta el dispositivo a la topología",
      });
    }
  }

  return createValidationResult(issues);
}

/**
 * Crea el resultado de validación counting issues
 */
function createValidationResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  return {
    valid: errors === 0,
    issues,
    summary: { errors, warnings, info },
  };
}

/**
 * Use case principal de validación
 */
export function validateLabUseCase(spec: LabSpec): ValidateUseCaseResult {
  try {
    const result = validateLab(spec);
    return { ok: result.valid, data: result };
  } catch (error) {
    return {
      ok: false,
      error: { message: error instanceof Error ? error.message : "Validación fallida" },
    };
  }
}