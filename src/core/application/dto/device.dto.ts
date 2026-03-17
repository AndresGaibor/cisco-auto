/**
 * DTOs para Device
 * Objetos de transferencia de datos para la capa de aplicación
 */
import { DeviceType } from '../../domain/entities/device.entity.ts';

export interface CreateDeviceDto {
  name: string;
  type: DeviceType;
  model?: string;
  hostname?: string;
  iosVersion?: string;
}

export interface UpdateDeviceDto {
  name?: string;
  hostname?: string;
  model?: string;
}

export interface InterfaceConfigDto {
  name: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  vlan?: number;
  mode?: 'access' | 'trunk' | 'routed';
  shutdown?: boolean;
  description?: string;
}

export interface DeviceCredentialsDto {
  username: string;
  password: string;
  enablePassword?: string;
}

export interface SSHConfigDto {
  enabled: boolean;
  version: 1 | 2;
  port: number;
}

export interface DeviceResponseDto {
  id: string;
  name: string;
  type: DeviceType;
  typeDescription: string;
  icon: string;
  model?: string;
  hostname?: string;
  interfaces: InterfaceConfigDto[];
  portCount: number;
  availablePorts: string[];
  supportsRouting: boolean;
  supportsVlans: boolean;
  supportsModules: boolean;
}

export interface DeviceListResponseDto {
  devices: DeviceResponseDto[];
  total: number;
  byType: Record<string, number>;
}
