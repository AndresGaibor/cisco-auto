/**
 * Check domain types - shared interfaces for network validation scenarios
 */

export interface CheckResultItem {
  name: string;
  status: "pass" | "fail" | "warning" | "skip";
  message: string;
  details?: Record<string, unknown>;
  fix?: string;
}

export interface CheckResult {
  scenario: string;
  passed: number;
  failed: number;
  warnings: number;
  checks: CheckResultItem[];
  summary: string;
}

export interface CheckScenario {
  description: string;
  validate: (
    controller: CheckControllerPort,
    scenario: string,
    fix: boolean,
  ) => Promise<CheckResultItem[]>;
}

/**
 * Port interface for check use cases - abstracts PTController
 */
export interface CheckControllerPort {
  listDevices(): Promise<{ devices: CheckDevice[] } | CheckDevice[]>;
  inspectDevice(name: string): Promise<CheckDeviceState>;
  sendPing(source: string, target: string, timeoutMs?: number): Promise<CheckPingResult>;
}

export interface CheckDevice {
  name: string;
  type: string | number;
  model?: string;
}

export interface CheckDeviceState {
  name: string;
  type?: string | number;
  model?: string;
  ip?: string;
  mask?: string;
  ports?: CheckPort[];
}

export interface CheckPort {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
}

export interface CheckPingResult {
  success: boolean;
  raw?: string;
}

export interface CheckUseCaseSuccess<T> {
  ok: true;
  data: T;
}

export interface CheckUseCaseError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type CheckUseCaseResult<T> = CheckUseCaseSuccess<T> | CheckUseCaseError;