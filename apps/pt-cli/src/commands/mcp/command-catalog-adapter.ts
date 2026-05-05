import type { PtCommandDefinition } from "../../cli/command-definition.js";
import type { PtMcpCommandCatalogEntry } from "@cisco-auto/pt-mcp";

export function toPtMcpCommandCatalog(definitions: PtCommandDefinition[]): PtMcpCommandCatalogEntry[] {
  return definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    aliases: definition.aliases,
    group: definition.group,
    summary: definition.summary,
    description: definition.description,
    examples: definition.examples,
    related: definition.related,
    agentHints: definition.agentHints,
  }));
}
