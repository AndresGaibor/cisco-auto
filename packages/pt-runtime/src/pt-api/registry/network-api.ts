// PTNetwork interface

import type { PTIpcBase } from "./ipc-base.js";
import type { PTDevice } from "./device-api.js";
import type { PTLink } from "./link-api.js";

export interface PTNetwork extends PTIpcBase {
  getDevice(name: string): PTDevice | null;
  getDeviceAt(index: number): PTDevice | null;
  getDeviceCount(): number;
  getLinkAt?(index: number): PTLink | null;
  getLinkCount?(): number;
  getTotalDeviceAttributeValue?(attribute: string): number;
}