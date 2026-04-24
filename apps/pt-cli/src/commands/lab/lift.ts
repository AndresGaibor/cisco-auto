#!/usr/bin/env bun
import { Command } from "commander";

import { createVerifiedResult, createErrorResult } from "../../contracts/cli-result.js";
import type { CliResult, VerificationCheck } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import type { GlobalFlags } from "../../flags.js";
import { getGlobalFlags } from "../../flags.js";
import { formatExamples, formatRelatedCommands } from "../../help/formatter.ts";
import { getExamples } from "../../help/examples.ts";
import { getRelatedCommands } from "../../help/related.ts";
import { getCommandsDir, getInFlightDir, getResultsDir } from "../../system/paths.js";
import { renderCliResult } from "../../ux/renderers.js";
import { runCommand } from "../../application/run-command.js";
import { readdir, unlink } from "node:fs/promises";

interface LiftDeviceSpec {
  name: string;
  model: string;
  x: number;
  y: number;
}

interface LiftLinkSpec {
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cableType: "straight";
}

interface LiftScenarioPlan {
  devices: LiftDeviceSpec[];
  links: LiftLinkSpec[];
  notes: string[];
}

interface LiftResult {
  scenario: string;
  cleared: { removedDevices: number; removedLinks: number };
  devicesCreated: number;
  linksCreated: number;
  core: string;
  switches: string[];
  pcs: string[];
  server: string;
  warnings: string[];
}

const SCENARIO_NAME = "CORE3650-4SW-4PC-SERVER";
const CORE_NAME = "CORE3650";
const SERVER_NAME = "SRV1";
const CORE_SERVER_PORT = "FastEthernet0/5";
const MGMT_GATEWAY = "192.168.99.1";
const SERVER_IP = "192.168.30.10";
const VLAN_USERS = 10;
const VLAN_ADMIN = 20;
const VLAN_SERVERS = 30;
const VLAN_MGMT = 99;

