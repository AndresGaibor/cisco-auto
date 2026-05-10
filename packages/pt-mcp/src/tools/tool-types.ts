import type { McpControlContext } from "../control/mcp-control-context.js";
import type { PtMcpCommandCatalogEntry, RunPtCliInput, RunPtCliResult } from "../types.js";

export interface RegisterToolContext {
  server: { registerTool: (...args: any[]) => void };
  control: McpControlContext;
  runPtCli: (input: RunPtCliInput) => Promise<RunPtCliResult>;
  commandCatalog: PtMcpCommandCatalogEntry[];
  cliEntrypoint: string;
  repoRoot: string;
  defaultTimeoutMs: number;
  live?: boolean;
  liveWriter?: (line: string) => void;
}
