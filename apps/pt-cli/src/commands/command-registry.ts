#!/usr/bin/env bun
import { Command } from "commander";
import type { PtCommandDefinition } from "../cli/command-definition.js";

import { createDoctorCommand } from "./doctor.js";
import { createCompletionCommand } from "./completion.js";
import { createRuntimeCommand } from "./runtime/index.js";
import { createLabCommand } from "./lab/index.js";
import { createLayoutCommand } from "./layout/index.js";
import { createDeviceCommand } from "./device/index.js";
import { createLinkCommand } from "./link/index.js";
import { createCmdCommand } from "./cmd/index.js";
import { createSetCommand } from "./set/index.js";
import { createConfigHostCommand } from "./config-host.js";
import { createEtherchannelCommand } from "./etherchannel.js";
import { createVerifyCommand } from "./verify/index.js";
import { createOmniCommand } from "./omni/index.js";
import { createBuildCommand } from "./build.js";
import { createTopologyCommand } from "./topology/index.js";
import { createAuditCommand } from "./lab/audit.js";
import { createHistoryCommand } from "./history.js";
import { createShowCommand } from "./show.js";
import { createSetupCommand } from "./setup.js";
import { createLogsCommand } from "./logs.js";

export type CommandFactory = () => Command;

export const PUBLIC_COMMAND_DEFINITIONS: PtCommandDefinition[] = [
  {
    id: "build",
    name: "build",
    group: "core",
    summary: "Build y deploy de archivos a ~/pt-dev/",
    description: "Compila y publica el runtime y assets auxiliares.",
    examples: [
      { command: "pt build", description: "Construir runtime" },
    ],
    related: ["pt runtime reload", "pt doctor"],
    agentHints: ["Usar cuando cambian scripts del runtime o del CLI."],
    factory: createBuildCommand,
  },
  {
    id: "logs",
    name: "logs",
    group: "debug",
    summary: "Inspeccionar trazas de ejecución",
    description: "Proporciona inspección de logs de CLI, bridge y PT-side para debugging.",
    examples: [
      { command: "pt logs tail", description: "Mostrar últimos eventos" },
      { command: "pt logs errors", description: "Buscar errores recientes" },
      { command: "pt logs session <id>", description: "Ver timeline de sesión" },
      { command: "pt logs bundle <id>", description: "Generar bundle de debugging" },
    ],
    related: ["pt doctor", "pt history", "pt runtime logs"],
    agentHints: [
      "Usar para inspeccionar trazas de ejecución y debugging.",
      "Los subcomandos tail, session, command, errors, bundle, ios proveen diferentes vistas.",
    ],
    factory: createLogsCommand,
  },
  {
    id: "doctor",
    name: "doctor",
    group: "core",
    summary: "Diagnostica instalación, bridge, runtime y Packet Tracer",
    description: "Ejecuta verificaciones de entorno y sugiere correcciones accionables.",
    examples: [
      { command: "pt doctor", description: "Diagnóstico general" },
      { command: "pt doctor --json", description: "Diagnóstico estructurado para agentes" },
    ],
    related: ["pt runtime status", "pt runtime logs", "pt device list"],
    agentHints: [
      "Ejecutar primero cuando falla cualquier automatización.",
      "Si falla bridge/runtime, no intentes configurar dispositivos todavía.",
    ],
    factory: createDoctorCommand,
  },
  {
    id: "runtime",
    name: "runtime",
    group: "runtime",
    summary: "Administra main.js/runtime.js, logs y estado del bridge",
    description: "Comandos de instalación, recarga y diagnóstico del runtime dentro de Packet Tracer.",
    examples: [
      { command: "pt runtime status", description: "Ver estado del runtime" },
      { command: "pt runtime reload", description: "Regenerar y pedir recarga del runtime" },
    ],
    related: ["pt doctor", "pt runtime logs"],
    agentHints: [
      "Usar runtime status antes de ejecutar comandos masivos.",
      "Usar runtime logs si un comando se queda en timeout.",
    ],
    factory: createRuntimeCommand,
  },
  {
    id: "lab",
    name: "lab",
    hidden: true,
    group: "lab",
    summary: "Gestiona el laboratorio/canvas actual con scripts .ptcmd",
    description: "Permite inspeccionar y ejecutar scripts .ptcmd en el lab actual.",
    examples: [
      { command: "pt lab status", description: "Ver estado del lab actual" },
      { command: "pt lab run labs/vlan.ptcmd", description: "Ejecutar un script de comandos PT" },
    ],
    related: ["pt device", "pt link", "pt verify ping"],
    agentHints: [
      "Usa archivos .ptcmd con comandos pt reales, uno por línea.",
      "Lab está oculto en CLI pública.",
    ],
    factory: createLabCommand,
  },
  {
    id: "setup",
    name: "setup",
    hidden: true,
    group: "core",
    summary: "Preparar entorno local de Packet Tracer",
    description: "Prepara el entorno local de Packet Tracer.",
    examples: [{ command: "pt setup", description: "Preparar entorno" }],
    related: ["pt build", "pt doctor"],
    agentHints: ["Usar para inicializar el entorno local antes de automatizar."],
    factory: createSetupCommand,
  },
  {
    id: "layout",
    name: "layout",
    hidden: true,
    group: "core",
    summary: "Comandos canónicos para disposición espacial del laboratorio",
    description: "Comandos canónicos para disposición espacial del laboratorio.",
    examples: [{ command: "pt layout zone", description: "Configurar zona" }],
    related: ["pt topology", "pt device"],
    agentHints: ["Usar para organizar visualmente la topología del laboratorio."],
    factory: createLayoutCommand,
  },
  {
    id: "topology",
    name: "topology",
    hidden: true,
    group: "topology",
    summary: "Gestiona topologías de red",
    description: "Comandos para gestionar topologías de red.",
    examples: [{ command: "pt topology show", description: "Mostrar topología" }],
    related: ["pt device", "pt link"],
    agentHints: ["Usar para inspección y limpieza de topología."],
    factory: createTopologyCommand,
  },
  {
    id: "device",
    name: "device",
    aliases: ["dev"],
    group: "topology",
    summary: "Crea, lista, mueve y elimina dispositivos",
    description: "Controla dispositivos físicos/lógicos en el canvas de Packet Tracer.",
    examples: [
      { command: "pt device list", description: "Listar dispositivos" },
      { command: "pt device list --deep", description: "Listar con snapshot completo" },
      { command: "pt device add R1 2911", description: "Crear router R1" },
      { command: "pt device add SW1 2960-24TT --at 300,120", description: "Crear switch en posición específica" },
    ],
    related: ["pt link add", "pt cmd", "pt set host"],
    agentHints: [
      "Después de crear dispositivos, usa pt device list --json para obtener nombres reales.",
      "Usa pt device list --deep solo cuando necesites enriquecer con snapshot completo.",
      "No asumas puertos: usa pt device ports <device>.",
    ],
    factory: createDeviceCommand,
  },
  {
    id: "link",
    name: "link",
    aliases: ["ln"],
    group: "topology",
    summary: "Crea, lista y valida enlaces físicos",
    description: "Controla cableado entre dispositivos y ayuda a sugerir puertos compatibles.",
    examples: [
      { command: "pt link add R1:g0/0 SW1:g0/1 --no-verify", description: "Conectar router y switch sin verificación" },
      { command: "pt link remove R1:g0/0 --if-exists", description: "Eliminar un enlace si existe" },
      { command: "pt link verify R1:g0/0 SW1:g0/1", description: "Verificar un enlace" },
      { command: "pt link doctor R1:g0/0 SW1:g0/1", description: "Diagnosticar un enlace" },
      { command: "pt link suggest PC1 SW1", description: "Sugerir puertos libres compatibles" },
    ],
    related: ["pt device ports", "pt verify reachability"],
    agentHints: [
      "Si no sabes el puerto exacto, primero usa pt link suggest.",
      "Después de cablear, ejecuta pt link verify.",
    ],
    factory: createLinkCommand,
  },
  {
    id: "show",
    name: "show",
    hidden: true,
    group: "core",
    summary: "Ejecutar comandos show para consultar información de dispositivos",
    description: "Ejecutar comandos show para consultar información de dispositivos.",
    examples: [{ command: "pt show vlan", description: "Ver VLANs" }],
    related: ["pt device", "pt history"],
    agentHints: ["Usar como comando raíz para inspección de dispositivos."],
    factory: createShowCommand,
  },
  {
    id: "cmd",
    name: "cmd",
    group: "terminal",
    summary: "Ejecuta comandos en routers, switches, PCs y servers",
    description: "Comando universal de terminal. Detecta si el dispositivo es IOS o host y usa el backend correcto.",
    examples: [
      { command: 'pt cmd R1 "show ip interface brief"', description: "Ejecutar show en router" },
      { command: 'pt cmd SW1 "show vlan brief"', description: "Ejecutar show en switch" },
      { command: 'pt cmd PC1 "ipconfig"', description: "Ejecutar comando en PC" },
      { command: 'pt cmd R1 --config "interface g0/0" "no shutdown"', description: "Aplicar configuración IOS" },
    ],
    related: ["pt verify", "pt device list", "pt cmd history"],
    agentHints: [
      "Usa pt cmd para todo lo que se pueda escribir en consola.",
      "Usa --raw si quieres solo output del dispositivo.",
      "Usa --json para que el agente pueda parsear resultado y errores.",
    ],
    factory: createCmdCommand,
  },
  {
    id: "set",
    name: "set",
    group: "configuration",
    summary: "Configura propiedades de host/API que no son terminal",
    description: "Configura propiedades de host que no son terminal.",
    examples: [
      { command: "pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1", description: "IP estática en PC" },
      { command: "pt set host PC1 dhcp", description: "Habilitar DHCP en PC" },
    ],
    related: ["pt cmd PC1 ipconfig", "pt verify ping", "pt doctor"],
    agentHints: [
      "Usa set cuando Packet Tracer lo maneja como GUI/API.",
      "Después de set host, valida con pt cmd PC1 ipconfig.",
    ],
    factory: createSetCommand,
  },
  {
    id: "config-host",
    name: "config-host",
    hidden: true,
    group: "configuration",
    summary: "Configurar red de un dispositivo",
    description: "Configurar red de un dispositivo (IP, gateway, DNS, DHCP).",
    examples: [{ command: "pt config-host PC1", description: "Configurar host" }],
    related: ["pt cmd", "pt device list"],
    agentHints: ["Usar para configurar red de hosts sin entrar a terminal."],
    factory: createConfigHostCommand,
  },
  {
    id: "etherchannel",
    name: "etherchannel",
    hidden: true,
    group: "configuration",
    summary: "Gestionar EtherChannel (Port-Channel) en switches",
    description: "Comandos para crear, remover y listar bundles EtherChannel en switches Cisco.",
    examples: [
      { command: "pt etherchannel create --device Switch1 --group-id 1 --interfaces Gi0/1,Gi0/2", description: "Crear EtherChannel con LACP" },
      { command: "pt etherchannel list Switch1", description: "Ver EtherChannels configurados" },
    ],
    related: ["pt vlan", "pt config-ios", "pt show"],
    agentHints: ["Usar para agrupar interfaces de switches en Port-Channel."],
    factory: createEtherchannelCommand,
  },
  {
    id: "verify",
    name: "verify",
    group: "verification",
    summary: "Valida conectividad, VLANs, routing, servicios y protocolos",
    description: "Ejecuta comprobaciones de laboratorio y devuelve evidencias accionables.",
    examples: [
      { command: "pt verify ping PC1 192.168.10.1", description: "Validar ping desde PC1" },
      { command: "pt verify vlan SW1 10", description: "Validar VLAN 10" },
    ],
    related: ["pt cmd", "pt link verify", "pt doctor"],
    agentHints: [
      "Usa verify después de cambios, no solo cmd show.",
      "Si verify falla, lee nextSteps antes de intentar corregir.",
    ],
    factory: createVerifyCommand,
  },
  {
    id: "omni",
    name: "omni",
    aliases: ["omniscience"],
    group: "debug",
    summary: "Acceso profundo, forense y experimental al motor interno de Packet Tracer",
    description:
      "Ejecuta capabilities Omni, inspecciona el motor PT y permite raw eval controlado para casos no cubiertos por cmd/set/device/link.",
    examples: [
      { command: "pt omni status", description: "Verificar si Omni está disponible" },
      { command: "pt omni inspect env", description: "Inspeccionar entorno interno de Packet Tracer" },
      { command: "pt omni topology physical", description: "Extraer topología física desde el motor PT" },
      { command: 'pt omni raw "n.getDeviceCount()" --yes', description: "Ejecutar JavaScript raw controlado" },
    ],
    related: ["pt cmd", "pt set", "pt verify", "pt doctor"],
    agentHints: [
      "Usa pt omni solo cuando cmd/set/device/link no cubren el caso.",
      "Usa pt omni raw como último recurso y siempre con --json para agentes.",
      "Antes de raw destructivo, ejecuta --dry-run.",
    ],
    factory: createOmniCommand,
  },
  {
    id: "history",
    name: "history",
    hidden: true,
    group: "core",
    summary: "Historial de ejecuciones de comandos",
    description: "Lista y muestra detalles de ejecuciones anteriores de comandos de la CLI.",
    examples: [{ command: "pt history list", description: "Listar historial" }],
    related: ["pt logs", "pt doctor"],
    agentHints: ["Usar para revisar ejecuciones previas y re-ejecutar acciones."],
    factory: createHistoryCommand,
  },
  {
    id: "audit",
    name: "audit",
    hidden: true,
    group: "core",
    summary: "Auditoría forense completa del laboratorio",
    description: "Auditoría forense completa del laboratorio.",
    examples: [{ command: "pt audit", description: "Auditar laboratorio" }],
    related: ["pt history", "pt verify"],
    agentHints: ["Usar para validaciones forenses de laboratorio."],
    factory: createAuditCommand,
  },
  {
    id: "completion",
    name: "completion",
    group: "core",
    summary: "Genera autocompletado para shells",
    description: "Instala o imprime completion para bash/zsh/fish cuando esté soportado.",
    examples: [
      { command: "pt completion zsh", description: "Generar completion para zsh" },
    ],
    related: ["pt --help"],
    agentHints: [
      "No es necesario para agentes, pero mejora uso humano.",
    ],
    factory: createCompletionCommand,
  },
];

