#!/usr/bin/env bun
import type { Command } from "commander";
import type { PtCommandDefinition } from "../cli/command-definition.js";

import { createDoctorCommand } from "./doctor.js";
import { createCompletionCommand } from "./completion.js";
import { createRuntimeCommand } from "./runtime/index.js";
import { createLabCommand } from "./lab/index.js";
import { createDeviceCommand } from "./device/index.js";
import { createLinkCommand } from "./link/index.js";
import { createCmdCommand } from "./cmd/index.js";
import { createSetCommand } from "./set/index.js";
import { createVerifyCommand } from "./verify/index.js";

export type CommandFactory = () => Command;

export const PUBLIC_COMMAND_DEFINITIONS: PtCommandDefinition[] = [
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
    group: "lab",
    summary: "Gestiona el laboratorio/canvas actual sin YAML",
    description: "Permite limpiar, inspeccionar, ejecutar scripts .ptcmd y generar reportes del lab actual.",
    examples: [
      { command: "pt lab status", description: "Ver estado del lab actual" },
      { command: "pt lab run labs/vlan.ptcmd", description: "Ejecutar un script de comandos PT" },
    ],
    related: ["pt device", "pt link", "pt verify all"],
    agentHints: [
      "Usar .ptcmd, no YAML.",
      "Un .ptcmd contiene comandos pt reales, uno por línea.",
    ],
    factory: createLabCommand,
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
      { command: "pt device add R1 2911", description: "Crear router R1" },
      { command: "pt device add SW1 2960-24TT --at 300,120", description: "Crear switch en posición específica" },
    ],
    related: ["pt link add", "pt cmd", "pt set host"],
    agentHints: [
      "Después de crear dispositivos, usa pt device list --json para obtener nombres reales.",
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
      { command: "pt link add R1:g0/0 SW1:g0/1", description: "Conectar router y switch" },
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
    summary: "Configura propiedades/API que no son terminal",
    description: "Configura hosts, servers, servicios, módulos y propiedades de dispositivo.",
    examples: [
      { command: "pt set host PC1 ip 192.168.10.10/24 --gateway 192.168.10.1", description: "IP estática en PC" },
      { command: "pt set host PC1 dhcp", description: "Habilitar DHCP en PC" },
      { command: "pt set server Server1 dns record empresa.local 192.168.10.2", description: "Agregar registro DNS" },
    ],
    related: ["pt cmd PC1 ipconfig", "pt verify dhcp", "pt verify dns"],
    agentHints: [
      "Usa set cuando Packet Tracer lo maneja como GUI/API.",
      "Después de set host, valida con pt cmd PC1 ipconfig.",
    ],
    factory: createSetCommand,
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
      { command: "pt verify all", description: "Validación general del lab" },
    ],
    related: ["pt cmd", "pt lab report", "pt doctor"],
    agentHints: [
      "Usa verify después de cambios, no solo cmd show.",
      "Si verify falla, lee nextSteps antes de intentar corregir.",
    ],
    factory: createVerifyCommand,
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

export const LEGACY_COMMAND_DEFINITIONS: PtCommandDefinition[] = [];

export const COMMAND_DEFINITIONS: PtCommandDefinition[] = [
  ...PUBLIC_COMMAND_DEFINITIONS,
  ...LEGACY_COMMAND_DEFINITIONS,
];

export const COMMAND_FACTORIES: CommandFactory[] = COMMAND_DEFINITIONS.map((definition) => definition.factory);

export function getRegisteredCommandIds(): string[] {
  return COMMAND_DEFINITIONS
    .filter((definition) => !definition.hidden)
    .map((definition) => definition.name)
    .sort();
}