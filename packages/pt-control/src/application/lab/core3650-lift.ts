export interface LabLiftDeviceSpec {
  name: string;
  model: string;
  x: number;
  y: number;
}

export interface LabLiftLinkSpec {
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  cableType: "straight";
}

export interface LabLiftScenarioPlan {
  devices: LabLiftDeviceSpec[];
  links: LabLiftLinkSpec[];
  notes: string[];
}

export interface LabLiftResult {
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

export interface LabLiftVerificationCheck {
  name: string;
  ok: boolean;
  details?: Record<string, unknown>;
}

export interface LabLiftVerification {
  verified: boolean;
  partiallyVerified: boolean;
  checks: LabLiftVerificationCheck[];
  warnings: string[];
  verificationSource: string[];
}

export type LabLiftUseCaseResult =
  | {
      ok: true;
      data: LabLiftResult;
      verification: LabLiftVerification;
    }
  | {
      ok: false;
      error: {
        message: string;
        details?: Record<string, unknown>;
      };
    };

export interface LabLiftControllerPort {
  clearTopology(): Promise<{
    removedDevices: number;
    removedLinks: number;
    remainingDevices: number;
    remainingLinks: number;
  }>;

  addDevice(
    name: string,
    model: string,
    options?: { x?: number; y?: number },
  ): Promise<unknown>;

  listDevices(): Promise<{ devices: Array<{ name: string }> } | Array<{ name: string }>>;

  execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<unknown>;

  getTopologyCache(): { refreshFromState(): void };

  snapshot(): Promise<{
    devices: Record<string, unknown>;
    links: Record<string, unknown>;
  }>;

  addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType: "straight",
  ): Promise<unknown>;

  configIos(device: string, commands: string[]): Promise<void>;

  configHost(
    device: string,
    options: {
      ip?: string;
      mask?: string;
      gateway?: string;
      dns?: string;
      dhcp?: boolean;
    },
  ): Promise<void>;

  showRunningConfig(device: string): Promise<{ raw: string }>;

  showVlan(device: string): Promise<{
    vlans: Array<{ id: number; name?: string; status?: string }>;
  }>;

  showIpInterfaceBrief(device: string): Promise<{
    interfaces: Array<{ interface: string; status: string; protocol: string }>;
  }>;

  inspectDevice(device: string): Promise<{
    name: string;
    dhcp?: boolean;
    ip?: string;
    gateway?: string;
  }>;
}

export interface ExecuteCore3650LiftOptions {
  controller: LabLiftControllerPort;
  logPhase?: (phase: string, metadata?: Record<string, unknown>) => Promise<void>;
  beforeClearBridgeQueue?: () => Promise<void>;
  maxAttempts?: number;
  delayMs?: number;
  postConfigDelayMs?: number;
}

export const CORE3650_LIFT_SCENARIO_NAME = "CORE3650-4SW-4PC-SERVER";

const CORE_NAME = "CORE3650";
const SERVER_NAME = "SRV1";
const CORE_SERVER_PORT = "FastEthernet0/5";

const MGMT_GATEWAY = "192.168.99.1";
const SERVER_IP = "192.168.30.10";

const VLAN_USERS = 10;
const VLAN_ADMIN = 20;
const VLAN_SERVERS = 30;
const VLAN_MGMT = 99;

const SWITCH_NAMES = ["SW1", "SW2", "SW3", "SW4"] as const;
const PC_NAMES = ["PC1", "PC2", "PC3", "PC4"] as const;

