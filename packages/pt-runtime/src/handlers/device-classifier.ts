import type { PTDevice } from "../utils/helpers";
import { DEVICE_TYPES } from "../utils/constants";

const END_DEVICE_TYPES = new Set<number>([
  DEVICE_TYPES.pc as number,
  DEVICE_TYPES.server as number,
  DEVICE_TYPES.printer as number,
  DEVICE_TYPES.ipPhone as number,
  DEVICE_TYPES.laptop as number,
  DEVICE_TYPES.tablet as number,
  DEVICE_TYPES.smartphone as number,
  DEVICE_TYPES.wirelessEndDevice as number,
  DEVICE_TYPES.wiredEndDevice as number,
  DEVICE_TYPES.tv as number,
  DEVICE_TYPES.homeVoip as number,
  DEVICE_TYPES.analogPhone as number,
  DEVICE_TYPES.iot as number,
  DEVICE_TYPES.sniffer as number,
  DEVICE_TYPES.mcu as number,
  DEVICE_TYPES.sbc as number,
]);

export function isEndDevice(device: PTDevice): boolean {
  try {
    return END_DEVICE_TYPES.has(device.getType());
  } catch {
    return false;
  }
}
