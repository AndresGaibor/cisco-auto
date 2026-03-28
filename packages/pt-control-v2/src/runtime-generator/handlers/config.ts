// ============================================================================
// Config Handlers - Pure functions for device configuration
// ============================================================================

import { HandlerDeps, HandlerResult, PTCommandLine, PTDevice, PTPort } from "../utils/helpers";
import { getParser } from "./ios-parsers";

// ============================================================================
// Payload Types
// ============================================================================

export interface ConfigHostPayload {
  type: "configHost";
  device: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface ConfigIosPayload {
  type: "configIos";
  device: string;
  commands: string[];
  save?: boolean;
}

export interface ExecIosPayload {
  type: "execIos";
  device: string;
  command: string;
  parse?: boolean;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Configure a host device (PC, Server, etc.)
 */
export function handleConfigHost(payload: ConfigHostPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}` };
  }

  const port = device.getPortAt(0);
  if (!port) {
    return { ok: false, error: "No ports on device" };
  }

  if (payload.dhcp === true) {
    // Enable DHCP
    try {
      port.setDhcpEnabled(true);
    } catch {
      // Some PT versions don't support this
    }
  } else {
    if (payload.ip && payload.mask) {
      port.setIpSubnetMask(payload.ip, payload.mask);
    }
    if (payload.gateway) {
      port.setDefaultGateway(payload.gateway);
    }
    if (payload.dns) {
      port.setDnsServerIp(payload.dns);
    }
  }

  return {
    ok: true,
    device: payload.device,
    ip: payload.ip,
    mask: payload.mask,
    gateway: payload.gateway,
  };
}

/**
 * Configure IOS device with multiple commands
 */
export function handleConfigIos(payload: ConfigIosPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}` };
  }

  const term = ensureIosTerm(device);
  if (!term) {
    return { ok: false, error: "Device does not support CLI" };
  }

  const results: Array<{ command: string; result: [number, string] }> = [];
  for (const cmd of payload.commands) {
    const result = term.enterCommand(cmd);
    results.push({ command: cmd, result });
  }

  // Save configuration by default
  if (payload.save !== false) {
    term.enterCommand("write memory");
  }

  return {
    ok: true,
    device: payload.device,
    executed: results.length,
    results,
  };
}

/**
 * Execute a single IOS command and optionally parse the output
 */
export function handleExecIos(payload: ExecIosPayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}` };
  }

  // Check if device supports direct command execution
  if (!device.enterCommand) {
    return { ok: false, error: "Device does not support enterCommand" };
  }

  const term = device.getCommandLine();
  if (!term) {
    return { ok: false, error: `Device not ready: ${payload.device} is still booting or in ROMMON` };
  }

  const response = term.enterCommand(payload.command);
  const status = response?.[0];
  const output = response?.[1] || "";

  const result: HandlerResult = {
    ok: status === 0,
    raw: output,
    status,
  };

  // Parse output if requested (default: true)
  if (payload.parse !== false) {
    const parser = getParser(payload.command);
    if (parser) {
      try {
        result.parsed = parser(output);
      } catch (e) {
        result.parseError = String(e);
      }
    }
  }

  return result;
}

function ensureIosTerm(device: PTDevice): PTCommandLine | null {
  let term = device.getCommandLine();
  if (term) {
    return term;
  }

  return null;
}
