// Exports de todos los puertos del runtime
// Puertos de entrada para la capa de orquestación (pt-control)

export type { RuntimePrimitivePort, PrimitivePortOptions, PrimitivePortResult } from "./runtime-primitive-port";
export { createPrimitivePort } from "./runtime-primitive-port";

export type { RuntimeTerminalPort, TerminalPortOptions, TerminalPortResult, TerminalPlan, TerminalPlanStep } from "./runtime-terminal-port";
export { createTerminalPort } from "./runtime-terminal-port";

export type { RuntimeOmniPort, OmniPortOptions, OmniPortResult, OmniAdapterMetadata, OmniRisk, OmniDomain } from "./runtime-omni-port";
export { createOmniPort } from "./runtime-omni-port";