import type { UseCaseInput, UseCaseOutput } from './base/index.js';

export interface AddDeviceInput extends UseCaseInput {
  name: string;
  model: string;
  type: string;
  x?: number;
  y?: number;
}

export interface AddDeviceOutput extends UseCaseOutput {
  device: DeviceEntity;
}

export interface DeviceEntity {
  id: string;
  name: string;
  model: string;
  type: string;
  x?: number;
  y?: number;
}

export interface RemoveDeviceInput extends UseCaseInput {
  name: string;
}

export interface RemoveDeviceOutput extends UseCaseOutput {
  removed: boolean;
}

export interface CommandResult {
  command: string;
  output: string;
  success: boolean;
}

export interface ConfigureDeviceInput extends UseCaseInput {
  deviceName: string;
  commands: string[];
}

export interface ConfigureDeviceOutput extends UseCaseOutput {
  executed: number;
  results: CommandResult[];
}

export interface VlanEntry {
  id: number;
  name?: string;
}

export interface ApplyVlanInput extends UseCaseInput {
  switchName: string;
  vlanIds: number[];
  vlanNames?: Record<number, string>;
}

export interface ApplyVlanOutput extends UseCaseOutput {
  vlans: VlanEntry[];
}

export interface DeviceInput {
  name: string;
  model: string;
  type: string;
  x?: number;
  y?: number;
}

export interface LinkInput {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
}

export interface TopologyNode {
  device: DeviceEntity;
  links: string[];
}

export interface TopologyGraph {
  nodes: Map<string, TopologyNode>;
  edges: Array<{ from: string; to: string; port1: string; port2: string }>;
}

export interface CreateTopologyInput extends UseCaseInput {
  devices: DeviceInput[];
  links: LinkInput[];
}

export interface CreateTopologyOutput extends UseCaseOutput {
  topology: TopologyGraph;
}

export interface UseCaseResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}
