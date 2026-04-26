import { type StpConfigInput } from "@cisco-auto/kernel/plugins/switching";

export interface StpApplyInput {
  deviceName: string;
  mode: "pvst" | "rapid-pvst" | "mst";
}

export interface StpApplyResult {
  device: string;
  mode: string;
  commands?: string[];
  commandsGenerated: number;
}

export interface StpRootInput {
  deviceName: string;
  vlanIds: number[];
  priority?: number;
  rootPrimary?: boolean;
  rootSecondary?: boolean;
}

export interface StpRootResult {
  device: string;
  vlan: number;
  priority?: number;
  commands?: string[];
  commandsGenerated: number;
}

export interface StpUseCaseResult<T> {
  ok: true;
  data: T;
  advice?: string[];
}

export interface StpUseCaseError {
  ok: false;
  error: {
    message: string;
    details?: Record<string, unknown>;
  };
}

export type StpValidationResult =
  | { ok: true }
  | { ok: false; errors: Array<{ message: string }> };

export type StpUseCaseOutput<T> = StpUseCaseResult<T> | StpUseCaseError;

export interface StpControllerPort {
  listDevices(): Promise<{ devices: StpDeviceTarget[] } | StpDeviceTarget[]>;
  configIosWithResult(
    device: string,
    commands: string[],
    options: { save: boolean },
  ): Promise<unknown>;
}

export interface StpDeviceTarget {
  name: string;
  model?: string;
  type?: string | number;
}