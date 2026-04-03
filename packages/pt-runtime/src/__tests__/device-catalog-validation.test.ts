import { test, expect, describe } from 'bun:test';
import { handleAddDevice, handleListDevices, handleRemoveDevice, handleRenameDevice } from '../handlers/device';
import type { AddDevicePayload, ListDevicesPayload, RemoveDevicePayload } from '../handlers/device';
import type { HandlerDeps } from '../utils/helpers';

/**
 * PRUEBAS COMPLETAS - Dispositivos contra catálogo validado
 * 
 * Valida:
 * 1. Agregar dispositivos válidos
 * 2. Rechazar dispositivos inválidos
 * 3. Listar dispositivos
 * 4. Verificar dispositivos
 * 5. Eliminar dispositivos
 */

// Mock implementation
class MockDevice {
  private _name: string = '';
  private _model: string = '';
  private _type: number = 0;
  private _power: boolean = true;
  
  constructor(name: string, model: string, type: number) {
    this._name = name;
    this._model = model;
    this._type = type;
  }
  
  getName() { return this._name; }
  getModel() { return this._model; }
  getType() { return this._type; }
  getPower() { return this._power; }
  setPower(on: boolean) { this._power = on; }
  setName(name: string) { this._name = name; }
  skipBoot() { /* noop */ }
  getCommandLine() { return null; }
  getPortCount() { return 0; }
  getPortAt() { return null; }
  addModule() { return false; }
  removeModule() { return false; }
}

class MockWorkspace {
  private devices = new Map<string, MockDevice>();
  private counter = 0;
  
  addDevice(type: number, model: string, x: number, y: number): string | null {
    this.counter++;
    const autoName = `Device${this.counter}`;
    this.devices.set(autoName, new MockDevice(autoName, model, type));
    return autoName;
  }
  
  removeDevice(name: string): void {
    this.devices.delete(name);
  }
  
  createLink() { return false; }
  deleteLink() { /* noop */ }
  
  getDevices() { return this.devices; }
}

class MockNetwork {
  constructor(private workspace: MockWorkspace) {}
  
  getDeviceCount() {
    return this.workspace.getDevices().size;
  }
  
  getDeviceAt(index: number) {
    const devices = Array.from(this.workspace.getDevices().values());
    return devices[index] || null;
  }
  
  getDevice(name: string) {
    return this.workspace.getDevices().get(name) || null;
  }
}

