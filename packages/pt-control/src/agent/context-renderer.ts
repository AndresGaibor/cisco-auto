// ============================================================================
// Context Renderer - Converts structured context to text for prompts
// ============================================================================

import type { AgentBaseContext } from "../contracts/twin-types.js";

export interface RenderedContext {
  text: string;
  structured: AgentBaseContext;
}

export function renderBaseContext(context: AgentBaseContext): string {
  const lines: string[] = [];

  // Lab summary
  lines.push(`Lab actual:`);
  lines.push(`- ${context.lab.deviceCount} dispositivos, ${context.lab.linkCount} enlaces, ${context.lab.zoneCount} zonas`);

  // Topology summary
  if (context.topology.coreDevices.length > 0) {
    lines.push(`- Core: ${context.topology.coreDevices.join(", ")}`);
  }
  if (context.topology.accessDevices.length > 0) {
    lines.push(`- Access: ${context.topology.accessDevices.join(", ")}`);
  }
  if (context.topology.serverDevices.length > 0) {
    lines.push(`- Servers: ${context.topology.serverDevices.join(", ")}`);
  }

  // Zones
  if (context.zones.length > 0) {
    const zoneDescriptions = context.zones.map((z) => {
      let desc = z.label || z.id;
      if (z.inferredVlanId) desc += `(VLAN ${z.inferredVlanId})`;
      desc += ` [${z.deviceCount} devices]`;
      return desc;
    });
    lines.push(`- Zonas: ${zoneDescriptions.join(", ")}`);
  }

  // Selection
  if (context.selection?.selectedDevice) {
    lines.push(`- Selección actual: ${context.selection.selectedDevice}`);
  }
  if (context.selection?.selectedZone) {
    lines.push(`- Zona seleccionada: ${context.selection.selectedZone}`);
  }

  // Alerts
  if (context.alerts.length > 0) {
    lines.push(`- Alertas: ${context.alerts.join("; ")}`);
  }

  // Recent changes
  if (context.recentChanges.length > 0) {
    const recent = context.recentChanges.slice(-3).map((c) => {
      const time = new Date(c.ts).toLocaleTimeString();
      return `${c.type} en ${c.target} (${time})`;
    });
    lines.push(`- Cambios recientes: ${recent.join("; ")}`);
  }

  return lines.join("\n");
}

export function renderCompactContext(context: AgentBaseContext): string {
  const lines: string[] = [];

  lines.push(`Lab: ${context.lab.deviceCount}dev/${context.lab.linkCount}links/${context.lab.zoneCount}zonas`);

  if (context.topology.coreDevices.length > 0) {
    lines.push(`Core: ${context.topology.coreDevices.join(",")}`);
  }

  const zones = context.zones
    .filter((z) => z.inferredVlanId)
    .map((z) => `${z.label || z.id}:V${z.inferredVlanId}`)
    .join(",");
  if (zones) {
    lines.push(`Zonas: ${zones}`);
  }

  if (context.selection?.selectedDevice) {
    lines.push(`Device: ${context.selection.selectedDevice}`);
  }

  if (context.alerts.length > 0) {
    lines.push(`Alerts: ${context.alerts.slice(0, 2).join("; ")}`);
  }

  return lines.join(" | ");
}

export function renderDetailedContext(context: AgentBaseContext): string {
  const lines: string[] = [];

  lines.push("=== CONTEXTO DEL LABORATORIO ===");
  lines.push("");
  lines.push(`Dispositivos: ${context.lab.deviceCount}`);
  lines.push(`Enlaces: ${context.lab.linkCount}`);
  lines.push(`Zonas: ${context.lab.zoneCount}`);
  lines.push(`Última actualización: ${new Date(context.lab.lastUpdatedAt).toISOString()}`);

  lines.push("");
  lines.push("--- Topología ---");
  if (context.topology.coreDevices.length > 0) {
    lines.push(`Core devices: ${context.topology.coreDevices.join(", ")}`);
  }
  if (context.topology.accessDevices.length > 0) {
    lines.push(`Access devices: ${context.topology.accessDevices.join(", ")}`);
  }
  if (context.topology.serverDevices.length > 0) {
    lines.push(`Server devices: ${context.topology.serverDevices.join(", ")}`);
  }

  lines.push("");
  lines.push("--- Zonas ---");
  for (const zone of context.zones) {
    let zoneInfo = `  ${zone.id}`;
    if (zone.label) zoneInfo += ` (${zone.label})`;
    if (zone.color) zoneInfo += ` [${zone.color}]`;
    if (zone.inferredVlanId) zoneInfo += ` -> VLAN ${zone.inferredVlanId}`;
    zoneInfo += ` -> ${zone.deviceCount} devices`;
    lines.push(zoneInfo);
  }

  if (context.selection?.selectedDevice) {
    lines.push("");
    lines.push(`--- Selección ---`);
    lines.push(`Device: ${context.selection.selectedDevice}`);
  }

  if (context.alerts.length > 0) {
    lines.push("");
    lines.push("--- Alertas ---");
    for (const alert of context.alerts) {
      lines.push(`  - ${alert}`);
    }
  }

  if (context.recentChanges.length > 0) {
    lines.push("");
    lines.push("--- Cambios Recientes ---");
    for (const change of context.recentChanges.slice(-5)) {
      const time = new Date(change.ts).toLocaleString();
      lines.push(`  - [${time}] ${change.type} en ${change.target}`);
    }
  }

  return lines.join("\n");
}