const LAB_LIFT_META: CommandMeta = {
  id: "lab.lift",
  summary: "Levanta el laboratorio core3650 completo",
  longDescription:
    "Crea la topología solicitada con un CORE3650, cuatro switches 2960, cuatro PCs y un servidor, y aplica VLANs, Rapid-PVST+, trunks, SVIs, DHCPv4 y direccionamiento base.",
  examples: [
    {
      command: "cisco-auto lab lift",
      description: "Levantar el laboratorio completo solicitado",
    },
  ],
  related: ["cisco-auto lab create", "cisco-auto lab validate", "cisco-auto status"],
  nextSteps: ["cisco-auto status", "cisco-auto device list"],
  tags: ["lab", "topology", "vlan", "dhcp", "routing", "stp"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function buildScenarioPlan(): LiftScenarioPlan {
  const devices: LiftDeviceSpec[] = [
    { name: CORE_NAME, model: "3560", x: 520, y: 120 },
    { name: "SW1", model: "2960-24TT", x: 200, y: 280 },
    { name: "SW2", model: "2960-24TT", x: 380, y: 280 },
    { name: "SW3", model: "2960-24TT", x: 660, y: 280 },
    { name: "SW4", model: "2960-24TT", x: 840, y: 280 },
    { name: "PC1", model: "PC-PT", x: 200, y: 450 },
    { name: "PC2", model: "PC-PT", x: 380, y: 450 },
    { name: "PC3", model: "PC-PT", x: 660, y: 450 },
    { name: "PC4", model: "PC-PT", x: 840, y: 450 },
    { name: SERVER_NAME, model: "Server-PT", x: 520, y: 450 },
  ];

  const links: LiftLinkSpec[] = [
    {
      fromDevice: CORE_NAME,
      fromPort: "FastEthernet0/1",
      toDevice: "SW1",
      toPort: "GigabitEthernet0/1",
      cableType: "straight",
    },
    {
      fromDevice: CORE_NAME,
      fromPort: "FastEthernet0/2",
      toDevice: "SW2",
      toPort: "GigabitEthernet0/1",
      cableType: "straight",
    },
    {
      fromDevice: CORE_NAME,
      fromPort: "FastEthernet0/3",
      toDevice: "SW3",
      toPort: "GigabitEthernet0/1",
      cableType: "straight",
    },
    {
      fromDevice: CORE_NAME,
      fromPort: "FastEthernet0/4",
      toDevice: "SW4",
      toPort: "GigabitEthernet0/1",
      cableType: "straight",
    },
    {
      fromDevice: "SW1",
      fromPort: "FastEthernet0/1",
      toDevice: "PC1",
      toPort: "FastEthernet0",
      cableType: "straight",
    },
    {
      fromDevice: "SW2",
      fromPort: "FastEthernet0/1",
      toDevice: "PC2",
      toPort: "FastEthernet0",
      cableType: "straight",
    },
    {
      fromDevice: "SW3",
      fromPort: "FastEthernet0/1",
      toDevice: "PC3",
      toPort: "FastEthernet0",
      cableType: "straight",
    },
    {
      fromDevice: "SW4",
      fromPort: "FastEthernet0/1",
      toDevice: "PC4",
      toPort: "FastEthernet0",
      cableType: "straight",
    },
    {
      fromDevice: CORE_NAME,
      fromPort: CORE_SERVER_PORT,
      toDevice: SERVER_NAME,
      toPort: "FastEthernet0",
      cableType: "straight",
    },
  ];

  return {
    devices,
    links,
    notes: [
      "El servidor queda preparado como host estático; la activación GUI de DNS/WEB/EMAIL no está expuesta por la API actual de PT.",
      "Las PCs usan DHCP desde el CORE3650 y la VLAN 30 queda reservada para el servidor.",
    ],
  };
}

function buildCoreCommands(): string[] {
  return [
    "configure terminal",
    `hostname ${CORE_NAME}`,
    "spanning-tree mode rapid-pvst",
    "ip routing",
    `vlan ${VLAN_USERS}`,
    " name USERS",
    " exit",
    `vlan ${VLAN_ADMIN}`,
    " name ADMIN",
    " exit",
    `vlan ${VLAN_SERVERS}`,
    " name SERVERS",
    " exit",
    `vlan ${VLAN_MGMT}`,
    " name MGMT",
    " exit",
    `interface vlan ${VLAN_USERS}`,
    " ip address 192.168.10.1 255.255.255.0",
    " no shutdown",
    " exit",
    `interface vlan ${VLAN_ADMIN}`,
    " ip address 192.168.20.1 255.255.255.0",
    " no shutdown",
    " exit",
    `interface vlan ${VLAN_SERVERS}`,
    " ip address 192.168.30.1 255.255.255.0",
    " no shutdown",
    " exit",
    `interface vlan ${VLAN_MGMT}`,
    ` ip address ${MGMT_GATEWAY} 255.255.255.0`,
    " no shutdown",
    " exit",
    "ip dhcp excluded-address 192.168.10.1 192.168.10.20",
    "ip dhcp excluded-address 192.168.20.1 192.168.20.20",
    "ip dhcp pool VLAN10",
    " network 192.168.10.0 255.255.255.0",
    " default-router 192.168.10.1",
    ` dns-server ${SERVER_IP}`,
    " exit",
    "ip dhcp pool VLAN20",
    " network 192.168.20.0 255.255.255.0",
    " default-router 192.168.20.1",
    ` dns-server ${SERVER_IP}`,
    " exit",
    `interface ${CORE_SERVER_PORT}`,
    " switchport mode access",
    ` switchport access vlan ${VLAN_SERVERS}`,
    " no shutdown",
    " exit",
    `interface FastEthernet0/1`,
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
    `interface FastEthernet0/2`,
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
    `interface FastEthernet0/3`,
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
    `interface FastEthernet0/4`,
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
  ];
}

function buildAccessSwitchCommands(
  name: string,
  accessVlan: number,
  managementSuffix: number,
): string[] {
  return [
    "configure terminal",
    `hostname ${name}`,
    "spanning-tree mode rapid-pvst",
    `vlan ${VLAN_USERS}`,
    " name USERS",
    " exit",
    `vlan ${VLAN_ADMIN}`,
    " name ADMIN",
    " exit",
    `vlan ${VLAN_SERVERS}`,
    " name SERVERS",
    " exit",
    `vlan ${VLAN_MGMT}`,
    " name MGMT",
    " exit",
    "interface GigabitEthernet0/1",
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
    "interface FastEthernet0/1",
    " switchport mode access",
    ` switchport access vlan ${accessVlan}`,
    " spanning-tree portfast",
    " no shutdown",
    " exit",
    "interface vlan 99",
    ` ip address 192.168.99.${managementSuffix} 255.255.255.0`,
    " no shutdown",
    " exit",
    `ip default-gateway ${MGMT_GATEWAY}`,
  ];
}

function buildPlanText(plan: LiftScenarioPlan): string {
  const lines: string[] = [];
  lines.push("Plan de ejecución:");
  lines.push(`  1. Limpiar la topología existente`);
  lines.push(`  2. Crear ${plan.devices.length} dispositivos`);
  lines.push(`  3. Crear ${plan.links.length} enlaces`);
  lines.push("  4. Configurar CORE3650 con VLANs, SVIs, DHCP y Rapid-PVST+");
  lines.push("  5. Configurar los 2960 como switches de acceso y trunks");
  lines.push("  6. Configurar PCs por DHCP y servidor con IP fija");
  lines.push("  7. Verificar topología, VLANs y estado de hosts");
  lines.push("");
  lines.push("Dispositivos:");
  for (const device of plan.devices) {
    lines.push(`  - ${device.name} (${device.model}) @ ${device.x},${device.y}`);
  }
  lines.push("");
  lines.push("Enlaces:");
  for (const link of plan.links) {
    lines.push(`  - ${link.fromDevice}:${link.fromPort} -> ${link.toDevice}:${link.toPort}`);
  }
  lines.push("");
  lines.push("Notas:");
  for (const note of plan.notes) {
    lines.push(`  - ${note}`);
  }
  return lines.join("\n");
}

function makeFlags(overrides: Partial<GlobalFlags> = {}): GlobalFlags {
  return {
    json: false,
    jq: null,
    output: "text",
    verbose: false,
    quiet: false,
    trace: false,
    tracePayload: false,
    traceResult: false,
    traceDir: null,
    traceBundle: false,
    traceBundlePath: null,
    sessionId: null,
    examples: false,
    schema: false,
    explain: false,
    plan: false,
    verify: true,
    ...overrides,
  };
}

async function waitForDeviceNames(
  controller: {
    listDevices: () => Promise<{ devices: Array<{ name: string }> }>;
  },
  expectedNames: string[],
  maxAttempts = 20,
  delayMs = 500,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { devices } = await controller.listDevices();
    const names = new Set(devices.map((device) => device.name));

    if (expectedNames.every((name) => names.has(name))) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false;
}

async function enablePrivilegedMode(
  controller: {
    execInteractive: (
      device: string,
      command: string,
      options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
    ) => Promise<unknown>;
  },
  device: string,
): Promise<void> {
  try {
    await controller.execInteractive(device, "enable", {
      timeout: 5000,
      parse: false,
      ensurePrivileged: true,
    });
  } catch {
    // Si ya está en modo privilegiado, continuamos.
  }
}

async function clearBridgeQueue(): Promise<void> {
  const dirs = [getCommandsDir(), getInFlightDir(), getResultsDir()];

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir);
      await Promise.all(
        entries
          .filter((entry) => entry.endsWith(".json"))
          .map((entry) => unlink(`${dir}/${entry}`)),
      );
    } catch {
      // Si el directorio no existe o no se puede leer, continuamos sin bloquear el despliegue.
    }
  }
}

