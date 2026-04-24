/**
 * Evidencia de ejecución IOS - datos capturados durante la ejecución de comandos.
 *
 * Se usa para evaluar la confianza del resultado y verificar que el comando
 * se ejecutó correctamente en el dispositivo real.
 *
 * @example
 * ```typescript
 * const evidence: IosExecutionEvidence = {
 *   source: "terminal",
 *   raw: "interface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0",
 *   command: "show run interface GigabitEthernet0/0",
 *   device: "R1",
 *   status: 0,
 *   mode: " privileged",
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface IosExecutionEvidence {
  source: string;
  raw: string;
  command?: string;
  device?: string;
  status?: number;
  mode?: string;
  prompt?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
  paging?: boolean;
  awaitingConfirm?: boolean;
  autoDismissedInitialDialog?: boolean;
  completionReason?: string;
  commandTimeoutMs?: number;
  events?: any[];
}

/**
 * Resultado exitoso de ejecución IOS con datos de confidence y evidence.
 *
 * Representa el resultado de ejecutar un comando IOS en un dispositivo.
 *
 * @example
 * ```typescript
 * const result: IosExecutionSuccess<ShowIpInterfaceBrief> = {
 *   ok: true,
 *   raw: "GigabitEthernet0/0   192.168.1.1    YES manual up                    up",
 *   parsed: { interfaces: [...] },
 *   status: 0,
 *   mode: "privileged",
 *   evidence: { source: "terminal", ... }
 * };
 * ```
 */
export interface IosExecutionSuccess<T = unknown> {
  ok: boolean;
  raw: string;
  value?: T;
  parsed?: T;
  status?: number;
  mode?: string;
  evidence?: IosExecutionEvidence;
}

/**
 * Resultado de aplicar configuración IOS - resultado de configIos (múltiples comandos).
 *
 * Incluye el resultado individual de cada comando para debugging y trazabilidad.
 *
 * @example
 * ```typescript
 * const result: IosConfigApplyResult = {
 *   ok: true,
 *   raw: "...",
 *   executed: true,
 *   device: "R1",
 *   commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"],
 *   results: [
 *     { index: 0, command: "interface...", ok: true, output: "" },
 *     { index: 1, command: "ip address...", ok: true, output: "" }
 *   ],
 *   warnings: []
 * };
 * ```
 */
export interface IosConfigApplyResult {
  ok: boolean;
  raw: string;
  executed: boolean;
  device: string;
  commands: string[];
  results: Array<{ index: number; command: string; ok: boolean; output: string }>;
  warnings?: string[];
  evidence?: IosExecutionEvidence;
}

export type IosConfidence = "non_terminal" | "executed" | "unverified" | "verified";

export function deriveIosConfidence(
  evidence: IosExecutionEvidence,
  verification: { verified?: boolean } | boolean,
): IosConfidence {
  if (evidence.source !== "terminal") return "non_terminal";
  if (typeof verification === "boolean") return verification ? "verified" : "executed";
  if (verification.verified === true) return "verified";
  if (verification.verified === false) return "executed";
  return "unverified";
}