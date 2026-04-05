import type { DeviceCatalogEntry } from '../schema';
import { parsePortName } from '../../canonical/types';
import { getModuleByCode } from '../modules';
import { PortDefinitionVO } from './port-definition.vo';
import { ModuleDefinitionVO } from './module-definition.vo';

type InstalledModule = {
  slotIndex: number;
  code: string;
  enabled?: boolean;
};

type DeviceSlot = {
  slotIndex: number;
  type: string;
  supportedModules: string[];
};

export class DeviceModelVO {
  readonly value: DeviceCatalogEntry;

  constructor(value: DeviceCatalogEntry) {
    this.assertValid(value);
    this.value = value;
  }

  static from(value: DeviceCatalogEntry): DeviceModelVO {
    return new DeviceModelVO(value);
  }

  get ports(): PortDefinitionVO[] {
    return this.value.fixedPorts.map((port) => PortDefinitionVO.from(port));
  }

  get slots(): DeviceSlot[] {
    const slots: DeviceSlot[] = [];
    let cursor = 0;

    for (const slotGroup of this.value.moduleSlots) {
      for (let index = 0; index < slotGroup.count; index += 1) {
        slots.push({
          slotIndex: cursor,
          type: slotGroup.type,
          supportedModules: [...slotGroup.supportedModules],
        });
        cursor += 1;
      }
    }

    return slots;
  }

  supportsModule(code: string): boolean {
    return this.value.capabilities.supportedModules.includes(code) || this.slots.some((slot) => slot.supportedModules.includes(code));
  }

  canInstallModule(code: string, slotIndex?: number): boolean {
    const module = getModuleByCode(code);
    if (!module) return false;
    if (!this.supportsModule(code)) return false;

    if (slotIndex === undefined) return true;

    const slot = this.slots.find((candidate) => candidate.slotIndex === slotIndex);
    if (!slot) return false;

    return slot.supportedModules.includes(code) && slot.type === module.slotType;
  }

  getPortNames(installedModules: InstalledModule[] = []): string[] {
    return this.getPorts(installedModules).flatMap((port) => port.names);
  }

  getPorts(installedModules: InstalledModule[] = []): PortDefinitionVO[] {
    const ports = [...this.ports];
    const activeModules = installedModules.filter((module) => module.enabled !== false);

    for (const installedModule of activeModules) {
      const definition = getModuleByCode(installedModule.code);
      if (!definition) {
        continue;
      }

      const slot = this.slots.find((candidate) => candidate.slotIndex === installedModule.slotIndex);
      if (slot && !slot.supportedModules.includes(installedModule.code)) {
        continue;
      }

      const moduleVO = ModuleDefinitionVO.from(definition);
      ports.push(...moduleVO.getPortsForSlot(installedModule.slotIndex));
    }

    return ports;
  }

  createHardware(installedModules: InstalledModule[] = []): DeviceHardwareProfile {
    return new DeviceHardwareProfile(this, installedModules);
  }

  toJSON(): DeviceCatalogEntry {
    return this.value;
  }

  private assertValid(value: DeviceCatalogEntry): void {
    if (!value.id.trim()) throw new Error('El ID del dispositivo no puede estar vacío');
    if (!value.model.trim()) throw new Error('El modelo del dispositivo no puede estar vacío');
    if (!value.fixedPorts.every((port) => PortDefinitionVO.from(port))) {
      throw new Error(`El dispositivo ${value.model} contiene puertos inválidos`);
    }
  }
}

export class DeviceHardwareProfile {
  readonly model: DeviceModelVO;
  readonly installedModules: InstalledModule[];

  constructor(model: DeviceModelVO, installedModules: InstalledModule[] = []) {
    this.model = model;
    this.installedModules = installedModules;
  }

  get value(): DeviceCatalogEntry {
    return this.model.value;
  }

  static fromCatalogEntry(entry: DeviceCatalogEntry, installedModules: InstalledModule[] = []): DeviceHardwareProfile {
    return new DeviceHardwareProfile(DeviceModelVO.from(entry), installedModules);
  }

  get ports(): PortDefinitionVO[] {
    return this.model.getPorts(this.installedModules);
  }

  get portNames(): string[] {
    return this.ports.flatMap((port) => port.names);
  }

  get portCount(): number {
    return this.ports.reduce((total, port) => total + port.count, 0);
  }

  get fiberPorts(): string[] {
    return this.ports.filter((port) => port.isFiber).flatMap((port) => port.names);
  }

  get copperPorts(): string[] {
    return this.ports.filter((port) => port.isCopper).flatMap((port) => port.names);
  }

  getPort(name: string): PortDefinitionVO | undefined {
    const normalized = name.trim().toLowerCase();
    return this.ports.find((port) => port.names.some((portName) => portName.toLowerCase() === normalized));
  }

  validatePortName(portName: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const parsed = parsePortName(portName);

    if (!parsed.fullName) {
      errors.push(`Nombre de puerto inválido: ${portName}`);
      return { valid: false, errors };
    }

    const port = this.getPort(parsed.fullName);
    if (!port) {
      errors.push(`El puerto ${parsed.fullName} no existe en ${this.model.value.model}`);
      return { valid: false, errors };
    }

    return { valid: true, errors };
  }

  validateModulePlacement(slotIndex: number, code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isInteger(slotIndex) || slotIndex < 0) {
      errors.push(`Slot inválido: ${slotIndex}`);
    }

    const module = getModuleByCode(code);
    if (!module) {
      errors.push(`Módulo no encontrado: ${code}`);
    }

    if (!this.model.canInstallModule(code, slotIndex)) {
      errors.push(`El módulo ${code} no puede instalarse en el slot ${slotIndex} de ${this.model.value.model}`);
    }

    return { valid: errors.length === 0, errors };
  }

  validateLinkEndpoint(portName: string): { valid: boolean; errors: string[] } {
    const errors = this.validatePortName(portName).errors;
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const parsed = parsePortName(portName);
    const port = this.getPort(parsed.fullName);
    if (!port) {
      return { valid: false, errors: [`El puerto ${portName} no está disponible en ${this.model.value.model}`] };
    }

    return { valid: true, errors: [] };
  }

  installModule(slotIndex: number, code: string, enabled = true): DeviceHardwareProfile {
    if (!this.model.canInstallModule(code, slotIndex)) {
      throw new Error(`No se puede instalar el módulo ${code} en el slot ${slotIndex}`);
    }

    const nextModules = this.installedModules.filter((module) => module.slotIndex !== slotIndex);
    nextModules.push({ slotIndex, code, enabled });
    return new DeviceHardwareProfile(this.model, nextModules);
  }

  removeModule(slotIndex: number): DeviceHardwareProfile {
    return new DeviceHardwareProfile(
      this.model,
      this.installedModules.filter((module) => module.slotIndex !== slotIndex),
    );
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const module of this.installedModules) {
      if (!this.model.canInstallModule(module.code, module.slotIndex)) {
        errors.push(`Módulo inválido en slot ${module.slotIndex}: ${module.code}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