async function waitForTopologyMaterialization(
  controller: {
    snapshot: () => Promise<{ devices: Record<string, unknown>; links: Record<string, unknown> }>;
    listDevices: () => Promise<Array<{ name: string }>>;
  },
  expectedDeviceNames: string[],
  expectedLinkCount: number,
  maxAttempts = 20,
  delayMs = 500,
): Promise<{
  devices: Array<{ name: string }>;
  snapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null;
}> {
  let latestSnapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null =
    null;
  let latestDevices: Array<{ name: string }> = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const listResult = await controller.listDevices();
    latestDevices = listResult.devices;
    latestSnapshot = await controller.snapshot();

    const names = new Set(latestDevices.map((device: any) => device.name));
    const linkCount = Object.keys(latestSnapshot?.links ?? {}).length;

    if (expectedDeviceNames.every((name) => names.has(name)) && linkCount >= expectedLinkCount) {
      return { devices: latestDevices, snapshot: latestSnapshot };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { devices: latestDevices, snapshot: latestSnapshot };
}

function summarizeChecks(snapshot: {
  deviceCount: number;
  linkCount: number;
  coreRunningConfig: string;
  coreVlans: number[];
  coreInterfacesUp: string[];
  pc1Dhcp: boolean;
  serverIp?: string;
  serverGateway?: string;
  mgmtSwitches: Array<{ name: string; ip?: string }>;
}): VerificationCheck[] {
  return [
    {
      name: "topology.devices",
      ok: snapshot.deviceCount === 10,
      details: { expected: 10, actual: snapshot.deviceCount },
    },
    {
      name: "topology.links",
      ok: snapshot.linkCount === 9,
      details: { expected: 9, actual: snapshot.linkCount },
    },
    {
      name: "core.hostname",
      ok: snapshot.coreRunningConfig.includes(`hostname ${CORE_NAME}`),
      details: { device: CORE_NAME },
    },
    {
      name: "core.rapid-pvst",
      ok: snapshot.coreRunningConfig.toLowerCase().includes("spanning-tree mode rapid-pvst"),
      details: { device: CORE_NAME },
    },
    {
      name: "core.ip-routing",
      ok: snapshot.coreRunningConfig.toLowerCase().includes("ip routing"),
      details: { device: CORE_NAME },
    },
    {
      name: "core.vlans",
      ok: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT].every((vlan) =>
        snapshot.coreVlans.includes(vlan),
      ),
      details: {
        expected: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT],
        actual: snapshot.coreVlans,
      },
    },
    {
      name: "core.svis-up",
      ok: ["Vlan10", "Vlan20", "Vlan30", "Vlan99"].every((iface) =>
        snapshot.coreInterfacesUp.some((entry) =>
          entry.toLowerCase().includes(iface.toLowerCase()),
        ),
      ),
      details: { interfaces: snapshot.coreInterfacesUp },
    },
    {
      name: "pc1.dhcp",
      ok: snapshot.pc1Dhcp,
      details: { device: "PC1" },
    },
    {
      name: "server.address",
      ok: snapshot.serverIp === SERVER_IP && snapshot.serverGateway === "192.168.30.1",
      details: { ip: snapshot.serverIp, gateway: snapshot.serverGateway },
    },
    {
      name: "switch.management",
      ok: snapshot.mgmtSwitches.every(
        (item) => typeof item.ip === "string" && item.ip.startsWith("192.168.99."),
      ),
      details: { switches: snapshot.mgmtSwitches },
    },
  ];
}

