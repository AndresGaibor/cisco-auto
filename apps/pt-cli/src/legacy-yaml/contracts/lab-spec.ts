#!/usr/bin/env bun
/**
 * Contrato local para especificación de laboratorios.
 *
 *Este archivo re-exporta desde @cisco-auto/network-intent para mantener
 *compatibilidad con el código existente de CLI. La lógica pura de lab specs
 *vive en network-intent; aquí solo queda el I/O de archivos.
 */

import { readFileSync, existsSync } from "node:fs";
import * as yaml from "js-yaml";

export type {
  DeviceType,
  SwitchportMode,
  CableType,
  LabMetadata,
  DeviceInterface,
  ConnectionEndpoint,
  LabConnection,
  LabDevice,
  LabSpec,
  ParsedDevice,
  ParsedConnection,
  ParsedLabYaml,
  LabValidationResult,
  TopologyStats,
} from "@cisco-auto/network-intent/model";

export {
  toDeviceType,
  toSwitchportMode,
  toCableType,
  toLabSpec,
  validateLabSafe,
  analyzeTopology,
  generateMermaidDiagram,
  visualizeTopology,
} from "@cisco-auto/network-intent/model";

export type { LabSpec as LabSpecType } from "@cisco-auto/network-intent/model";

export function loadLabYaml(filePath: string): import("@cisco-auto/network-intent/model").ParsedLabYaml {
  if (!existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  const content = readFileSync(filePath, "utf-8");
  const parsed = yaml.load(content) as import("@cisco-auto/network-intent/model").ParsedLabYaml;
  return parsed;
}
