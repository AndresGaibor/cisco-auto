import type { PortDefinition } from '../schema';

const VALID_CONNECTORS = new Set(['console', 'rj45', 'sfp', 'sfp+', 'serial', 'usb']);

export class PortDefinitionVO {
  readonly value: PortDefinition;

  constructor(value: PortDefinition) {
    this.assertValid(value);
    this.value = value;
  }

  static from(value: PortDefinition): PortDefinitionVO {
    return new PortDefinitionVO(value);
  }

  get names(): string[] {
    const { prefix, module, range } = this.value;
    const [start, end] = range;
    const names: string[] = [];

    for (let index = start; index <= end; index += 1) {
      names.push(`${prefix}${module}/${index}`);
    }

    return names;
  }

  get count(): number {
    const [start, end] = this.value.range;
    return end - start + 1;
  }

  get isFiber(): boolean {
    return this.value.supportsFiber === true || this.value.connector === 'sfp' || this.value.connector === 'sfp+';
  }

  get isCopper(): boolean {
    return this.value.supportsCopper === true || this.value.connector === 'rj45';
  }

  get isConsole(): boolean {
    return this.value.connector === 'console';
  }

  toJSON(): PortDefinition {
    return this.value;
  }

  equals(other: PortDefinitionVO): boolean {
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  private assertValid(value: PortDefinition): void {
    if (!value.type.trim()) throw new Error('El tipo de puerto no puede estar vacío');
    if (!value.prefix.trim()) throw new Error('El prefijo del puerto no puede estar vacío');
    if (!Number.isInteger(value.module) || value.module < 0) throw new Error('El módulo del puerto debe ser un entero mayor o igual a 0');
    if (!Number.isInteger(value.range[0]) || !Number.isInteger(value.range[1])) throw new Error('El rango del puerto debe usar enteros');
    if (value.range[1] < value.range[0]) throw new Error('El rango del puerto es inválido');
    if (!Number.isFinite(value.speed) || value.speed < 0) throw new Error('La velocidad del puerto debe ser un número válido');
    if (!VALID_CONNECTORS.has(value.connector)) throw new Error(`Conector de puerto inválido: ${value.connector}`);
  }
}
