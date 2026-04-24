import type { PtDeps } from "../pt-api/pt-deps.js";
import { ptError, ptSuccess, PtErrorCode, type PtResult } from "../pt-api/pt-results.js";
import type { PTVlanManager, PTDeviceWithProcesses } from "../pt-api/pt-processes.js";
import type { PTHostPort } from "../pt-api/pt-api-registry.js";
import { getVlanManager } from "../pt-api/pt-processes.js";

/**
 * Payload para asegurar que existen VLANs en un dispositivo.
 * Crea las VLANs que no existan; ignora las que ya están.
 */
export interface EnsureVlansPayload {
  type: "ensureVlans";
  device: string;
  vlans: Array<{ id: number; name?: string }>;
}

/**
 * Payload para configurar interfaces VLAN (SVI) en un dispositivo.
 * Cada interfaz puede ser mode access o trunk, con IP opcional.
 * 
 * @example
 * // Crear VLAN 10 y asignar interface
 * {
 *   type: "configVlanInterfaces",
 *   device: "Switch1",
 *   interfaces: [{ interface: "Vlan10", vlanId: 10, ip: "192.168.10.1", mask: "255.255.255.0" }]
 * }
 */
export interface ConfigVlanInterfacesPayload {
  type: "configVlanInterfaces";
  device: string;
  interfaces: Array<{
    interface: string;
    vlanId: number;
    mode?: "access" | "trunk";
    ip?: string;
    mask?: string;
  }>;
}

function getDeviceWithProcesses(deps: PtDeps, name: string): PTDeviceWithProcesses | null {
  const device = deps.getDeviceByName(name);
  return device ? (device as unknown as PTDeviceWithProcesses) : null;
}

function getVlanMgr(device: PTDeviceWithProcesses): PTVlanManager | null {
  const { process } = getVlanManager(device);
  return process;
}

function vlanExists(vlanMgr: PTVlanManager, vlanId: number): boolean {
  const count = vlanMgr.getVlanCount();
  for (let i = 0; i < count; i++) {
    const existing = vlanMgr.getVlanAt(i);
    if (existing && existing.id === vlanId) return true;
  }
  return false;
}

function ensureVlanInt(vlanMgr: PTVlanManager, vlanId: number): PTHostPort | null {
  let svi = vlanMgr.getVlanInt(vlanId);
  if (!svi && vlanMgr.addVlanInt(vlanId)) {
    svi = vlanMgr.getVlanInt(vlanId);
  }
  return svi;
}

/**
 * Asegura que las VLANs especificadas existan en el dispositivo.
 * Si una VLAN ya existe, la ignora. Si no existe, la crea.
 * 
 * @param payload - EnsureVlansPayload con device y lista de vlans
 * @param deps - PtDeps con acceso a red y fileManager
 * @returns PtResult convlans creados y errores si hubo
 * 
 * @example
 * handleEnsureVlans({ type: "ensureVlans", device: "S1", vlans: [{id: 10, name: "DATA"}, {id: 20}] }, deps)
 * // → { ok: true, device: "S1", vlans: [{id: 10, name: "DATA", created: true}, {id: 20, name: "VLAN20", created: true}] }
 */
export function handleEnsureVlans(payload: EnsureVlansPayload, deps: PtDeps): PtResult {
  const device = getDeviceWithProcesses(deps, payload.device);
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const vlanMgr = getVlanMgr(device);
  if (!vlanMgr)
    return ptError(
      `VlanManager not available on device: ${payload.device}`,
      PtErrorCode.UNSUPPORTED_OPERATION,
    );

  const results: Array<{ id: number; name: string; created: boolean; error?: string }> = [];

  for (const vlan of payload.vlans || []) {
    const vlanId = vlan.id;
    const vlanName = vlan.name || `VLAN${vlanId}`;
    try {
      const found = vlanExists(vlanMgr, vlanId);
      if (!found) {
        const added = vlanMgr.addVlan(vlanId, vlanName);
        results.push({ id: vlanId, name: vlanName, created: !!added });
      } else {
        results.push({ id: vlanId, name: vlanName, created: false });
      }
    } catch (error) {
      results.push({
        id: vlanId,
        name: vlanName,
        created: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return ptSuccess({ device: payload.device, vlans: results });
}

/**
 * Configura interfaces VLAN (SVI) en un dispositivo.
 * Crea la VLAN si no existe, luego configura la interfaz con IP y modo.
 * 
 * @param payload - ConfigVlanInterfacesPayload con device, interfaces a configurar
 * @param deps - PtDeps con acceso a red y fileManager
 * @returns PtResult con éxito o error por cada interfaz
 * 
 * @example
 * handleConfigVlanInterfaces({
 *   type: "configVlanInterfaces",
 *   device: "Router1",
 *   interfaces: [
 *     { interface: "Vlan10", vlanId: 10, ip: "10.0.10.1", mask: "255.255.255.0" }
 *   ]
 * }, deps)
 */
export function handleConfigVlanInterfaces(
  payload: ConfigVlanInterfacesPayload,
  deps: PtDeps,
): PtResult {
  const device = getDeviceWithProcesses(deps, payload.device);
  if (!device) return ptError(`Device not found: ${payload.device}`, PtErrorCode.DEVICE_NOT_FOUND);

  const vlanMgr = getVlanMgr(device);
  if (!vlanMgr)
    return ptError(
      `VlanManager not available on device: ${payload.device}`,
      PtErrorCode.UNSUPPORTED_OPERATION,
    );

  const results: Array<{ interface: string; vlanId: number; success: boolean; error?: string }> =
    [];

  for (const iface of payload.interfaces || []) {
    try {
      if (!vlanExists(vlanMgr, iface.vlanId)) {
        const created = vlanMgr.addVlan(iface.vlanId, `VLAN${iface.vlanId}`);
        if (!created) {
          results.push({
            interface: iface.interface,
            vlanId: iface.vlanId,
            success: false,
            error: "Failed to create VLAN",
          });
          continue;
        }
      }

      const svi = ensureVlanInt(vlanMgr, iface.vlanId);
      if (!svi) {
        results.push({
          interface: iface.interface,
          vlanId: iface.vlanId,
          success: false,
          error: "Failed to get or create SVI interface",
        });
        continue;
      }

      if (iface.ip && iface.mask) {
        svi.setIpSubnetMask(iface.ip, iface.mask);
      }

      results.push({ interface: iface.interface, vlanId: iface.vlanId, success: true });
    } catch (error) {
      results.push({
        interface: iface.interface,
        vlanId: iface.vlanId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return ptSuccess({ device: payload.device, interfaces: results });
}
