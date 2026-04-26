/**
 * Comandos relacionados para la sección "See also"
 */

import type { RelatedCommand } from './command-metadata.js';

export const relatedCommands: Record<string, RelatedCommand[]> = {
  'lab': [
    { name: 'cisco-auto device', description: 'Gestionar dispositivos' },
    { name: 'cisco-auto topology', description: 'Analizar topología' },
    { name: 'cisco-auto config', description: 'Configuración global' },
    { name: 'cisco-auto lab lift', description: 'Levantar el laboratorio completo' },
  ],
  'lab create': [
    { name: 'cisco-auto lab parse', description: 'Parsear laboratorio' },
    { name: 'cisco-auto lab validate', description: 'Validar laboratorio' },
    { name: 'cisco-auto device list', description: 'Listar dispositivos' },
  ],
  'lab parse': [
    { name: 'cisco-auto lab validate', description: 'Validar topología' },
    { name: 'cisco-auto lab create', description: 'Crear laboratorio' },
    { name: 'cisco-auto topology analyze', description: 'Analizar topología' },
  ],
  'lab validate': [
    { name: 'cisco-auto lab parse', description: 'Parsear laboratorio' },
    { name: 'cisco-auto lab create', description: 'Crear laboratorio' },
    { name: 'cisco-auto topology analyze', description: 'Analizar topología' },
  ],
  'lab lift': [
    { name: 'cisco-auto status', description: 'Verificar estado del entorno' },
    { name: 'cisco-auto lab validate', description: 'Validar laboratorio' },
    { name: 'cisco-auto device list', description: 'Listar dispositivos' },
  ],
  'device': [
    { name: 'cisco-auto lab', description: 'Gestionar laboratorios' },
    { name: 'cisco-auto topology', description: 'Analizar topología' },
    { name: 'cisco-auto config', description: 'Configuración global' },
  ],
  'device list': [
    { name: 'cisco-auto device info', description: 'Info de dispositivo' },
    { name: 'cisco-auto device config', description: 'Generar config' },
    { name: 'cisco-auto lab parse', description: 'Parsear laboratorio' },
  ],
  'device info': [
    { name: 'cisco-auto device list', description: 'Listar dispositivos' },
    { name: 'cisco-auto device config', description: 'Generar config' },
    { name: 'cisco-auto topology analyze', description: 'Analizar topología' },
  ],
  'device config': [
    { name: 'cisco-auto device info', description: 'Info de dispositivo' },
    { name: 'cisco-auto lab parse', description: 'Parsear laboratorio' },
    { name: 'cisco-auto deploy', description: 'Desplegar configuración' },
  ],
  'topology': [
    { name: 'cisco-auto lab', description: 'Gestionar laboratorios' },
    { name: 'cisco-auto device', description: 'Gestionar dispositivos' },
    { name: 'cisco-auto config', description: 'Configuración global' },
  ],
  'topology analyze': [
    { name: 'cisco-auto topology visualize', description: 'Visualizar topología' },
    { name: 'cisco-auto lab validate', description: 'Validar laboratorio' },
    { name: 'cisco-auto device list', description: 'Listar dispositivos' },
  ],
  'topology visualize': [
    { name: 'cisco-auto topology analyze', description: 'Analizar topología' },
    { name: 'cisco-auto lab parse', description: 'Parsear laboratorio' },
    { name: 'cisco-auto device list', description: 'Listar dispositivos' },
  ],
  'config': [
    { name: 'cisco-auto lab', description: 'Gestionar laboratorios' },
    { name: 'cisco-auto device', description: 'Gestionar dispositivos' },
    { name: 'cisco-auto bridge', description: 'Bridge HTTP' },
  ],
  'config get': [
    { name: 'cisco-auto config set', description: 'Establecer config' },
    { name: 'cisco-auto config list', description: 'Listar configs' },
    { name: 'cisco-auto config edit', description: 'Editar config' },
  ],
  'config set': [
    { name: 'cisco-auto config get', description: 'Ver config' },
    { name: 'cisco-auto config list', description: 'Listar configs' },
    { name: 'cisco-auto config reset', description: 'Resetear config' },
  ],
  'bridge': [
    { name: 'cisco-auto config', description: 'Configuración global' },
    { name: 'cisco-auto device', description: 'Gestionar dispositivos' },
  ],
  'bridge start': [
    { name: 'cisco-auto bridge status', description: 'Ver estado' },
    { name: 'cisco-auto bridge stop', description: 'Detener bridge' },
  ],
  'bridge status': [
    { name: 'cisco-auto bridge start', description: 'Iniciar bridge' },
    { name: 'cisco-auto bridge stop', description: 'Detener bridge' },
  ],
};

export function getRelatedCommands(commandPath: string): RelatedCommand[] {
  return relatedCommands[commandPath] || [];
}

export function getRelatedForCommand(commandPath: string): RelatedCommand[] {
  const direct = relatedCommands[commandPath];
  if (direct) return direct;

  const parts = commandPath.split(' ');
  const parent = parts[0] || '';
  return relatedCommands[parent] || [];
}
