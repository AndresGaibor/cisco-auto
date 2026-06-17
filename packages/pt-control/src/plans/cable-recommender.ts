// TODO: fix-import - PTDevice y DEVICE_TYPES reubicados
import type { PTDevice } from "../shared/utils/helpers.js";

const DEVICE_TYPES = {
  switch: 1,
  multilayerSwitch: 16,
};

export function recommendCableType(device1: PTDevice, device2: PTDevice): string {
  const type1 = device1.getType();
  const type2 = device2.getType();
  const isSwitchLike = (type: number) =>
    type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;

  if (type1 === type2) return "cross";
  if (isSwitchLike(type1) && isSwitchLike(type2)) return "cross";
  return "straight";
}
