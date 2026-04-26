export interface AclCreateInput {
  name: string;
  type: "standard" | "extended";
}

export interface AclCreateResult {
  name: string;
  type: string;
  commands: string[];
  commandsGenerated: number;
}

export interface AclAddRuleInput {
  aclName: string;
  rule: string;
}

export interface AclAddRuleResult {
  acl: string;
  command: string;
}

export interface AclApplyInput {
  deviceName: string;
  aclName: string;
  interface: string;
  direction: "in" | "out";
}

export interface AclApplyResult {
  acl: string;
  device: string;
  interface: string;
  direction: string;
  commands: string[];
  commandsGenerated: number;
}

export interface AclUseCaseError {
  ok: false;
  error: {
    message: string;
    details?: Record<string, unknown>;
  };
}

export type AclUseCaseOutput<T> =
  | { ok: true; data: T; advice?: string[] }
  | AclUseCaseError;

export interface AclControllerPort {
  start(): Promise<void>;
  stop(): Promise<void>;
  configIos(device: string, commands: string[]): Promise<void>;
  configIosWithResult(
    device: string,
    commands: string[],
    options: { save: boolean },
  ): Promise<unknown>;
}

export type AclType = "standard" | "extended";

export function parseAclType(raw: string): AclType {
  return raw === "extended" ? "extended" : "standard";
}

export function validateAclName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 64) return false;
  return true;
}

export function validateDirection(dir: string): boolean {
  return dir === "in" || dir === "out";
}

export function validateInterface(interfaceName: string): boolean {
  if (!interfaceName || interfaceName.trim().length === 0) return false;
  const validPrefixes = ["FastEthernet", "GigabitEthernet", "Ethernet", "Serial", "Vlan", "Port-channel"];
  return validPrefixes.some((prefix) => interfaceName.startsWith(prefix));
}