export function buildCore3650LiftScenarioPlan(): LabLiftScenarioPlan {
  const devices: LabLiftDeviceSpec[] = [
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

  const links: LabLiftLinkSpec[] = [
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

export function buildCore3650LiftCoreCommands(): string[] {
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

    "interface FastEthernet0/1",
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",

    "interface FastEthernet0/2",
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",

    "interface FastEthernet0/3",
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",

    "interface FastEthernet0/4",
    " switchport mode trunk",
    ` switchport trunk native vlan ${VLAN_MGMT}`,
    ` switchport trunk allowed vlan ${VLAN_USERS},${VLAN_ADMIN},${VLAN_SERVERS},${VLAN_MGMT}`,
    " no shutdown",
    " exit",
  ];
}

export function buildCore3650LiftAccessSwitchCommands(
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

export function buildCore3650LiftPlanText(plan = buildCore3650LiftScenarioPlan()): string {
  const lines: string[] = [];

  lines.push("Plan de ejecución:");
  lines.push("  1. Limpiar la topología existente");
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

function normalizeDeviceList(
  result: { devices: Array<{ name: string }> } | Array<{ name: string }>,
): Array<{ name: string }> {
  return Array.isArray(result) ? result : result.devices;
}

async function waitForDeviceNames(
  controller: Pick<LabLiftControllerPort, "listDevices">,
  expectedNames: string[],
  maxAttempts: number,
  delayMs: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const devices = normalizeDeviceList(await controller.listDevices());
    const names = new Set(devices.map((device) => device.name));

    if (expectedNames.every((name) => names.has(name))) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return false;
}

async function enablePrivilegedMode(
  controller: Pick<LabLiftControllerPort, "execInteractive">,
  device: string,
): Promise<void> {
  try {
    await controller.execInteractive(device, "enable", {
      timeout: 5000,
      parse: false,
      ensurePrivileged: true,
    });
  } catch {
    // Si ya está en modo privilegiado o el dispositivo todavía está convergiendo,
    // la configuración posterior tendrá su propio error verificable.
  }
}

async function waitForTopologyMaterialization(
  controller: Pick<LabLiftControllerPort, "snapshot" | "listDevices">,
  expectedDeviceNames: string[],
  expectedLinkCount: number,
  maxAttempts: number,
  delayMs: number,
): Promise<{
  devices: Array<{ name: string }>;
  snapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null;
}> {
  let latestSnapshot: { devices: Record<string, unknown>; links: Record<string, unknown> } | null =
    null;
  let latestDevices: Array<{ name: string }> = [];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    latestDevices = normalizeDeviceList(await controller.listDevices());
    latestSnapshot = await controller.snapshot();

    const names = new Set(latestDevices.map((device) => device.name));
    const linkCount = Object.keys(latestSnapshot.links ?? {}).length;

    if (expectedDeviceNames.every((name) => names.has(name)) && linkCount >= expectedLinkCount) {
      return { devices: latestDevices, snapshot: latestSnapshot };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { devices: latestDevices, snapshot: latestSnapshot };
}

export function summarizeCore3650LiftChecks(snapshot: {
  deviceCount: number;
  linkCount: number;
  coreRunningConfig: string;
  coreVlans: number[];
  coreInterfacesUp: string[];
  pc1Dhcp: boolean;
  serverIp?: string;
  serverGateway?: string;
  mgmtSwitches: Array<{ name: string; ip?: string }>;
}): LabLiftVerificationCheck[] {
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

export async function executeCore3650LiftLab(
  options: ExecuteCore3650LiftOptions,
): Promise<LabLiftUseCaseResult> {
  const controller = options.controller;
  const maxAttempts = options.maxAttempts ?? 20;
  const delayMs = options.delayMs ?? 500;
  const postConfigDelayMs = options.postConfigDelayMs ?? 1500;
  const plan = buildCore3650LiftScenarioPlan();

  try {
    await options.logPhase?.("prepare", { scenario: CORE3650_LIFT_SCENARIO_NAME });
    await options.beforeClearBridgeQueue?.();

    let cleared = { removedDevices: 0, removedLinks: 0 };

    try {
      const clearedTopology = await controller.clearTopology();
      cleared = {
        removedDevices: clearedTopology.removedDevices,
        removedLinks: clearedTopology.removedLinks,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await options.logPhase?.("warn", {
        message: `No se pudo limpiar la topología previa: ${message}`,
      });
    }

    for (const device of plan.devices) {
      await controller.addDevice(device.name, device.model, {
        x: device.x,
        y: device.y,
      });
    }

    const expectedNames = plan.devices.map((device) => device.name);
    const deviceNamesReady = await waitForDeviceNames(
      controller,
      expectedNames,
      maxAttempts,
      delayMs,
    );

    if (!deviceNamesReady) {
      return {
        ok: false,
        error: {
          message:
            "Los dispositivos no materializaron a tiempo en Packet Tracer. Revisa que la topología esté lista y vuelve a intentar.",
        },
      };
    }

    for (const device of [CORE_NAME, ...SWITCH_NAMES]) {
      await enablePrivilegedMode(controller, device);
    }

    controller.getTopologyCache().refreshFromState();

    for (const link of plan.links) {
      await controller.addLink(
        link.fromDevice,
        link.fromPort,
        link.toDevice,
        link.toPort,
        link.cableType,
      );
    }

    controller.getTopologyCache().refreshFromState();

    const materialization = await waitForTopologyMaterialization(
      controller,
      expectedNames,
      plan.links.length,
      maxAttempts,
      delayMs,
    );

    const coreCommands = buildCore3650LiftCoreCommands();
    await controller.configIos(CORE_NAME, coreCommands);

    const accessSwitchCommands = [
      buildCore3650LiftAccessSwitchCommands("SW1", VLAN_USERS, 2),
      buildCore3650LiftAccessSwitchCommands("SW2", VLAN_USERS, 3),
      buildCore3650LiftAccessSwitchCommands("SW3", VLAN_ADMIN, 4),
      buildCore3650LiftAccessSwitchCommands("SW4", VLAN_ADMIN, 5),
    ];

    for (let i = 0; i < accessSwitchCommands.length; i++) {
      await controller.configIos(SWITCH_NAMES[i]!, accessSwitchCommands[i]!);
    }

    await controller.configHost("PC1", { dhcp: true });
    await controller.configHost("PC2", { dhcp: true });
    await controller.configHost("PC3", { dhcp: true });
    await controller.configHost("PC4", { dhcp: true });

    await controller.configHost(SERVER_NAME, {
      ip: SERVER_IP,
      mask: "255.255.255.0",
      gateway: "192.168.30.1",
      dns: SERVER_IP,
    });

    await new Promise((resolve) => setTimeout(resolve, postConfigDelayMs));

    const snapshot = await controller.snapshot();
    const coreRunningConfig = (await controller.showRunningConfig(CORE_NAME)).raw;
    const coreVlanResult = await controller.showVlan(CORE_NAME);
    const coreInterfaces = await controller.showIpInterfaceBrief(CORE_NAME);

    const pc1 = await controller.inspectDevice("PC1");
    const server = await controller.inspectDevice(SERVER_NAME);
    const switchMgmt = await Promise.all(
      SWITCH_NAMES.map((switchName) => controller.inspectDevice(switchName)),
    );

    const checks = summarizeCore3650LiftChecks({
      deviceCount: materialization.devices.length,
      linkCount: Object.keys(snapshot.links).length,
      coreRunningConfig,
      coreVlans: coreVlanResult.vlans.map((vlan) => Number(vlan.id)),
      coreInterfacesUp: coreInterfaces.interfaces.map(
        (iface) => `${iface.interface} ${iface.status}/${iface.protocol}`,
      ),
      pc1Dhcp: pc1.dhcp === true,
      serverIp: server.ip,
      serverGateway: server.gateway,
      mgmtSwitches: switchMgmt.map((item) => ({ name: item.name, ip: item.ip })),
    });

    const verified = checks.every((check) => check.ok);

    const resultData: LabLiftResult = {
      scenario: CORE3650_LIFT_SCENARIO_NAME,
      cleared,
      devicesCreated: plan.devices.length,
      linksCreated: plan.links.length,
      core: CORE_NAME,
      switches: [...SWITCH_NAMES],
      pcs: [...PC_NAMES],
      server: SERVER_NAME,
      warnings: [...plan.notes],
    };

    const verificationWarnings = verified
      ? [...plan.notes]
      : [
          ...plan.notes,
          "La automatización de servicios DNS/WEB/EMAIL del Server-PT no está expuesta por la API actual.",
        ];

    return {
      ok: true,
      data: resultData,
      verification: {
        verified,
        partiallyVerified: !verified,
        checks,
        warnings: verificationWarnings,
        verificationSource: [
          "snapshot",
          "show running-config",
          "show vlan",
          "show ip interface brief",
          "inspect",
        ],
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? { stack: error.stack } : undefined,
      },
    };
  }
}
