// ============================================================================
// E2E Scenario Types - Definiciones de escenarios E2E (sin ejecución real)
// ============================================================================
// Tipos para definir escenarios E2E que pueden ejecutarse contra PT real.
// La ejecución real requiere Packet Tracer instalado.

import type { ExecutionOutcome } from "../real-run-types.js";

/**
 * Paso atómico de un escenario E2E.
 */
export interface E2EStep {
  /** Identificador único del paso */
  id: string;
  /** Descripción legible del paso */
  description: string;
  /** Tipo de operación */
  type: E2EStepType;
  /** Datos específicos del paso */
  payload: E2EStepPayload;
  /** Tiempo máximo esperado para completar (ms) */
  timeoutMs?: number;
  /** Si el paso es crítico para continuar */
  critical?: boolean;
}

/**
 * Tipos de operaciones E2E soportadas.
 */
export type E2EStepType =
  | "add-device"
  | "remove-device"
  | "add-link"
  | "remove-link"
  | "config-host"
  | "config-ios"
  | "exec-ios"
  | "show-command"
  | "wait-for"
  | "assert"
  | "snapshot";

/**
 * Payload para cada tipo de paso E2E.
 */
export type E2EStepPayload =
  | AddDevicePayload
  | RemoveDevicePayload
  | AddLinkPayload
  | RemoveLinkPayload
  | ConfigHostPayload
  | ConfigIosPayload
  | ExecIosPayload
  | ShowCommandPayload
  | WaitForPayload
  | AssertPayload
  | SnapshotPayload;

export interface AddDevicePayload {
  deviceType: "router" | "switch" | "pc" | "server" | "access-point" | "wireless-controller";
  model: string;
  name: string;
  x?: number;
  y?: number;
}

export interface RemoveDevicePayload {
  name: string;
}

export interface AddLinkPayload {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType?: string;
}

export interface RemoveLinkPayload {
  device: string;
  port: string;
}

