import type { PTDevice } from "../utils/helpers";
import { DEVICE_TYPES } from "../utils/constants";

export function recommendCableType(device1: PTDevice, device2: PTDevice): string {
  const type1 = device1.getType();
  const type2 = device2.getType();
  const isSwitchLike = (type: number) =>
    type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;

  if (type1 === type2) return "cross";
  if (isSwitchLike(type1) && isSwitchLike(type2)) return "cross";
  return "straight";
}
