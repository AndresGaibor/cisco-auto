// ============================================================================
// Terminal Regression Profile - Smoke tests para terminal IOS y host
// ============================================================================

export interface TerminalRegressionCase {
  id: string;
  description: string;
  device: string;
  command: string;
  tags: string[];
  expectedPromptPattern?: string;
  expectedOutputIncludes?: string[];
  expectedErrorIncludes?: string[];
  expectedModeChange?: string;
  maxDurationMs: number;
}

export const terminalRegressionCases: TerminalRegressionCase[] = [
  // ========================================================================
  // IOS básico
  // ========================================================================
  {
    id: "ios-show-clock",
    description: "show clock en exec privilegiado",
    device: "ABEJITA",
    command: "show clock",
    tags: ["ios", "show", "short-output"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["clock", ":"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-show-version",
    description: "show version para ver version IOS",
    device: "ABEJITA",
    command: "show version",
    tags: ["ios", "show"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["IOS", "Version"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-show-privilege",
    description: "show privilege para ver nivel actual",
    device: "ABEJITA",
    command: "show privilege",
    tags: ["ios", "show"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["privilege", "exec"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-enable",
    description: "enable para entrar a modo privilegiado",
    device: "ABEJITA",
    command: "enable",
    tags: ["ios", "config"],
    expectedPromptPattern: "#",
    expectedModeChange: "privileged",
    maxDurationMs: 10000,
  },
  {
    id: "ios-disable",
    description: "disable para volver a user exec",
    device: "ABEJITA",
    command: "disable",
    tags: ["ios", "config"],
    expectedPromptPattern: ">",
    expectedModeChange: "user",
    maxDurationMs: 10000,
  },
  {
    id: "ios-config-t",
    description: "conf t para entrar a configure terminal",
    device: "ABEJITA",
    command: "conf t",
    tags: ["ios", "config"],
    expectedPromptPattern: "(config)#",
    expectedOutputIncludes: ["configuration"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-exit",
    description: "exit para volver al modo anterior",
    device: "ABEJITA",
    command: "exit",
    tags: ["ios", "config"],
    expectedPromptPattern: "#",
    maxDurationMs: 10000,
  },
  {
    id: "ios-end",
    description: "end para volver a privileged exec",
    device: "ABEJITA",
    command: "end",
    tags: ["ios", "config"],
    expectedPromptPattern: "#",
    expectedModeChange: "privileged",
    maxDurationMs: 10000,
  },
  {
    id: "ios-interface",
    description: "interface fa0/1 para entrar a config-if",
    device: "ABEJITA",
    command: "interface fa0/1",
    tags: ["ios", "config"],
    expectedPromptPattern: "(config-if)#",
    expectedOutputIncludes: ["FastEthernet0/1"],
    maxDurationMs: 10000,
  },

  // ========================================================================
  // Pager (casos críticos)
  // ========================================================================
  {
    id: "ios-show-running-config",
    description: "show running-config con paginacion automatica",
    device: "ABEJITA",
    command: "show running-config",
    tags: ["ios", "show", "pager", "long-output"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["building configuration", "configuration"],
    maxDurationMs: 70000,
  },
  {
    id: "ios-show-interfaces",
    description: "show interfaces con paginacion",
    device: "ABEJITA",
    command: "show interfaces",
    tags: ["ios", "show", "pager"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["FastEthernet", "GigabitEthernet"],
    maxDurationMs: 70000,
  },
  {
    id: "ios-show-spanning-tree",
    description: "show spanning-tree con paginacion",
    device: "ABEJITA",
    command: "show spanning-tree",
    tags: ["ios", "show", "pager"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["spanning tree", "vlan"],
    maxDurationMs: 70000,
  },
  {
    id: "ios-show-mac-address-table",
    description: "show mac address-table dynamic",
    device: "ABEJITA",
    command: "show mac address-table dynamic",
    tags: ["ios", "show", "pager"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["mac address table", "dynamic"],
    maxDurationMs: 70000,
  },

  // ========================================================================
  // Confirm prompts
  // ========================================================================
  {
    id: "ios-copy-running-config",
    description: "copy running-config startup-config con confirm",
    device: "ABEJITA",
    command: "copy running-config startup-config",
    tags: ["ios", "confirm"],
    expectedPromptPattern: "[confirm]",
    expectedOutputIncludes: ["destination filename"],
    maxDurationMs: 15000,
  },
  {
    id: "ios-write-memory",
    description: "write memory con confirm",
    device: "ABEJITA",
    command: "write memory",
    tags: ["ios", "confirm"],
    expectedPromptPattern: "[confirm]",
    expectedOutputIncludes: ["building configuration"],
    maxDurationMs: 15000,
  },

  // ========================================================================
  // Errores semánticos
  // ========================================================================
  {
    id: "ios-invalid-command",
    description: "comando invalido muestra % Invalid input detected",
    device: "ABEJITA",
    command: "show esto-no-existe",
    tags: ["ios", "semantic-error"],
    expectedPromptPattern: "#",
    expectedErrorIncludes: ["% Invalid input detected", "% incomplete command"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-incomplete-command",
    description: "comando incompleto muestra error",
    device: "ABEJITA",
    command: "show",
    tags: ["ios", "semantic-error"],
    expectedErrorIncludes: ["% incomplete command"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-ambiguous-command",
    description: "comando ambiguo muestra % ambiguous command",
    device: "ABEJITA",
    command: "show i",
    tags: ["ios", "semantic-error"],
    expectedErrorIncludes: ["% ambiguous command"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-wrong-mode",
    description: "conf t en user exec debe fallar",
    device: "ABEJITA",
    command: "conf t",
    tags: ["ios", "semantic-error"],
    expectedErrorIncludes: ["% Invalid input detected"],
    maxDurationMs: 10000,
  },

  // ========================================================================
  // Host
  // ========================================================================
  {
    id: "host-ipconfig",
    description: "IPCONFIG /all para ver IP completa",
    device: "PC0",
    command: "ipconfig /all",
    tags: ["host", "show"],
    expectedOutputIncludes: ["IP Address", "Subnet Mask"],
    maxDurationMs: 10000,
  },
  {
    id: "host-ping-success",
    description: "ping a loopback 127.0.0.1",
    device: "PC0",
    command: "ping 127.0.0.1",
    tags: ["host", "ping"],
    expectedOutputIncludes: ["Reply from 127.0.0.1"],
    maxDurationMs: 15000,
  },
  {
    id: "host-ping-timeout",
    description: "ping a direccion no alcanzable",
    device: "PC0",
    command: "ping 10.255.255.255",
    tags: ["host", "ping"],
    expectedOutputIncludes: ["Request timed out", "timed out"],
    maxDurationMs: 20000,
  },
  {
    id: "host-invalid",
    description: "comando host invalido",
    device: "PC0",
    command: "comando-invalido",
    tags: ["host", "semantic-error"],
    expectedErrorIncludes: ["is not recognized"],
    maxDurationMs: 10000,
  },

  // ========================================================================
  // Edge cases
  // ========================================================================
  {
    id: "ios-empty-output",
    description: "comando que puede devolver salida vacia",
    device: "ABEJITA",
    command: "show debugging",
    tags: ["ios", "short-output"],
    maxDurationMs: 10000,
  },
  {
    id: "ios-long-output",
    description: "show log para salida larga",
    device: "ABEJITA",
    command: "show log",
    tags: ["ios", "long-output"],
    expectedPromptPattern: "#",
    maxDurationMs: 70000,
  },
  {
    id: "ios-syslog-interleaved",
    description: "comando durante syslog intercalado",
    device: "ABEJITA",
    command: "show version",
    tags: ["ios", "show", "syslog"],
    expectedPromptPattern: "#",
    expectedOutputIncludes: ["IOS", "Version"],
    maxDurationMs: 10000,
  },
];
