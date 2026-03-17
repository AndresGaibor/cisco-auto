/**
 * BaseDevice.ts
 * Clase abstracta que envuelve el nodo XML de un dispositivo individual.
 */

export abstract class BaseDevice {
  protected deviceNode: any;
  protected engineNode: any;

  constructor(deviceNode: any) {
    this.deviceNode = deviceNode;
    this.engineNode = deviceNode.ENGINE;
    
    if (!this.engineNode) {
      throw new Error("Estructura de dispositivo inválida: no se encontró el nodo ENGINE");
    }
  }

  public getName(): string {
    const nameNode = this.engineNode.NAME;
    return typeof nameNode === 'object' ? nameNode['#text'] : nameNode;
  }

  public setName(newName: string): void {
    if (typeof this.engineNode.NAME === 'object') {
      this.engineNode.NAME['#text'] = newName;
    } else {
      this.engineNode.NAME = newName;
    }
  }

  public getRefId(): string {
    return this.engineNode.SAVE_REF_ID || '';
  }

  public getType(): string {
    const typeNode = this.engineNode.TYPE;
    return typeof typeNode === 'object' ? typeNode['#text'] : typeNode;
  }

  public getModel(): string {
    const typeNode = this.engineNode.TYPE;
    return typeof typeNode === 'object' ? (typeNode['@_model'] || '') : '';
  }

  // --- MÉTODOS PARA RUNNINGCONFIG ---

  /**
   * Obtiene la configuración actual como un array de strings
   */
  public getRunningConfig(): string[] {
    if (!this.engineNode.RUNNINGCONFIG || !this.engineNode.RUNNINGCONFIG.LINE) return [];
    return Array.isArray(this.engineNode.RUNNINGCONFIG.LINE) 
      ? this.engineNode.RUNNINGCONFIG.LINE 
      : [this.engineNode.RUNNINGCONFIG.LINE];
  }

  /**
   * Reemplaza la configuración completa
   */
  public setRunningConfig(lines: string[]): void {
    if (!this.engineNode.RUNNINGCONFIG) this.engineNode.RUNNINGCONFIG = {};
    this.engineNode.RUNNINGCONFIG.LINE = lines;
  }

  /**
   * Añade una línea al final de la configuración (antes del 'end')
   */
  public appendRunningConfig(command: string): void {
    const config = this.getRunningConfig();
    const endIndex = config.lastIndexOf('end');
    
    if (endIndex !== -1) {
      config.splice(endIndex, 0, command);
    } else {
      config.push(command);
    }
    this.setRunningConfig(config);
  }

  /**
   * Inserta comandos dentro de un bloque específico (ej. "interface FastEthernet0/1")
   * Si el bloque no existe, lo crea.
   */
  public insertIntoConfigBlock(blockStart: string, commands: string[]): void {
    const config = this.getRunningConfig();
    const startIndex = config.findIndex((line: string) => line.trim() === blockStart);
    
    if (startIndex !== -1) {
      // Insertamos los comandos justo después de la declaración del bloque
      // Formateados con un espacio inicial como es el estándar IOS
      const formattedCommands = commands.map(c => ` ${c.trim()}`);
      config.splice(startIndex + 1, 0, ...formattedCommands);
      this.setRunningConfig(config);
    } else {
      // Si el bloque no existe, lo creamos al final
      const formattedCommands = commands.map(c => ` ${c.trim()}`);
      const newBlock = [blockStart, ...formattedCommands, '!'];
      
      const endIndex = config.lastIndexOf('end');
      if (endIndex !== -1) {
        config.splice(endIndex, 0, ...newBlock);
      } else {
        config.push(...newBlock);
      }
      this.setRunningConfig(config);
    }
  }

  // --- MÉTODOS PARA NAVEGACIÓN EN XML ---
  
  /**
   * Busca recursivamente un puerto de red en la estructura física del dispositivo
   */
  protected findNetworkPort(node: any, matchFn: (port: any) => boolean): any {
    if (!node) return null;

    if (node.PORT) {
      const ports = Array.isArray(node.PORT) ? node.PORT : [node.PORT];
      const found = ports.find(matchFn);
      if (found) return found;
    }

    if (node.SLOT) {
      const slots = Array.isArray(node.SLOT) ? node.SLOT : [node.SLOT];
      for (const slot of slots) {
        const found = this.findNetworkPort(slot.MODULE, matchFn);
        if (found) return found;
      }
    }
    return null;
  }
}
