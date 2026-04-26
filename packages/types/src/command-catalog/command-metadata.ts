/**
 * CommandMetadata - Metadatos enrichecidos para comandos CLI
 * Contiene ejemplos prácticos y comandos relacionados por cada comando.
 */

export interface CommandExample {
  description: string;
  command: string;
}

export interface RelatedCommand {
  name: string;
  description: string;
}

export interface CommandMetadata {
  id: string;
  summary: string;
  longDescription?: string;
  examples: CommandExample[];
  related: RelatedCommand[];
  status?: 'stable' | 'beta' | 'deprecated';
}

export interface CommandCatalogEntry {
  id: string;
  summary: string;
  longDescription?: string;
  examples: CommandExample[];
  related: RelatedCommand[];
  status?: 'stable' | 'beta' | 'deprecated';
}
