// Catálogo de comandos de device/link
// Gestión de dispositivos, enlaces y topología

import type { CommandCatalogEntry } from '../command-catalog-types.js';

export const DEVICE_LINK_COMMANDS: Record<string, CommandCatalogEntry> = {

  device: {
    id: 'device',
    summary: 'Gestión de dispositivos en Packet Tracer',
    longDescription: 'Permite agregar, listar, mover y eliminar dispositivos del laboratorio. Cada dispositivo se identifica por un nombre único y tipo.',
    examples: ['pt device list', 'pt device add R1 2911', 'pt device remove R1'],
    related: ['show', 'link', 'config-host'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesTopology: true,
    requiresPostValidation: true,
    postValidationKind: 'device-add',
    notes: [
      'device list es stable',
      'device add/remove/move son parciales',
      'device get para obtener info de dispositivo',
    ],
  },

  link: {
    id: 'link',
    summary: 'Gestión de enlaces entre dispositivos',
    longDescription: 'Agrega, lista y elimina conexiones físicas entre dispositivos.',
    examples: ['pt link add R1 Gi0/0 S1 Fa0/1', 'pt link list', 'pt link remove R1 Gi0/0'],
    related: ['device', 'topology'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesTopology: true,
    requiresPostValidation: true,
    postValidationKind: 'link-add',
  },

  router: {
    id: 'router',
    summary: 'Gestión de routers Cisco',
    longDescription: 'Comandos específicos para gestionar routers Cisco en Packet Tracer.',
    examples: ['pt router add R1 2911', 'pt router add R1 2911 -x 200 -y 300'],
    related: ['device add', 'device list'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesTopology: true,
    requiresPostValidation: true,
    postValidationKind: 'device-add',
    notes: ['router add funciona bien con modo interactivo'],
  },

  'topology-show': {
    id: 'topology-show',
    summary: 'Mostrar topología descubierta',
    longDescription: 'Muestra las conexiones entre dispositivos descubiertas via CDP.',
    examples: ['pt topology show'],
    related: ['topology', 'show cdp neighbors'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  topology: {
    id: 'topology',
    summary: 'Análisis y visualización de topología',
    longDescription: 'Herramientas para analizar, visualizar y gestionar topologías de red.',
    examples: ['pt topology analyze', 'pt topology visualize', 'pt topology export'],
    related: ['link', 'device list'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
  },

};