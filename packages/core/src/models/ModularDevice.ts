import { BaseDevice } from './BaseDevice.ts';
import { createModuleNode } from './ModuleTemplates.ts';

/**
 * Mixin o Extensión para dispositivos con slots (Routers y Switches)
 */
export abstract class ModularDevice extends BaseDevice {
  
  /**
   * Lista todos los slots disponibles y su contenido actual
   */
  public getSlots(): any[] {
    const slotsNode = this.engineNode.MODULE?.SLOT;
    if (!slotsNode) return [];
    return Array.isArray(slotsNode) ? slotsNode : [slotsNode];
  }

  /**
   * Añade un módulo a un slot específico (por índice)
   */
  public addModule(slotIndex: number, moduleTemplate: any): void {
    const slots = this.getSlots();
    if (slotIndex < 0 || slotIndex >= slots.length) {
      throw new Error(`Índice de slot ${slotIndex} fuera de rango para ${this.getName()}`);
    }

    slots[slotIndex].MODULE = createModuleNode(moduleTemplate);
    console.log(`   [${this.getName()}] Módulo ${moduleTemplate.MODEL} añadido al slot ${slotIndex}`);
  }

  /**
   * Quita un módulo de un slot
   */
  public removeModule(slotIndex: number): void {
    const slots = this.getSlots();
    if (slots[slotIndex]) {
      slots[slotIndex].MODULE = {};
      console.log(`   [${this.getName()}] Slot ${slotIndex} vaciado.`);
    }
  }
}