export interface ConfigHostPayload {
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface ConfigIosPayload {
  device: string;
  commands: string[];
  save?: boolean;
}

export interface ExecIosPayload {
  device: string;
  command: string;
  expectedPattern?: string;
  parse?: boolean;
}

export interface ShowCommandPayload {
  device: string;
  command: string;
}

export interface WaitForPayload {
  seconds: number;
}

export interface AssertPayload {
  condition: string;
  expected: unknown;
  actual?: unknown;
  message?: string;
}

export interface SnapshotPayload {
  label?: string;
}

/**
 * Resultado de ejecutar un paso E2E.
 */
export interface E2EStepResult {
  stepId: string;
  outcome: E2EOutcome;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  evidence: E2EEvidence;
  error?: string;
  warnings: string[];
}

export type E2EOutcome = "passed" | "failed" | "skipped" | "error";

/**
 * Evidencia recopilada durante la ejecución de un paso.
 */
export interface E2EEvidence {
  commandSent?: string;
  rawOutput?: string;
  parsedOutput?: unknown;
  deviceState?: Record<string, unknown>;
  topologySnapshot?: unknown;
}

/**
 * Escenario E2E completo.
 */
export interface E2EScenario {
  /** Identificador único del escenario */
  id: string;
  /** Título legible */
  title: string;
  /** Descripción detallada */
  description: string;
  /** Pasos del escenario */
  steps: E2EStep[];
  /** Resultado esperado al finalizar */
  expectedResult: string;
  /** Tags para categorización */
  tags: string[];
  /** Perfiles asociados */
  profile: string[];
  /** Dependencias de otros escenarios */
  dependsOn: string[];
  /** Timeout total del escenario (ms) */
  timeoutMs?: number;
  /** Modo de cleanup */
  cleanupMode?: "clear-topology" | "preserve-topology";
}

/**
 * Escenario predefinido para operaciones básicas.
 */
export interface PredefinedScenarios {
  /** Escenario: crear-dispositivos */
  crearDispositivos: E2EScenario;
  /** Escenario: crear-links */
  crearLinks: E2EScenario;
  /** Escenario: config-pc-dhcp */
  configPcDhcp: E2EScenario;
  /** Escenario: crear-vlan */
  crearVlan: E2EScenario;
  /** Escenario: config-trunk */
  configTrunk: E2EScenario;
  /** Escenario: show-vlan */
  showVlan: E2EScenario;
  /** Escenario: show-mac */
  showMac: E2EScenario;
  /** Escenario: router-initial-dialog */
  routerInitialDialog: E2EScenario;
  /** Escenario: exec-ios-enable-config */
  execIosEnableConfig: E2EScenario;
  /** Escenario: pagination */
  pagination: E2EScenario;
  /** Escenario: server-basic */
  serverBasic: E2EScenario;
}

/**
 * Crea un escenario E2E básico de creación de dispositivos.
 */
export function crearEscenarioCrearDispositivos(): E2EScenario {
  return {
    id: "crear-dispositivos",
    title: "Crear Dispositivos",
    description: "Crea varios dispositivos en la topología y verifica que se crearon correctamente.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router 2911",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1", x: 100, y: 100 },
        timeoutMs: 5000,
        critical: true,
      },
      {
        id: "add-switch",
        description: "Agregar switch 2960",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1", x: 200, y: 100 },
        timeoutMs: 5000,
        critical: true,
      },
      {
        id: "add-pc",
        description: "Agregar PC",
        type: "add-device",
        payload: { deviceType: "pc", model: "PC-PT", name: "PC1", x: 300, y: 100 },
        timeoutMs: 5000,
        critical: true,
      },
      {
        id: "snapshot-after-add",
        description: "Capturar estado después de crear dispositivos",
        type: "snapshot",
        payload: { label: "after-add-devices" },
        timeoutMs: 3000,
      },
    ],
    expectedResult: "Todos los dispositivos se crean sin errores y aparecen en la topología",
    tags: ["smoke", "basic", "device-management"],
    profile: ["smoke", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E básico de creación de enlaces.
 */
export function crearEscenarioCrearLinks(): E2EScenario {
  return {
    id: "crear-links",
    title: "Crear Links",
    description: "Crea enlaces entre dispositivos y verifica conectividad.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1" },
        critical: true,
      },
      {
        id: "add-switch",
        description: "Agregar switch",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1" },
        critical: true,
      },
      {
        id: "link-r1-s1",
        description: "Conectar R1 a S1",
        type: "add-link",
        payload: { device1: "R1", port1: "Gig0/0", device2: "S1", port2: "Fast0/1" },
        timeoutMs: 5000,
        critical: true,
      },
      {
        id: "snapshot-after-link",
        description: "Capturar estado después de crear enlace",
        type: "snapshot",
        payload: { label: "after-add-link" },
      },
    ],
    expectedResult: "El enlace se crea y la conexión es visible en la topología",
    tags: ["smoke", "basic", "link-management"],
    profile: ["smoke", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de configuración DHCP en PC.
 */
export function crearEscenarioConfigPcDhcp(): E2EScenario {
  return {
    id: "config-pc-dhcp",
    title: "Configurar PC con DHCP",
    description: "Configura un PC para obtener IP via DHCP y verifica que recibe dirección.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router con DHCP",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1" },
        critical: true,
      },
      {
        id: "add-pc",
        description: "Agregar PC",
        type: "add-device",
        payload: { deviceType: "pc", model: "PC-PT", name: "PC1" },
        critical: true,
      },
      {
        id: "link-devices",
        description: "Conectar PC a router",
        type: "add-link",
        payload: { device1: "PC1", port1: "Fast0", device2: "R1", port2: "Gig0/0" },
        critical: true,
      },
      {
        id: "config-dhcp",
        description: "Configurar DHCP en PC",
        type: "config-host",
        payload: { device: "PC1", dhcp: true },
        timeoutMs: 10000,
        critical: true,
      },
      {
        id: "verify-dhcp",
        description: "Verificar IP obtenida",
        type: "exec-ios",
        payload: { device: "PC1", command: "ip config", expectedPattern: "IP Address" },
      },
    ],
    expectedResult: "PC obtiene dirección IP del router via DHCP",
    tags: ["dhcp", "host-config", "basic"],
    profile: ["dhcp", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de creación de VLAN.
 */
export function crearEscenarioCrearVlan(): E2EScenario {
  return {
    id: "crear-vlan",
    title: "Crear VLAN",
    description: "Crea una VLAN en un switch y la asigna a un puerto.",
    steps: [
      {
        id: "add-switch",
        description: "Agregar switch",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1" },
        critical: true,
      },
      {
        id: "config-vlan",
        description: "Crear VLAN 10",
        type: "config-ios",
        payload: {
          device: "S1",
          commands: ["vlan 10", "name TEST_VLAN", "exit"],
        },
        timeoutMs: 5000,
        critical: true,
      },
      {
        id: "config-interface",
        description: "Asignar puerto a VLAN",
        type: "config-ios",
        payload: {
          device: "S1",
          commands: ["interface Fast0/1", "switchport mode access", "switchport access vlan 10"],
        },
        critical: true,
      },
      {
        id: "show-vlan",
        description: "Verificar VLAN creada",
        type: "show-command",
        payload: { device: "S1", command: "show vlan" },
      },
    ],
    expectedResult: "VLAN 10 se crea y el puerto se asigna correctamente",
    tags: ["vlan", "switch-config", "basic"],
    profile: ["vlan", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de configuración de trunk.
 */
export function crearEscenarioConfigTrunk(): E2EScenario {
  return {
    id: "config-trunk",
    title: "Configurar Trunk",
    description: "Configura un enlace trunk entre switches.",
    steps: [
      {
        id: "add-switch1",
        description: "Agregar switch 1",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1" },
        critical: true,
      },
      {
        id: "add-switch2",
        description: "Agregar switch 2",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S2" },
        critical: true,
      },
      {
        id: "link-switches",
        description: "Conectar switches",
        type: "add-link",
        payload: { device1: "S1", port1: "Gig0/1", device2: "S2", port2: "Gig0/1" },
        critical: true,
      },
      {
        id: "config-trunk-s1",
        description: "Configurar trunk en S1",
        type: "config-ios",
        payload: {
          device: "S1",
          commands: [
            "interface Gig0/1",
            "switchport mode trunk",
            "switchport trunk allowed vlan 10,20,30",
          ],
        },
        critical: true,
      },
      {
        id: "show-trunk",
        description: "Verificar trunk",
        type: "show-command",
        payload: { device: "S1", command: "show interfaces trunk" },
      },
    ],
    expectedResult: "Enlace trunk se establece y permite VLANs especificadas",
    tags: ["trunk", "switch-config", "vlan"],
    profile: ["trunk", "vlan"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de ejecución de show vlan.
 */
export function crearEscenarioShowVlan(): E2EScenario {
  return {
    id: "show-vlan",
    title: "Show VLAN",
    description: "Ejecuta show vlan y verifica la salida.",
    steps: [
      {
        id: "add-switch",
        description: "Agregar switch",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1" },
        critical: true,
      },
      {
        id: "create-vlans",
        description: "Crear VLANs",
        type: "config-ios",
        payload: {
          device: "S1",
          commands: ["vlan 10", "name VLAN10", "vlan 20", "name VLAN20"],
        },
      },
      {
        id: "show-vlan-command",
        description: "Ejecutar show vlan",
        type: "show-command",
        payload: { device: "S1", command: "show vlan" },
      },
    ],
    expectedResult: "Show vlan muestra las VLANs creadas",
    tags: ["show", "vlan", "verification"],
    profile: ["show", "vlan"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de ejecución de show mac address-table.
 */
export function crearEscenarioShowMac(): E2EScenario {
  return {
    id: "show-mac",
    title: "Show MAC Address Table",
    description: "Ejecuta show mac address-table y verifica aprendizaje de MACs.",
    steps: [
      {
        id: "add-switch",
        description: "Agregar switch",
        type: "add-device",
        payload: { deviceType: "switch", model: "2960", name: "S1" },
        critical: true,
      },
      {
        id: "add-pcs",
        description: "Agregar PCs",
        type: "add-device",
        payload: { deviceType: "pc", model: "PC-PT", name: "PC1" },
        critical: true,
      },
      {
        id: "add-pc2",
        description: "Agregar PC2",
        type: "add-device",
        payload: { deviceType: "pc", model: "PC-PT", name: "PC2" },
        critical: true,
      },
      {
        id: "link-pcs",
        description: "Conectar PCs al switch",
        type: "add-link",
        payload: { device1: "PC1", port1: "Fast0", device2: "S1", port2: "Fast0/1" },
        critical: true,
      },
      {
        id: "show-mac-command",
        description: "Ejecutar show mac address-table",
        type: "show-command",
        payload: { device: "S1", command: "show mac address-table" },
      },
    ],
    expectedResult: "MAC addresses aparecen en la tabla",
    tags: ["show", "mac", "switch"],
    profile: ["show", "mac"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de dialog inicial de router.
 */
export function crearEscenarioRouterInitialDialog(): E2EScenario {
  return {
    id: "router-initial-dialog",
    title: "Router Initial Dialog",
    description: "Maneja el dialog inicial de configuración de un router nuevo.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1" },
        critical: true,
      },
      {
        id: "send-no-command",
        description: "Enviar 'no' al dialog inicial",
        type: "exec-ios",
        payload: { device: "R1", command: "no", expectedPattern: "continue" },
        timeoutMs: 10000,
        critical: true,
      },
      {
        id: "enter-privileged",
        description: "Ingresar a modo privilegiado",
        type: "exec-ios",
        payload: { device: "R1", command: "enable" },
      },
    ],
    expectedResult: "Router responde al dialog inicial sin bloquear",
    tags: ["router", "initial-config", "dialog"],
    profile: ["router", "initial"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de ejecución IOS con enable y config.
 */
export function crearEscenarioExecIosEnableConfig(): E2EScenario {
  return {
    id: "exec-ios-enable-config",
    title: "Exec IOS Enable and Config",
    description: "Ejecuta comandos en modo enable y config.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1" },
        critical: true,
      },
      {
        id: "exec-enable",
        description: "Modo enable",
        type: "exec-ios",
        payload: { device: "R1", command: "enable" },
        critical: true,
      },
      {
        id: "exec-config",
        description: "Modo config",
        type: "exec-ios",
        payload: { device: "R1", command: "configure terminal" },
        critical: true,
      },
      {
        id: "config-hostname",
        description: "Configurar hostname",
        type: "exec-ios",
        payload: { device: "R1", command: "hostname TEST-RTR" },
        critical: true,
      },
      {
        id: "exit-config",
        description: "Salir de config",
        type: "exec-ios",
        payload: { device: "R1", command: "exit" },
      },
    ],
    expectedResult: "Comandos se ejecutan sin errores",
    tags: ["ios", "config", "basic"],
    profile: ["ios", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E de paginación de salida.
 */
export function crearEscenarioPagination(): E2EScenario {
  return {
    id: "pagination",
    title: "Pagination",
    description: "Maneja paginación de salida de comandos IOS.",
    steps: [
      {
        id: "add-router",
        description: "Agregar router",
        type: "add-device",
        payload: { deviceType: "router", model: "2911", name: "R1" },
        critical: true,
      },
      {
        id: "exec-show-run",
        description: "Ejecutar show running-config (paginación)",
        type: "exec-ios",
        payload: { device: "R1", command: "show running-config", parse: true },
        timeoutMs: 15000,
      },
    ],
    expectedResult: "Salida paginada se procesa correctamente",
    tags: ["pagination", "ios", "show"],
    profile: ["pagination", "ios"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Crea un escenario E2E básico de servidor.
 */
export function crearEscenarioServerBasic(): E2EScenario {
  return {
    id: "server-basic",
    title: "Server Basic",
    description: "Configura un servidor y verifica sus servicios.",
    steps: [
      {
        id: "add-server",
        description: "Agregar servidor",
        type: "add-device",
        payload: { deviceType: "server", model: "SERVER-PT", name: "SRV1" },
        critical: true,
      },
      {
        id: "config-ip",
        description: "Configurar IP",
        type: "config-host",
        payload: { device: "SRV1", ip: "192.168.1.10", mask: "255.255.255.0", gateway: "192.168.1.1" },
        critical: true,
      },
      {
        id: "config-dhcp-service",
        description: "Habilitar servicio DHCP",
        type: "config-host",
        payload: { device: "SRV1", dhcp: true },
      },
    ],
    expectedResult: "Servidor configurado y respondiendo",
    tags: ["server", "dhcp", "basic"],
    profile: ["server", "basic"],
    dependsOn: [],
    cleanupMode: "clear-topology",
  };
}

/**
 * Registry de escenarios predefinidos.
 */
export const E2E_SCENARIOS: PredefinedScenarios = {
  crearDispositivos: crearEscenarioCrearDispositivos(),
  crearLinks: crearEscenarioCrearLinks(),
  configPcDhcp: crearEscenarioConfigPcDhcp(),
  crearVlan: crearEscenarioCrearVlan(),
  configTrunk: crearEscenarioConfigTrunk(),
  showVlan: crearEscenarioShowVlan(),
  showMac: crearEscenarioShowMac(),
  routerInitialDialog: crearEscenarioRouterInitialDialog(),
  execIosEnableConfig: crearEscenarioExecIosEnableConfig(),
  pagination: crearEscenarioPagination(),
  serverBasic: crearEscenarioServerBasic(),
};
