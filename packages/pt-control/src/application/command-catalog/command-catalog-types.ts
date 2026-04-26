/**
 * Command Catalog Types
 *
 * Metadata schema for all PT CLI commands.
 * Used by help, skill, and autonomous-use policies.
 */

export interface CommandCatalogEntry {
  id: string;
  summary: string;
  longDescription?: string;
  examples?: string[];
  related?: string[];
  status: 'stable' | 'partial' | 'experimental';
  requiresPT: boolean;
  requiresContext: boolean;
  supportsAutonomousUse: boolean;
  supportsJson?: boolean;
  supportsPlan?: boolean;
  supportsExplain?: boolean;
  supportsVerify?: boolean;
  writesTopology?: boolean;
  writesIOS?: boolean;
  requiresPostValidation?: boolean;
  postValidationKind?: 'device-add' | 'device-remove' | 'device-move' | 'link-add' | 'link-remove' | 'none';
  notes?: string[];
}
