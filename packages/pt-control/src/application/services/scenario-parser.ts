// ============================================================================
// Scenario Parser - Parsing puro de YAML a objetos de dominio
// Sin dependencias de infraestructura, solo transformación de datos
// ============================================================================

/**
 * Representa un dispositivo parseado del YAML
 */
export interface LabDevice {
  name: string;
  type: string;
  model: string;
  x: number;
  y: number;
}

/**
 * Representa un enlace entre dispositivos
 */
export interface LabLink {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

/**
 * Representa una configuración de dispositivo (IP, gateway, DHCP)
 */
export interface LabConfig {
  device: string;
  type: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

/**
 * Representa una validación definida en el YAML
 */
export interface LabValidation {
  type: string;
  from?: string;
  to?: string;
  device?: string;
  expect?: string | Record<string, unknown>;
}

/**
 * Representación estructura de un lab parseado desde YAML
 */
export interface ParsedLab {
  name?: string;
  description?: string;
  devices: LabDevice[];
  links: LabLink[];
  configs: LabConfig[];
  validation: LabValidation[];
}

/**
 * Parser minimalista de YAML (sin dependencias externas).
 * Soporta listas y objetos anidados con indentación.
 * @param content - Contenido YAML como string
 * @returns Objeto parsed con estructura anidada
 */
export function parseYamlRaw(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  const stack: Array<{ indent: number; key: string; obj: Record<string, unknown> }> = [];
  let currentList: unknown[] = [];
  let listKey = "";

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li]!;
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 0 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    if (trimmed === "-") {
      listKey = stack.length > 0 ? stack[stack.length - 1]!.key : "";
      currentList = [];
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      if (currentList.length > 0 && typeof currentList[currentList.length - 1] === "string") {
        currentList.push(trimmed);
      }
      continue;
    }

    const rawKey = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (currentList.length > 0 && listKey) {
      const last = currentList[currentList.length - 1];
      if (typeof last === "string" && last.includes(":")) {
        const obj: Record<string, string> = {};
        obj[rawKey] = rawValue;
        currentList[currentList.length - 1] = obj;
      } else if (typeof last === "object" && last !== null) {
        (last as Record<string, string>)[rawKey] = rawValue;
      }
      continue;
    }

    if (!rawValue) {
      const newObj: Record<string, unknown> = { _indent: indent };
      if (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        top.obj[rawKey] = newObj;
      } else {
        result[rawKey] = newObj;
      }
      stack.push({ indent, key: rawKey, obj: newObj });
    } else {
      const value = rawValue;
      if (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        top.obj[rawKey] = value;
      } else {
        result[rawKey] = value;
      }
    }
  }

  return result;
}

/**
 * Transforma un objeto parsed de YAML a estructura ParsedLab tipada.
 * Aplica defaults y conversiones de tipos seguras.
 * @param parsed - Objeto retornado por parseYamlRaw
 * @returns Estructura tipada ParsedLab
 */
export function yamlToLab(parsed: Record<string, unknown>): ParsedLab {
  const devices = ((parsed.devices as Array<Record<string, unknown>>) || []).map(
    (d): LabDevice => ({
      name: String(d["name"] || d["id"] || ""),
      type: String(d["type"] || "unknown"),
      model: String(d["model"] || "PC-PT"),
      x: Number(d["x"] ?? 200),
      y: Number(d["y"] ?? 200),
    }),
  );

  const links = ((parsed.links as Array<Record<string, unknown>>) || []).map(
    (l): LabLink => ({
      from: String(l["from"] || ""),
      fromPort: String(l["fromPort"] || l["port"] || "FastEthernet0/1"),
      to: String(l["to"] || ""),
      toPort: String(l["toPort"] || l["port"] || "FastEthernet0/1"),
    }),
  );

  const configs = ((parsed.configs as Array<Record<string, unknown>>) || []).map(
    (c): LabConfig => ({
      device: String(c["device"] || ""),
      type: String(c["type"] || "host"),
      ip: c["ip"] as string | undefined,
      mask: c["mask"] as string | undefined,
      gateway: c["gateway"] as string | undefined,
      dns: c["dns"] as string | undefined,
      dhcp: c["dhcp"] as boolean | undefined,
    }),
  );

  const validation = ((parsed.validation as Array<Record<string, unknown>>) || []).map(
    (v): LabValidation => ({
      type: String(v["type"] || ""),
      from: v["from"] as string | undefined,
      to: v["to"] as string | undefined,
      device: v["device"] as string | undefined,
      expect: v["expect"] as Record<string, unknown> | undefined,
    }),
  );

  return {
    name: parsed["name"] as string | undefined,
    description: parsed["description"] as string | undefined,
    devices,
    links,
    configs,
    validation,
  };
}

/**
 * Parsea contenido YAML directamente a ParsedLab.
 * Combina parseYamlRaw + yamlToLab en un solo paso.
 * @param yamlContent - Contenido YAML como string
 * @returns ParsedLab tipado o null si falla el parsing
 */
export function parseLabYaml(yamlContent: string): ParsedLab | null {
  try {
    const parsed = parseYamlRaw(yamlContent);
    return yamlToLab(parsed);
  } catch {
    return null;
  }
}