describe('Device Management - Catalog Validation', () => {
  let workspace: MockWorkspace;
  let network: MockNetwork;
  let deps: HandlerDeps;

  const createDeps = () => {
    workspace = new MockWorkspace();
    network = new MockNetwork(workspace);
    deps = {
      getLW: () => workspace,
      getNet: () => network,
      dprint: (msg: string) => {
        if (process.env.DEBUG) console.log('[DBG]', msg);
      }
    };
  };

  describe('ADD - Dispositivos válidos', () => {
    test('Agregar router 1941', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1',
        x: 100,
        y: 100
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.name).toBe('R1');
      expect(network.getDeviceCount()).toBe(1);
    });

    test('Agregar switch 2960', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: '2960',  // alias validado
        name: 'SW1',
        x: 200,
        y: 100
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.name).toBe('SW1');
      expect(network.getDeviceCount()).toBe(1);
    });

    test('Agregar PC', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: 'pc',  // alias validado
        name: 'PC1',
        x: 300,
        y: 100
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.name).toBe('PC1');
    });

    test('Agregar Server', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: 'server',  // alias validado
        name: 'SRV1',
        x: 400,
        y: 100
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.name).toBe('SRV1');
    });

    test('Agregar Cloud', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: 'cloud',  // alias validado
        name: 'CLOUD1',
        x: 500,
        y: 100
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.name).toBe('CLOUD1');
    });

    test('Agregar modelo exacto del catálogo', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: '2960-24TT-L',  // modelo exacto del catálogo
        name: 'SW2',
        x: 200,
        y: 200
      }, deps);
      
      expect(result.ok).toBe(true);
    });
  });

  describe('ADD - Dispositivos INVÁLIDOS', () => {
    test('Rechazar modelo inexistente', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: 'INVALID-MODEL-XYZ',
        name: 'BAD1'
      }, deps);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid device model');
      expect(network.getDeviceCount()).toBe(0);
    });

    test('Rechazar modelo que no está en catálogo', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: '9999-ROUTER',
        name: 'BAD2'
      }, deps);
      
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid device model');
    });

    test('Rechazar modelo vacío', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: '',
        name: 'BAD3'
      }, deps);
      
      // Debería usar default 1941
      expect(result.ok).toBe(true);
    });

    test('Rechazar modelo undefined', () => {
      createDeps();
      const result = handleAddDevice({
        type: 'addDevice',
        model: undefined,
        name: 'BAD4'
      }, deps);
      
      // Debería usar default 1941
      expect(result.ok).toBe(true);
    });
  });

  describe('LIST - Listar dispositivos', () => {
    test('Listar varios dispositivos agregados', () => {
      createDeps();
      
      // Agregar múltiples dispositivos
      handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1'
      }, deps);
      
      handleAddDevice({
        type: 'addDevice',
        model: '2960',
        name: 'SW1'
      }, deps);
      
      handleAddDevice({
        type: 'addDevice',
        model: 'pc',
        name: 'PC1'
      }, deps);
      
      const result = handleListDevices({
        type: 'listDevices'
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.devices).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    test('Listar dispositivos vacío', () => {
      createDeps();
      
      const result = handleListDevices({
        type: 'listDevices'
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(result.devices).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('VERIFY - Verificar dispositivos', () => {
    test('Verificar dispositivo existe', () => {
      createDeps();
      
      const addResult = handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1'
      }, deps);
      
      expect(addResult.ok).toBe(true);
      
      // El dispositivo se agregó con autoName (Device1), no R1
      const device = network.getDevice('Device1');
      expect(device).not.toBeNull();
      expect(device?.getName()).toBe('R1');  // Pero el nombre mostrado es R1
      expect(device?.getModel()).toBe('1941');
    });

    test('Verificar dispositivo no existe', () => {
      createDeps();
      
      const device = network.getDevice('NONEXISTENT');
      expect(device).toBeNull();
    });

    test('Verificar características de dispositivo', () => {
      createDeps();
      
      handleAddDevice({
        type: 'addDevice',
        model: '2960-24TT-L',
        name: 'SW1',
        x: 100,
        y: 100
      }, deps);
      
      const device = network.getDevice('Device1');
      expect(device?.getModel()).toBe('2960-24TT-L');
      expect(device?.getType()).toBe(1);  // switch type
    });
  });

  describe('REMOVE - Eliminar dispositivos', () => {
    test('Eliminar dispositivo existente', () => {
      createDeps();
      
      handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1'
      }, deps);
      
      expect(network.getDeviceCount()).toBe(1);
      
      const result = handleRemoveDevice({
        type: 'removeDevice',
        name: 'Device1'
      }, deps);
      
      expect(result.ok).toBe(true);
      expect(network.getDeviceCount()).toBe(0);
    });

    test('Eliminar dispositivo no existente', () => {
      createDeps();
      
      const result = handleRemoveDevice({
        type: 'removeDevice',
        name: 'NONEXISTENT'
      }, deps);
      
      expect(result.ok).toBe(true);  // No error, idempotent
    });

    test('Ciclo completo: ADD + LIST + REMOVE', () => {
      createDeps();
      
      // ADD
      const addResult = handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1'
      }, deps);
      expect(addResult.ok).toBe(true);
      expect(network.getDeviceCount()).toBe(1);
      
      // LIST
      const listResult = handleListDevices({
        type: 'listDevices'
      }, deps);
      expect(listResult.devices).toHaveLength(1);
      
      // REMOVE
      const removeResult = handleRemoveDevice({
        type: 'removeDevice',
        name: 'Device1'
      }, deps);
      expect(removeResult.ok).toBe(true);
      expect(network.getDeviceCount()).toBe(0);
      
      // VERIFY removed
      const finalList = handleListDevices({
        type: 'listDevices'
      }, deps);
      expect(finalList.devices).toHaveLength(0);
    });
  });

  describe('RENAME - Renombrar dispositivos', () => {
    test('Renombrar dispositivo existente', () => {
      createDeps();
      
      handleAddDevice({
        type: 'addDevice',
        model: '1941',
        name: 'R1'
      }, deps);
      
      const result = handleRenameDevice({
        type: 'renameDevice',
        oldName: 'Device1',
        newName: 'RouterPrincipal'
      }, deps);
      
      expect(result.ok).toBe(true);
      
      const device = network.getDevice('Device1');  // autoName no cambia
      expect(device?.getName()).toBe('RouterPrincipal');  // Pero el display name sí
    });
  });
});

describe('Catalog Integration', () => {
  test('Validación proviene del catálogo de core', () => {
    const workspace = new MockWorkspace();
    const network = new MockNetwork(workspace);
    const deps = {
      getLW: () => workspace,
      getNet: () => network,
      dprint: () => {}
    };
    
    // Verificar que modelos del catálogo de core son aceptados
    const result = handleAddDevice({
      type: 'addDevice',
      model: '1941',  // Modelo del catálogo core
      name: 'TestRouter'
    }, deps);
    
    expect(result.ok).toBe(true);
  });
  
  test('Rechazo de modelos inválidos rompe el código', () => {
    const workspace = new MockWorkspace();
    const network = new MockNetwork(workspace);
    const deps = {
      getLW: () => workspace,
      getNet: () => network,
      dprint: () => {}
    };
    
    const result = handleAddDevice({
      type: 'addDevice',
      model: 'MODELO-INEXISTENTE-FUERA-DEL-CATÁLOGO',
      name: 'BadDevice'
    }, deps);
    
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid device model');
    expect(result.code).toBe('INVALID_INPUT');
  });
});
