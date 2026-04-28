import { Command } from "commander";

import type { CliResult } from "../../contracts/cli-result.js";
import { createSuccessResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { runCommand } from "../../application/run-command.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { flagsFromCommand } from "../../flags-utils.js";

interface LinkListEntry {
  id?: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType?: string;
  state?: string;
  source?: string;
}

interface LinkListResult {
  source: "listLinks" | "snapshot";
  stats: {
    linkCount: number;
    green: number;
    amber: number;
    down: number;
    unknown: number;
  };
  links: LinkListEntry[];
}

export const LINK_LIST_META: CommandMeta = {
  id: "link.list",
  summary: "Listar enlaces live en Packet Tracer",
  longDescription:
    "Lista enlaces usando el handler rápido listLinks por defecto. Usa --deep para consultar snapshot completo.",
  examples: [
    {
      command: "bun run pt link list --json",
      description: "Listar enlaces rápido con listLinks, sin snapshot",
    },
    {
      command: "bun run pt link list --json --deep",
      description: "Listar enlaces desde snapshot completo",
    },
  ],
  related: ["bun run pt link add", "bun run pt device list"],
  nextSteps: ["bun run pt link verify <dev1>:<port1> <dev2>:<port2>"],
  tags: ["link", "list", "topology"],
  supportsJson: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function normalizeState(value: unknown): string {
  const raw = String(value ?? "unknown").trim().toLowerCase();

  if (["green", "up", "operational", "on"].includes(raw)) return "green";
  if (["amber", "orange", "yellow"].includes(raw)) return "amber";
  if (["down", "red", "off", "missing", "disconnected"].includes(raw)) return "down";

  return raw || "unknown";
}

function endpointKey(device: string, port: string): string {
  return `${device}:${port}`.toLowerCase();
}

function linkKey(link: LinkListEntry): string {
  if (link.id) return `id:${link.id}`;

  const a = endpointKey(link.device1, link.port1);
  const b = endpointKey(link.device2, link.port2);

  return [a, b].sort().join("<->");
}

function normalizeLink(raw: unknown, ownerDevice?: string): LinkListEntry | null {
  const record = asRecord(raw);

  const endpointA = asRecord(record.endpointA ?? record.endpoint1 ?? record.local ?? record.source ?? record.from);
  const endpointB = asRecord(record.endpointB ?? record.endpoint2 ?? record.remote ?? record.target ?? record.to);

  const device1 = firstString([
    record.device1,
    record.localDevice,
    record.sourceDevice,
    record.fromDevice,
    record.device,
    endpointA.device,
    endpointA.deviceName,
    endpointA.name,
    ownerDevice,
  ]);

  const port1 = firstString([
    record.port1,
    record.localPort,
    record.sourcePort,
    record.fromPort,
    record.port,
    endpointA.port,
    endpointA.portName,
    endpointA.name,
  ]);

  const device2 = firstString([
    record.device2,
    record.remoteDevice,
    record.targetDevice,
    record.toDevice,
    record.neighborDevice,
    endpointB.device,
    endpointB.deviceName,
    endpointB.name,
  ]);

  const port2 = firstString([
    record.port2,
    record.remotePort,
    record.targetPort,
    record.toPort,
    record.neighborPort,
    endpointB.port,
    endpointB.portName,
    endpointB.name,
  ]);

  if (!device1 || !port1 || !device2 || !port2) return null;

  return {
    id: firstString([record.id, record.uuid, record.linkId]) || undefined,
    device1,
    port1,
    device2,
    port2,
    cableType: firstString([record.cableType, record.type, record.media]) || undefined,
    state: normalizeState(record.state ?? record.status ?? record.lightName),
    source: firstString([record.source]) || undefined,
  };
}

function dedupeLinks(links: LinkListEntry[]): LinkListEntry[] {
  const map = new Map<string, LinkListEntry>();

  for (const link of links) {
    map.set(linkKey(link), link);
  }

  return [...map.values()];
}

function extractLinksFromListDevicesResult(result: unknown): LinkListEntry[] {
  const links: LinkListEntry[] = [];
  const record = asRecord(result);

  const connectionsByDevice = asRecord(record.connectionsByDevice);

  for (const [ownerDevice, connections] of Object.entries(connectionsByDevice)) {
    for (const connection of asArray(connections)) {
      const link = normalizeLink(connection, ownerDevice);
      if (link) links.push({ ...link, source: "connectionsByDevice" });
    }
  }

  const devices = Array.isArray(result) ? result : asArray(record.devices);

  for (const device of devices) {
    const deviceRecord = asRecord(device);
    const ownerDevice = firstString([deviceRecord.name, deviceRecord.id]);

    for (const connection of asArray(deviceRecord.connections)) {
      const link = normalizeLink(connection, ownerDevice);
      if (link) links.push({ ...link, source: "device.connections" });
    }

    for (const connection of asArray(deviceRecord.links)) {
      const link = normalizeLink(connection, ownerDevice);
      if (link) links.push({ ...link, source: "device.links" });
    }
  }

  return dedupeLinks(links);
}

function extractLinksFromSnapshot(snapshot: unknown): LinkListEntry[] {
  const record = asRecord(snapshot);
  const rawLinks = record.links;

  const links =
    Array.isArray(rawLinks)
      ? rawLinks
      : Object.values(asRecord(rawLinks));

  return dedupeLinks(
    links
      .map((link) => normalizeLink(link))
      .filter((link): link is LinkListEntry => Boolean(link)),
  );
}

function filterLinks(
  links: LinkListEntry[],
  options: {
    device?: string;
    up?: boolean;
    down?: boolean;
  },
): LinkListEntry[] {
  return links.filter((link) => {
    if (options.device && link.device1 !== options.device && link.device2 !== options.device) return false;
    if (options.up && link.state !== "green") return false;
    if (options.down && link.state === "green") return false;

    return true;
  });
}

function buildStats(links: LinkListEntry[]): LinkListResult["stats"] {
  return {
    linkCount: links.length,
    green: links.filter((link) => link.state === "green").length,
    amber: links.filter((link) => link.state === "amber").length,
    down: links.filter((link) => link.state === "down").length,
    unknown: links.filter((link) => !link.state || link.state === "unknown").length,
  };
}

export function createLinkListCommand(): Command {
  return new Command("list")
    .description("Listar enlaces live en Packet Tracer")
    .option("--device <name>", "Filtrar por dispositivo")
    .option("--up", "Solo enlaces up/green", false)
    .option("--down", "Solo enlaces down/amber/down", false)
    .option("--deep", "Usar snapshot completo de PT; puede ser lento", false)
    .option("--no-deep", "No usar snapshot completo")
    .option("--json", "Salida en JSON", false)
    .action(async (options, command) => {
      const flags = flagsFromCommand(command);
      const deep = options.deep === true;

      const result = await runCommand<LinkListResult>({
        action: "link.list",
        meta: LINK_LIST_META,
        flags,
        payloadPreview: {
          device: options.device,
          up: Boolean(options.up),
          down: Boolean(options.down),
          deep,
        },
        execute: async ({ controller, logPhase }): Promise<CliResult<LinkListResult>> => {
          await logPhase("read", {
            mode: deep ? "snapshot" : "listLinks",
          });

          if (deep) {
            const links = filterLinks(extractLinksFromSnapshot(await controller.snapshot()), {
              device: options.device,
              up: Boolean(options.up),
              down: Boolean(options.down),
            });

            return createSuccessResult<LinkListResult>("link.list", {
              source: "snapshot",
              stats: buildStats(links),
              links,
            }, {
              advice: ["Este listado usó snapshot completo. Para modo rápido usa pt link list --json --no-deep."],
            });
          }

          const state = options.up ? "green" : options.down ? "down" : undefined;
          const primitive = await controller.runPrimitive("link.list", {
            type: "listLinks",
            ...(options.device ? { device: options.device } : {}),
            ...(state ? { state } : {}),
          });

          if (!primitive.ok) {
            return createSuccessResult<LinkListResult>("link.list", {
              source: "listLinks",
              stats: buildStats([]),
              links: [],
            }, {
              warnings: [primitive.error ?? "No se pudo listar enlaces con listLinks."],
              advice: ["Ejecuta pt link list --deep para usar snapshot como fallback explícito."],
            });
          }

          const value = asRecord(primitive.value);
          const runtimeLinks = asArray(value.links);

          const links = filterLinks(
            runtimeLinks
              .map((link) => normalizeLink(link))
              .filter((link): link is LinkListEntry => Boolean(link)),
            {
              device: options.device,
              up: Boolean(options.up),
              down: Boolean(options.down),
            },
          );

          return createSuccessResult<LinkListResult>("link.list", {
            source: "listLinks",
            stats: buildStats(links),
            links,
          }, {
            advice: links.length === 0
              ? [
                  "No se detectaron enlaces live con listLinks.",
                  "Verifica que existan enlaces físicos o usa pt link list --deep para diagnóstico profundo.",
                ]
              : undefined,
          });
        },
      });

      renderCommandResult({ result, flags });
    });
}
