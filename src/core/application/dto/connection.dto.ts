//**
 * DTOs para Connection
 * Objetos de transferencia de datos para conexiones
 */

export interface CreateConnectionDto {
  fromDeviceName: string;
  fromPort: string;
  toDeviceName: string;
  toPort: string;
  cableType: string; // Nombre o tipo de cable
}

export interface ConnectionResponseDto {
  id: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromPort: string;
  toDeviceId: string;
  toDeviceName: string;
  toPort: string;
  cableType: string;
  cableDisplayName: string;
  medium: string;
  functional: boolean;
  displayString: string;
}

export interface ConnectionListResponseDto {
  connections: ConnectionResponseDto[];
  total: number;
}

export interface PortAvailabilityDto {
  deviceId: string;
  deviceName: string;
  portName: string;
  portType: string;
  available: boolean;
  supportsFiber: boolean;
  supportsCopper: boolean;
  supportsSerial: boolean;
}
