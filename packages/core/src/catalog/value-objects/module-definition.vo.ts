import type { ModuleDefinition } from '../schema';
import { PortDefinitionVO } from './port-definition.vo';

const VALID_SLOT_TYPES = new Set(['hwic', 'wic', 'nme', 'sm', 'nm', 'pvdm']);

export class ModuleDefinitionVO {
  readonly value: ModuleDefinition;

  constructor(value: ModuleDefinition) {
    this.assertValid(value);
    this.value = value;
  }

  static from(value: ModuleDefinition): ModuleDefinitionVO {
    return new ModuleDefinitionVO(value);
  }

  get ports(): PortDefinitionVO[] {
    return this.value.ports.map((port) => PortDefinitionVO.from(port));
  }

  getPortsForSlot(slotIndex: number): PortDefinitionVO[] {
    return this.value.ports.map((port) =>
      PortDefinitionVO.from({
        ...port,
        module: slotIndex + 1,
      })
    );
  }

  get portNames(): string[] {
    return this.ports.flatMap((port) => port.names);
  }

  get portCount(): number {
    return this.ports.reduce((total, port) => total + port.count, 0);
  }

  toJSON(): ModuleDefinition {
    return this.value;
  }

  private assertValid(value: ModuleDefinition): void {
    if (!value.code.trim()) throw new Error('El código del módulo no puede estar vacío');
    if (!value.name.trim()) throw new Error('El nombre del módulo no puede estar vacío');
    if (!VALID_SLOT_TYPES.has(value.slotType)) throw new Error(`Tipo de slot inválido: ${value.slotType}`);
    value.ports.forEach((port) => PortDefinitionVO.from(port));
  }
}