export function createLabLiftCommand(): Command {
  const cmd = new Command("lift")
    .description("Levanta el laboratorio CORE3650 + 4x2960 + Server + 4 PCs")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecución", true)
    .option("--no-verify", "Omitir verificación post-ejecución", false)
    .action(async function (this: Command) {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");
      const globalFlags = getGlobalFlags(this);

      const plan = buildScenarioPlan();

      if (globalExamples) {
        console.log(
          formatExamples(getExamples("lab lift")) +
            formatRelatedCommands(getRelatedCommands("lab lift")),
        );
        return;
      }

      if (globalExplain) {
        console.log(LAB_LIFT_META.longDescription ?? LAB_LIFT_META.summary);
        return;
      }

      if (globalPlan) {
        console.log(buildPlanText(plan));
        return;
      }

      const flags = makeFlags({
        json: globalFlags.json,
        jq: globalFlags.jq,
        output: globalFlags.output,
        verbose: globalFlags.verbose,
        quiet: globalFlags.quiet,
        trace: globalFlags.trace,
        tracePayload: globalFlags.tracePayload,
        traceResult: globalFlags.traceResult,
        traceDir: globalFlags.traceDir,
        traceBundle: globalFlags.traceBundle,
        traceBundlePath: globalFlags.traceBundlePath,
        sessionId: globalFlags.sessionId,
        examples: globalFlags.examples,
        schema: globalFlags.schema,
        explain: globalFlags.explain,
        plan: globalFlags.plan,
        verify: globalFlags.verify,
      });

      const result = await runCommand<LiftResult>({
        action: "lab.lift",
        meta: LAB_LIFT_META,
        flags,
        payloadPreview: {
          scenario: SCENARIO_NAME,
          devices: plan.devices.length,
          links: plan.links.length,
        },
        execute: async (ctx): Promise<CliResult<LiftResult>> => {
          try {
            await ctx.logPhase("prepare", { scenario: SCENARIO_NAME });

            await clearBridgeQueue();

            let cleared = { removedDevices: 0, removedLinks: 0 };
            try {
              const clearedTopology = await ctx.controller.clearTopology();
              cleared = {
                removedDevices: clearedTopology.removedDevices,
                removedLinks: clearedTopology.removedLinks,
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              await ctx.logPhase("warn", {
                message: `No se pudo limpiar la topología previa: ${message}`,
              });
            }

            const switchNames = ["SW1", "SW2", "SW3", "SW4"];
            const pcNames = ["PC1", "PC2", "PC3", "PC4"];

            for (const device of plan.devices) {
              await ctx.controller.addDevice(device.name, device.model, {
                x: device.x,
                y: device.y,
              });
            }

            const deviceNamesReady = await waitForDeviceNames(
              ctx.controller,
              plan.devices.map((device) => device.name),
            );
            if (!deviceNamesReady) {
              return createErrorResult("lab.lift", {
                message:
                  "Los dispositivos no materializaron a tiempo en Packet Tracer. Revisa que la topología esté lista y vuelve a intentar.",
              }) as CliResult<LiftResult>;
            }

            await enablePrivilegedMode(ctx.controller, CORE_NAME);
            await enablePrivilegedMode(ctx.controller, "SW1");
            await enablePrivilegedMode(ctx.controller, "SW2");
            await enablePrivilegedMode(ctx.controller, "SW3");
            await enablePrivilegedMode(ctx.controller, "SW4");

            ctx.controller.getTopologyCache().refreshFromState();

            const materialization = await waitForTopologyMaterialization(
              ctx.controller,
              plan.devices.map((device) => device.name),
              plan.links.length,
            );

            for (const link of plan.links) {
              await ctx.controller.addLink(
                link.fromDevice,
                link.fromPort,
                link.toDevice,
                link.toPort,
                link.cableType,
              );
            }

            ctx.controller.getTopologyCache().refreshFromState();

            await ctx.controller.snapshot();

            const coreCommands = buildCoreCommands();
            await ctx.controller.configIos(CORE_NAME, coreCommands);

            const accessSwitchCommands = [
              buildAccessSwitchCommands("SW1", VLAN_USERS, 2),
              buildAccessSwitchCommands("SW2", VLAN_USERS, 3),
              buildAccessSwitchCommands("SW3", VLAN_ADMIN, 4),
              buildAccessSwitchCommands("SW4", VLAN_ADMIN, 5),
            ];

            for (let i = 0; i < accessSwitchCommands.length; i++) {
              await ctx.controller.configIos(switchNames[i]!, accessSwitchCommands[i]!);
            }

            await ctx.controller.configHost("PC1", { dhcp: true });
            await ctx.controller.configHost("PC2", { dhcp: true });
            await ctx.controller.configHost("PC3", { dhcp: true });
            await ctx.controller.configHost("PC4", { dhcp: true });
            await ctx.controller.configHost(SERVER_NAME, {
              ip: SERVER_IP,
              mask: "255.255.255.0",
              gateway: "192.168.30.1",
              dns: SERVER_IP,
            });

            await new Promise((resolve) => setTimeout(resolve, 1500));

            const snapshot = materialization.snapshot ?? (await ctx.controller.snapshot());
            const coreRunningConfig = (await ctx.controller.showRunningConfig(CORE_NAME)).raw;
            const coreVlanResult = await ctx.controller.showVlan(CORE_NAME);
            const coreInterfaces = await ctx.controller.showIpInterfaceBrief(CORE_NAME);

            const pc1 = await ctx.controller.inspectDevice("PC1");
            const server = await ctx.controller.inspectDevice(SERVER_NAME);
            const switchMgmt = [
              await ctx.controller.inspectDevice("SW1"),
              await ctx.controller.inspectDevice("SW2"),
              await ctx.controller.inspectDevice("SW3"),
              await ctx.controller.inspectDevice("SW4"),
            ];

            const checks = summarizeChecks({
              deviceCount: materialization.devices.length,
              linkCount: Object.keys(snapshot.links).length,
              coreRunningConfig,
              coreVlans: coreVlanResult.vlans.map((vlan) => vlan.id),
              coreInterfacesUp: coreInterfaces.interfaces.map(
                (iface) => `${iface.interface} ${iface.status}/${iface.protocol}`,
              ),
              pc1Dhcp: pc1.dhcp === true,
              serverIp: server.ip,
              serverGateway: server.gateway,
              mgmtSwitches: switchMgmt.map((item) => ({ name: item.name, ip: item.ip })),
            });

            const verified = checks.every((check) => check.ok);

            const resultData: LiftResult = {
              scenario: SCENARIO_NAME,
              cleared,
              devicesCreated: plan.devices.length,
              linksCreated: plan.links.length,
              core: CORE_NAME,
              switches: switchNames,
              pcs: pcNames,
              server: SERVER_NAME,
              warnings: [...plan.notes],
            };

            if (verified) {
              return createVerifiedResult("lab.lift", resultData, {
                verified: true,
                partiallyVerified: false,
                checks,
                warnings: [...plan.notes],
                verificationSource: [
                  "snapshot",
                  "show running-config",
                  "show vlan",
                  "show ip interface brief",
                  "inspect",
                ],
              }) as CliResult<LiftResult>;
            }

            return createVerifiedResult("lab.lift", resultData, {
              verified: false,
              partiallyVerified: true,
              checks,
              warnings: [
                ...plan.notes,
                "La automatización de servicios DNS/WEB/EMAIL del Server-PT no está expuesta por la API actual.",
              ],
              verificationSource: [
                "snapshot",
                "show running-config",
                "show vlan",
                "show ip interface brief",
                "inspect",
              ],
            }) as CliResult<LiftResult>;
          } catch (error) {
            return createErrorResult("lab.lift", {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<LiftResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && !flags.quiet) {
        console.log("\n✅ Laboratorio levantado");
      }

      if (!result.ok) {
        process.exit(1);
      }
    });

  const examples = getExamples("lab lift");
  const related = getRelatedCommands("lab lift");
  cmd.addHelpText("after", formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
