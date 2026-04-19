// ============================================================================
// Scenario Contracts - Definitions for CCNA Labs
// ============================================================================

export interface ScenarioDefinition {
  id: number;
  title: string;
  objective: string;
  topology: {
    devices: Array<{ name: string; model: string; x: number; y: number }>;
    links: Array<{ from: string; to: string; type?: string }>;
  };
  validation: {
    physical: boolean;
    layer2: boolean;
    layer3: boolean;
    services: boolean;
  };
}

export interface ValidationResult {
  scenarioId: number;
  status: "PASS" | "FAIL" | "PARTIAL";
  details: {
    physical: string[];
    layer2: string[];
    layer3: string[];
    services: string[];
  };
}
