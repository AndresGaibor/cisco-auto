/**
 * EtherChannel Types
 *
 * Re-exports and augments EtherChannel types from kernel for use in pt-control.
 */

export type {
  EtherChannelConfigInput,
  EtherChannelConfig,
} from "@cisco-auto/kernel/plugins/switching";

export interface EtherchannelControllerPort {
  listDevices(): Promise<{ devices: EtherchannelDevice[] } | EtherchannelDevice[]>;
  configIosWithResult(
    device: string,
    commands: string[],
    options: { save: boolean },
  ): Promise<unknown>;
  execIos(device: string, command: string, waitForResult?: boolean): Promise<{ raw: string }>;
}

export interface EtherchannelDeviceTarget {
  name: string;
  model?: string;
  type?: string | number;
}

export interface EtherchannelDevice {
  name: string;
  model?: string;
  type?: string | number;
}

export interface EtherchannelCreateResult {
  device: string;
  groupId: number;
  interfaces: string[];
  commands: string[];
  commandsGenerated: number;
}

export interface EtherchannelRemoveResult {
  device: string;
  groupId: number;
  commands: string[];
}

export interface EtherchannelListResult {
  device: string;
  output: string;
}

export type EtherchannelUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        message: string;
        details?: Record<string, unknown>;
      };
    };
