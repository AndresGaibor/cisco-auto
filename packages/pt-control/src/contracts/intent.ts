export type IntentKind = "topology" | "ios-config" | "service" | "validation" | "diagnosis" | "capability-probe";

export interface Intent {
  id: string;
  kind: IntentKind;
  goal: string;
  constraints?: Record<string, unknown>;
  target?: string;
  metadata?: Record<string, unknown>;
}