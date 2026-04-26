/**
 * Command Catalog - Single Source of Truth para metadatos de comandos CLI
 *
 * Este módulo centraliza:
 * - CommandMetadata (tipos enriquecidos con examples y related)
 * - commandExamples (ejemplos prácticos)
 * - relatedCommands (comandos relacionados)
 * - Schemas de validación Zod
 */

export type { CommandExample, RelatedCommand, CommandMetadata, CommandCatalogEntry } from './command-metadata.js';

export {
  commandExamples,
  getExamples,
  getExamplesForCommand,
} from './examples.js';

export {
  relatedCommands,
  getRelatedCommands,
  getRelatedForCommand,
} from './related.js';

export {
  CommandExampleSchema,
  RelatedCommandSchema,
  CommandMetadataSchema,
  CommandExamplesRecordSchema,
  RelatedCommandsRecordSchema,
} from './schemas.js';
