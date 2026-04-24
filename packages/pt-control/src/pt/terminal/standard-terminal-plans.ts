import type { TerminalPlan, TerminalPlanStep } from "../../ports/runtime-terminal-port.js";

export type StandardTerminalProfile = "ios" | "host";

function buildSteps(commands: string[], timeout?: number): TerminalPlanStep[] {
  return commands.map((command) => ({
    command,
    timeout,
  }));
}

export function createIosShowPlan(
  device: string,
  command: string,
  options?: {
    id?: string;
    timeout?: number;
    expectedPrompt?: string;
  },
): TerminalPlan {
  const step: TerminalPlanStep = {
    command,
    timeout: options?.timeout ?? 15000,
    expectedPrompt: options?.expectedPrompt,
  };

  return {
    id: options?.id ?? `ios-show-${Date.now()}`,
    device,
    steps: [step],
  };
}

export function createIosConfigPlan(
  device: string,
  commands: string[],
  options?: {
    id?: string;
    timeout?: number;
    save?: boolean;
  },
): TerminalPlan {
  const timeout = options?.timeout ?? 15000;
  const sequence = ["configure terminal", ...commands, "end"];

  if (options?.save) {
    sequence.push("copy running-config startup-config");
  }

  return {
    id: options?.id ?? `ios-config-${Date.now()}`,
    device,
    steps: buildSteps(sequence, timeout),
  };
}

export function createIosEnablePlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return {
    id: options?.id ?? `ios-enable-${Date.now()}`,
    device,
    steps: buildSteps(["enable"], options?.timeout ?? 10000),
  };
}

export function createIosRunningConfigPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show running-config", {
    id: options?.id ?? `ios-running-config-${Date.now()}`,
    timeout: options?.timeout ?? 20000,
  });
}

export function createIosShowVersionPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show version", {
    id: options?.id ?? `ios-show-version-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostCommandPlan(
  device: string,
  command: string,
  options?: {
    id?: string;
    timeout?: number;
    expectedPrompt?: string;
  },
): TerminalPlan {
  return {
    id: options?.id ?? `host-cmd-${Date.now()}`,
    device,
    steps: [
      {
        command,
        timeout: options?.timeout ?? 20000,
        expectedPrompt: options?.expectedPrompt,
      },
    ],
  };
}

export function createHostIpconfigPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "ipconfig /all", {
    id: options?.id ?? `host-ipconfig-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostPingPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `ping ${target}`, {
    id: options?.id ?? `host-ping-${Date.now()}`,
    timeout: options?.timeout ?? 20000,
  });
}

export function createTerminalPlanFromInput(input: {
  device: string;
  profile?: StandardTerminalProfile;
  command?: string;
  commands?: string[];
  save?: boolean;
  target?: string;
  timeout?: number;
  expectedPrompt?: string;
}): TerminalPlan {
  const profile = input.profile ?? "ios";

  if (profile === "host") {
    if (input.command) {
      return createHostCommandPlan(input.device, input.command, {
        timeout: input.timeout,
        expectedPrompt: input.expectedPrompt,
      });
    }

    if (input.target) {
      return createHostPingPlan(input.device, input.target, {
        timeout: input.timeout,
      });
    }

    return createHostIpconfigPlan(input.device, {
      timeout: input.timeout,
    });
  }

  if (input.commands && input.commands.length > 0) {
    return createIosConfigPlan(input.device, input.commands, {
      timeout: input.timeout,
      save: input.save,
    });
  }

  if (input.command) {
    return createIosShowPlan(input.device, input.command, {
      timeout: input.timeout,
      expectedPrompt: input.expectedPrompt,
    });
  }

  return createIosShowVersionPlan(input.device, {
    timeout: input.timeout,
  });
}

export function createIosShowIpInterfaceBriefPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show ip interface brief", {
    id: options?.id ?? `ios-show-ip-int-brief-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowVlanBriefPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show vlan brief", {
    id: options?.id ?? `ios-show-vlan-brief-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowCdpNeighborsPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show cdp neighbors", {
    id: options?.id ?? `ios-show-cdp-neighbors-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostTracertPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `tracert ${target}`, {
    id: options?.id ?? `host-tracert-${Date.now()}`,
    timeout: options?.timeout ?? 30000,
  });
}

export function createHostArpPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "arp -a", {
    id: options?.id ?? `host-arp-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostNslookupPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `nslookup ${target}`, {
    id: options?.id ?? `host-nslookup-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostNetstatPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "netstat", {
    id: options?.id ?? `host-netstat-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostHistoryPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  // En PCs de PT el historial se ve a menudo solo subiendo (UP arrow) 
  // pero "history" a veces funciona o se puede simular. 
  // Aquí usamos el comando 'history' si existe o simplemente un comando genérico.
  return createHostCommandPlan(device, "history", {
    id: options?.id ?? `host-history-${Date.now()}`,
    timeout: options?.timeout ?? 10000,
  });
}

export function createHostTelnetPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `telnet ${target}`, {
    id: options?.id ?? `host-telnet-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostSshPlan(
  device: string,
  user: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `ssh -l ${user} ${target}`, {
    id: options?.id ?? `host-ssh-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostRoutePlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "route print", {
    id: options?.id ?? `host-route-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowIpRoutePlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show ip route", {
    id: options?.id ?? `ios-show-ip-route-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowMacAddressTablePlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show mac address-table", {
    id: options?.id ?? `ios-show-mac-table-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}
