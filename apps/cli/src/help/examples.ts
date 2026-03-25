/**
 * Base de ejemplos para comandos CLI
 * Contiene ejemplos prácticos para cada comando
 */

export interface CommandExample {
  description: string;
  command: string;
}

export const commandExamples: Record<string, CommandExample[]> = {
  'lab': [
    {
      description: 'Parsear un archivo YAML de laboratorio',
      command: 'cisco-auto lab parse labs/vlan-basico.yaml',
    },
    {
      description: 'Validar topología sin ejecutar',
      command: 'cisco-auto lab validate labs/vlan-basico.yaml --dry-run',
    },
  ],
  'lab create': [
    {
      description: 'Crear laboratorio básico con VLANs',
      command: 'cisco-auto lab create --template vlan labs/vlan-lab',
    },
    {
      description: 'Crear laboratorio con routing OSPF',
      command: 'cisco-auto lab create --template routing labs/ospf-lab --area 1',
    },
    {
      description: 'Crear laboratorio desde archivo existente',
      command: 'cisco-auto lab create labs/existing.yaml --output new-lab',
    },
  ],
  'lab parse': [
    {
      description: 'Parsear y mostrar configuración',
      command: 'cisco-auto lab parse labs/vlan-basico.yaml',
    },
    {
      description: 'Parsear en formato JSON',
      command: 'cisco-auto lab parse labs/vlan-basico.yaml --json',
    },
    {
      description: 'Parsear con salida verbose',
      command: 'cisco-auto lab parse labs/vlan-basico.yaml --verbose',
    },
  ],
  'lab validate': [
    {
      description: 'Validar laboratorio completo',
      command: 'cisco-auto lab validate labs/vlan-basico.yaml',
    },
    {
      description: 'Validar en modo dry-run',
      command: 'cisco-auto lab validate labs/vlan-basico.yaml --dry-run',
    },
  ],
  'device': [
    {
      description: 'Listar todos los dispositivos',
      command: 'cisco-auto device list',
    },
    {
      description: 'Listar dispositivos en formato JSON',
      command: 'cisco-auto device list --json',
    },
    {
      description: 'Filtrar por tipo de dispositivo',
      command: 'cisco-auto device list --type switch',
    },
  ],
  'device list': [
    {
      description: 'Listar dispositivos del laboratorio',
      command: 'cisco-auto device list labs/vlan-basico.yaml',
    },
    {
      description: 'Listar con salida en tabla',
      command: 'cisco-auto device list labs/vlan-basico.yaml --output table',
    },
  ],
  'device info': [
    {
      description: 'Obtener información de un dispositivo',
      command: 'cisco-auto device info SW-CORE',
    },
    {
      description: 'Obtener información detallada en JSON',
      command: 'cisco-auto device info SW-CORE --json',
    },
  ],
  'device config': [
    {
      description: 'Generar configuración para dispositivo',
      command: 'cisco-auto device config SW-CORE labs/vlan-basico.yaml',
    },
    {
      description: 'Generar configuración en modo dry-run',
      command: 'cisco-auto device config SW-CORE labs/vlan-basico.yaml --dry-run',
    },
  ],
  'topology': [
    {
      description: 'Analizar topología actual',
      command: 'cisco-auto topology analyze labs/vlan-basico.yaml',
    },
    {
      description: 'Visualizar topología',
      command: 'cisco-auto topology visualize labs/vlan-basico.yaml',
    },
  ],
  'topology analyze': [
    {
      description: 'Analizar topología y mostrar resumen',
      command: 'cisco-auto topology analyze labs/vlan-basico.yaml',
    },
    {
      description: 'Analizar con detalles de VLANs',
      command: 'cisco-auto topology analyze labs/vlan-basico.yaml --vlans',
    },
    {
      description: 'Analizar rutas disponibles',
      command: 'cisco-auto topology analyze labs/vlan-basico.yaml --routes',
    },
  ],
  'topology visualize': [
    {
      description: 'Generar visualización ASCII',
      command: 'cisco-auto topology visualize labs/vlan-basico.yaml',
    },
    {
      description: 'Generar visualización en archivo',
      command: 'cisco-auto topology visualize labs/vlan-basico.yaml --output topology.txt',
    },
  ],
  'config': [
    {
      description: 'Ver configuración actual',
      command: 'cisco-auto config get',
    },
    {
      description: 'Establecer valor de configuración',
      command: 'cisco-auto config set defaultRouter 2911',
    },
    {
      description: 'Listar todas las configuraciones',
      command: 'cisco-auto config list',
    },
  ],
  'bridge': [
    {
      description: 'Iniciar bridge HTTP',
      command: 'cisco-auto bridge start',
    },
    {
      description: 'Ver estado del bridge',
      command: 'cisco-auto bridge status',
    },
    {
      description: 'Detener bridge',
      command: 'cisco-auto bridge stop',
    },
  ],
};

/**
 * Obtiene ejemplos para un comando específico
 */
export function getExamples(commandPath: string): CommandExample[] {
  return commandExamples[commandPath] || [];
}

/**
 * Obtiene ejemplos para un comando padre y sus subcomandos
 */
export function getExamplesForCommand(commandPath: string): CommandExample[] {
  const direct = commandExamples[commandPath];
  if (direct) return direct;

  const parent = commandPath.split(' ')[0];
  return commandExamples[parent] || [];
}