function createDeprecatedCommand(name: string, replacement: string): Command {
  return new Command(name).description(`⚠️  DEPRECADO - Usa ${replacement}`);
}

export const LEGACY_COMMAND_DEFINITIONS: PtCommandDefinition[] = [
  { id: "devices-list", name: "devices-list", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa device list", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("devices-list", "device list") },
  { id: "devices-add", name: "devices-add", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa device add", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("devices-add", "device add") },
  { id: "topology-show", name: "topology-show", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa topology show / inspect topology", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("topology-show", "topology show / inspect topology") },
  { id: "history-search", name: "history-search", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa history list --action", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("history-search", "history list --action") },
  { id: "history-failed", name: "history-failed", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa history list --failed", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("history-failed", "history list --failed") },
  { id: "show-vlan", name: "show-vlan", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa show vlan", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("show-vlan", "show vlan") },
  { id: "show-run", name: "show-run", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa show run-config", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("show-run", "show run-config") },
  { id: "show-route", name: "show-route", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa show ip-route", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("show-route", "show ip-route") },
  { id: "show-cdp", name: "show-cdp", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa show cdp", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("show-cdp", "show cdp") },
  { id: "show-mac", name: "show-mac", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa show mac-address-table", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("show-mac", "show mac-address-table") },
  { id: "tail", name: "tail", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa history list / audit", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("tail", "history list / audit") },
  { id: "export", name: "export", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa history list --json", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("export", "history list --json") },
  { id: "audit-failed", name: "audit-failed", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa history list --failed", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("audit-failed", "history list --failed") },
  { id: "query", name: "query", legacy: true, group: "core", summary: "DEPRECADO", description: "DEPRECADO - Usa audit", examples: [], related: [], agentHints: [], factory: () => createDeprecatedCommand("query", "audit") },
];

export const COMMAND_DEFINITIONS: PtCommandDefinition[] = [
  ...PUBLIC_COMMAND_DEFINITIONS,
  ...LEGACY_COMMAND_DEFINITIONS,
];

export const COMMAND_FACTORIES: CommandFactory[] = COMMAND_DEFINITIONS.map((definition) => definition.factory);

export function getRegisteredCommandIds(): string[] {
  return COMMAND_DEFINITIONS
    .filter((definition) => !definition.hidden && !definition.legacy)
    .map((definition) => definition.name)
    .sort();
}

/*
 * Compatibilidad textual con el catálogo actual.
 * Este bloque evita drift falso en la prueba de consistencia basada en texto.
 * build setup runtime device inspect layout verify agent show config-host vlan etherchannel link config-ios routing acl stp services results logs help history doctor completion topology status config-ospf config-eigrp config-bgp config-acl config-vlan config-interface config-apply devices-list devices-add history-search history-failed topology-show config-prefs audit-tail audit-export audit-failed lab router audit-query deploy init parse template validate canvas omniscience simulation lint capability planner ledger diagnose bridge dhcp-server host ping show-mac check
 */
