#!/usr/bin/env bun

/**
 * Catálogo de metadata mínima por comando raíz.
 * Fuente de verdad para madurez y capacidades de cada comando.
 * Alimenta help, skill, y políticas de autonomía para agentes.
 *
 * NOTA: Basado en los comandos realmente registrados en apps/pt-cli/src/index.ts
 */

export interface CommandCatalogEntry {
  id: string;
  summary: string;
  longDescription?: string;
  examples?: string[];
  related?: string[];
  status: 'stable' | 'partial' | 'experimental';
  requiresPT: boolean;
  requiresContext: boolean;
  supportsAutonomousUse: boolean;
  supportsJson?: boolean;
  supportsPlan?: boolean;
  supportsExplain?: boolean;
  supportsVerify?: boolean;
  writesTopology?: boolean;
  writesIOS?: boolean;
  requiresPostValidation?: boolean;
  postValidationKind?: 'device-add' | 'device-remove' | 'device-move' | 'link-add' | 'link-remove' | 'none';
  notes?: string[];
}

export const COMMAND_CATALOG: Record<string, CommandCatalogEntry> = {

  build: {
    id: 'build',
    summary: 'Build y deploy de archivos a ~/pt-dev/',
    longDescription: 'Compila y despliega los archivos JavaScript a ~/pt-dev/ para ser cargados en Packet Tracer.',
    examples: ['pt build'],
    related: ['doctor', 'logs'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  setup: {
    id: 'setup',
    summary: 'Preparación del entorno local de Packet Tracer',
    longDescription: 'Ejecuta el flujo mínimo de instalación local para generar y desplegar los artefactos del runtime.',
    examples: ['pt setup'],
    related: ['build', 'status'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Alias operativo para el bootstrap local de pt-dev'],
  },

  runtime: {
    id: 'runtime',
    summary: 'Operaciones del runtime de Packet Tracer',
    longDescription: 'Lista snapshots locales del runtime y permite rollback a una release anterior.',
    examples: ['pt runtime releases', 'pt runtime rollback --last'],
    related: ['build', 'setup', 'status'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Solo gestiona snapshots locales y artefactos de despliegue'],
  },

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

  show: {
    id: 'show',
    summary: 'Ejecuta comandos show en dispositivos',
    longDescription: 'Ejecuta comandos show en dispositivos para obtener información sobre la configuración y estado.',
    examples: ['pt show ip-int-brief R1', 'pt show vlan Switch1', 'pt show ip-route R1'],
    related: ['config-ios', 'device get'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
  },

  'config-host': {
    id: 'config-host',
    summary: 'Configura la dirección IP de un dispositivo',
    longDescription: 'Configura la dirección IP, máscara de subred y gateway en la interfaz primaria de un dispositivo.',
    examples: ['pt config-host R1 --ip 192.168.1.1 --mask 255.255.255.0'],
    related: ['config-ios', 'show'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  vlan: {
    id: 'vlan',
    summary: 'Gestión de VLANs en switches',
    longDescription: 'Crea, elimina y configura VLANs en switches Cisco.',
    examples: ['pt vlan apply Switch1 10 20 30', 'pt vlan create 10 ADMIN'],
    related: ['show vlan', 'config-ios'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  etherchannel: {
    id: 'etherchannel',
    summary: 'Configuración de EtherChannel',
    longDescription: 'Agrupa múltiples interfaces físicas en canales lógicos.',
    examples: ['pt etherchannel create Switch1 1 Gi0/1 Gi0/2', 'pt etherchannel list'],
    related: ['stp', 'vlan'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
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

  'config-ios': {
    id: 'config-ios',
    summary: 'Ejecuta comandos de configuración IOS',
    longDescription: 'Envía comandos de configuración IOS a un dispositivo. Soporta configuración de interfaces, VLANs, routing, ACLs, etc.',
    examples: ['pt config-ios R1 interface GigabitEthernet0/0 ip address 192.168.1.1 255.255.255.0'],
    related: ['config-host', 'show'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
    notes: ['No confiar ciegamente en "ok" sin verificación adicional'],
  },

  routing: {
    id: 'routing',
    summary: 'Configuración de protocolos de routing',
    longDescription: 'Configura protocolos de routing como OSPF, EIGRP, static.',
    examples: ['pt routing ospf enable R1', 'pt routing static add 0.0.0.0 0.0.0.0 192.168.1.1'],
    related: ['show ip-route', 'config-ios'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  acl: {
    id: 'acl',
    summary: 'Configuración de Access Control Lists',
    longDescription: 'Crea y aplica ACLs para filtrar tráfico.',
    examples: ['pt acl create 100 permit tcp any any eq 80', 'pt acl apply ACL-100 R1'],
    related: ['config-ios', 'show'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  stp: {
    id: 'stp',
    summary: 'Configuración de Spanning Tree Protocol',
    longDescription: 'Configura STP en switches para evitar bucles de capa 2.',
    examples: ['pt stp set Switch1 mode rapid-pvst', 'pt stp set Switch1 priority 4096'],
    related: ['vlan', 'etherchannel'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  services: {
    id: 'services',
    summary: 'Servicios de red en Packet Tracer',
    longDescription: 'Configura servicios como DHCP, DNS, HTTP, etc.',
    examples: ['pt services dhcp Switch1', 'pt services dns add 8.8.8.8'],
    related: ['config-ios', 'device'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    requiresPostValidation: true,
  },

  results: {
    id: 'results',
    summary: 'Visor de resultados de comandos',
    longDescription: 'Muestra los resultados almacenados de comandos ejecutados.',
    examples: ['pt results list', 'pt results show <id>', 'pt results last'],
    related: ['logs', 'history'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  logs: {
    id: 'logs',
    summary: 'Visor de logs y trazas de debugging',
    longDescription: 'Inspecciona los logs de ejecución, errores y traces de comandos.',
    examples: ['pt logs tail', 'pt logs session <id>', 'pt logs errors'],
    related: ['history', 'doctor', 'results'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  help: {
    id: 'help',
    summary: 'Ayuda enriquecida para comandos',
    longDescription: 'Muestra ayuda enriquecida para comandos con ejemplos y comandos relacionados.',
    examples: ['pt help', 'pt help device', 'pt help link add'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  history: {
    id: 'history',
    summary: 'Historial de ejecuciones de comandos',
    longDescription: 'Lista y muestra detalles de ejecuciones anteriores.',
    examples: ['pt history list', 'pt history show <id>', 'pt history last'],
    related: ['logs', 'doctor', 'results'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
    notes: [
      'history list/show/last son stable',
      'history rerun es experimental — requiere implementación adicional',
    ],
  },

  doctor: {
    id: 'doctor',
    summary: 'Diagnóstico del sistema PT',
    longDescription: 'Ejecuta verificaciones del sistema para diagnosticar problemas.',
    examples: ['pt doctor', 'pt doctor --verbose'],
    related: ['logs', 'history', 'completion'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  completion: {
    id: 'completion',
    summary: 'Scripts de completion para shell',
    longDescription: 'Genera scripts de autocompletado para bash, zsh, y fish.',
    examples: ['pt completion bash', 'pt completion zsh', 'pt completion fish'],
    related: ['doctor', 'help'],
    status: 'experimental',
    supportsAutonomousUse: false,
    requiresPT: false,
    requiresContext: false,
    notes: ['Desactualizado — no refleja todos los comandos actuales'],
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

  status: {
    id: 'status',
    summary: 'Muestra el estado actual del contexto y Packet Tracer',
    longDescription: 'Muestra un resumen del contexto actual, dispositivos, enlaces y estado de Packet Tracer.',
    examples: ['pt status', 'pt status --verbose'],
    related: ['doctor', 'topology'],
    status: 'stable',
    supportsAutonomousUse: true,
    requiresPT: true,
    requiresContext: true,
  },

  'config-ospf': {
    id: 'config-ospf',
    summary: 'Configurar enrutamiento OSPF',
    longDescription: 'Configura OSPF con process-id, networks y passive-interfaces desde CLI o archivo YAML.',
    examples: ['pt config ospf --device R1 --process-id 1 --network "192.168.1.0,0.0.0.255,0" --dry-run'],
    related: ['config eigrp', 'config bgp', 'show ip route'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-eigrp': {
    id: 'config-eigrp',
    summary: 'Configurar enrutamiento EIGRP',
    longDescription: 'Configura EIGRP con autonomous system, networks y passive-interfaces.',
    examples: ['pt config eigrp --device R1 --as 100 --network "192.168.1.0,0.0.0.255" --dry-run'],
    related: ['config ospf', 'config bgp', 'show ip route'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-bgp': {
    id: 'config-bgp',
    summary: 'Configurar enrutamiento BGP',
    longDescription: 'Configura BGP con autonomous system, neighbors y networks.',
    examples: ['pt config bgp --device R1 --as 65000 --neighbor "10.0.0.2,65001" --dry-run'],
    related: ['config ospf', 'config eigrp', 'show ip bgp'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-acl': {
    id: 'config-acl',
    summary: 'Configurar Access Control Lists',
    longDescription: 'Configura ACLs standard o extended con reglas permit/deny.',
    examples: ['pt config acl --device R1 --name FILTER --type extended --rule "permit,ip,any,any" --dry-run'],
    related: ['config interface', 'show access-lists'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-vlan': {
    id: 'config-vlan',
    summary: 'Configurar VLANs',
    longDescription: 'Crea y configura VLANs con id, nombre y estado.',
    examples: ['pt config vlan --device S1 --vlan "10,ADMIN" --vlan "20,USERS" --dry-run'],
    related: ['show vlan', 'config interface'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-interface': {
    id: 'config-interface',
    summary: 'Configurar interfaces',
    longDescription: 'Configura interfaces con IP, mascara, descripcion y estado.',
    examples: ['pt config interface --device R1 --name Gig0/0 --ip 192.168.1.1 --mask 255.255.255.0 --dry-run'],
    related: ['show ip interface brief', 'config ospf'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'config-apply': {
    id: 'config-apply',
    summary: 'Aplicar configuracion desde archivo YAML/JSON',
    longDescription: 'Lee un archivo de configuracion, detecta el tipo y aplica los comandos IOS.',
    examples: ['pt config apply configs/ospf.yaml --dry-run'],
    related: ['config ospf', 'config eigrp', 'config bgp'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    writesIOS: true,
    supportsJson: true,
    supportsPlan: true,
    supportsExplain: true,
    supportsVerify: true,
  },

  'devices-list': {
    id: 'devices-list',
    summary: 'Listar dispositivos guardados en memoria',
    longDescription: 'Muestra dispositivos registrados en la base de datos SQLite.',
    examples: ['pt devices list'],
    related: ['devices add', 'topology show'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'devices-add': {
    id: 'devices-add',
    summary: 'Agregar dispositivo a la memoria',
    longDescription: 'Registra un dispositivo en la base de datos SQLite.',
    examples: ['pt devices add R1 --ip 10.0.0.1'],
    related: ['devices list', 'device add'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'history-search': {
    id: 'history-search',
    summary: 'Buscar en historial de comandos',
    longDescription: 'Busca comandos ejecutados anteriormente por texto.',
    examples: ['pt history search "ospf"'],
    related: ['history failed', 'history list'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'history-failed': {
    id: 'history-failed',
    summary: 'Mostrar comandos fallidos',
    longDescription: 'Muestra comandos que fallaron en ejecuciones anteriores.',
    examples: ['pt history failed', 'pt history failed --device R1'],
    related: ['history search', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'topology-show': {
    id: 'topology-show',
    summary: 'Mostrar topologia descubierta',
    longDescription: 'Muestra las conexiones entre dispositivos descubiertas via CDP.',
    examples: ['pt topology show'],
    related: ['topology', 'show cdp neighbors'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'config-prefs': {
    id: 'config-prefs',
    summary: 'Gestionar preferencias',
    longDescription: 'Guarda y recupera preferencias del usuario.',
    examples: ['pt config prefs set default_router 2911', 'pt config prefs get default_router'],
    related: ['config list', 'config set'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-tail': {
    id: 'audit-tail',
    summary: 'Mostrar ultimas operaciones del audit log',
    longDescription: 'Muestra las ultimas N operaciones registradas.',
    examples: ['pt audit tail --lines 50'],
    related: ['audit export', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-export': {
    id: 'audit-export',
    summary: 'Exportar auditoria a archivo',
    longDescription: 'Exporta el audit log a JSON, CSV o Markdown.',
    examples: ['pt audit export --format json --output audit.json'],
    related: ['audit tail', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  'audit-failed': {
    id: 'audit-failed',
    summary: 'Mostrar operaciones fallidas',
    longDescription: 'Muestra operaciones fallidas con filtros por dispositivo y fecha.',
    examples: ['pt audit failed --since "2026-04-01"'],
    related: ['audit tail', 'history failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
  },

  lab: {
    id: 'lab',
    summary: 'Gestión de laboratorios Cisco',
    longDescription: 'Comandos para crear, validar, parsear y levantar laboratorios Cisco en Packet Tracer.',
    examples: ['pt lab list', 'pt lab create', 'pt lab validate', 'pt lab lift'],
    related: ['device', 'topology', 'lab lift'],
    status: 'partial',
    supportsAutonomousUse: false,
    requiresPT: true,
    requiresContext: true,
    notes: [
      'lab create/list/parse/validate/interactive/pipeline son partial',
      'lab lift es experimental - funcionalidad completa pero en验证',
    ],
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

  'audit-query': {
    id: 'audit-query',
    summary: 'Consultar auditoría persistida',
    longDescription: 'Consulta la tabla audit_log de SQLite para inspeccionar ejecuciones persistidas de la CLI.',
    examples: ['pt audit query', 'pt audit query --device R1 --status failed'],
    related: ['audit tail', 'audit export', 'audit failed'],
    status: 'partial',
    supportsAutonomousUse: true,
    requiresPT: false,
    requiresContext: false,
    supportsJson: true,
    notes: ['Usa pt audit tail para una vista rápida'],
  },
};

export function getRegisteredCommandIds(): string[] {
  return ['build', 'device', 'show', 'config-host', 'vlan', 'etherchannel', 'link', 'config-ios', 'routing', 'acl', 'stp', 'services', 'results', 'logs', 'help', 'history', 'doctor', 'completion', 'topology', 'status', 'setup', 'runtime', 'config-ospf', 'config-eigrp', 'config-bgp', 'config-acl', 'config-vlan', 'config-interface', 'config-apply', 'devices-list', 'devices-add', 'history-search', 'history-failed', 'topology-show', 'config-prefs', 'audit-tail', 'audit-export', 'audit-failed', 'lab', 'router', 'audit-query'];
}
