// ============================================================================
// Slot Finder - traverses module tree to find best slot
// ============================================================================

import type { PTModule } from "../../pt-api/pt-api-registry";
import { MODULE_TYPE } from "./constants";
import { isHWICOrWIC, isNetworkModule } from "./helpers";
import type { SlotCandidate } from "./types";

export { MODULE_TYPE };
export type { SlotCandidate } from "./types";

export function getSlotCountOrZero(mod: PTModule | null): number {
  if (!mod) return 0;
  try {
    return mod.getSlotCount();
  } catch {
    return 0;
  }
}

export function getSlotTypeOrMinus(mod: PTModule | null, index: number): number {
  if (!mod) return -1;
  try {
    return mod.getSlotTypeAt(index);
  } catch {
    return -1;
  }
}

export function getModuleCountOrZero(mod: PTModule | null): number {
  if (!mod) return 0;
  try {
    return mod.getModuleCount();
  } catch {
    return 0;
  }
}

export function getModuleAtOrNull(mod: PTModule | null, index: number): PTModule | null {
  if (!mod) return null;
  try {
    return mod.getModuleAt(index);
  } catch {
    return null;
  }
}

function collectParentsRecursive(
  mod: PTModule | null,
  label: string,
  depth: number,
  outArr: SlotCandidate[],
): void {
  if (!mod || depth > 10) return;

  const count = getSlotCountOrZero(mod);
  if (count > 0) {
    for (let s = 0; s < count; s++) {
      const slotType = getSlotTypeOrMinus(mod, s);
      outArr.push({ parent: mod, label, slotIndex: s, slotType });
    }
  }

  const childCount = getModuleCountOrZero(mod);
  for (let i = 0; i < childCount; i++) {
    const child = getModuleAtOrNull(mod, i);
    if (child) {
      collectParentsRecursive(child, `${label}/child[${i}]`, depth + 1, outArr);
    }
  }
}

export function collectSlotCandidates(root: PTModule | null): SlotCandidate[] {
  const result: SlotCandidate[] = [];
  collectParentsRecursive(root, "root", 0, result);
  return result;
}

export function findBestSlot(candidates: SlotCandidate[], moduleId: string): SlotCandidate | null {
  const isHWIC = isHWICOrWIC(moduleId);
  const isNM = isNetworkModule(moduleId);

  // First pass: find type-compatible slot
  for (const c of candidates) {
    if (c.slotType === MODULE_TYPE.eNonRemovableModule) continue;
    if (c.slotType === MODULE_TYPE.eNonRemovableInterfaceCard) continue;

    if (isNM && c.slotType === MODULE_TYPE.eNetworkModule) return c;
    if (isHWIC && c.slotType === MODULE_TYPE.eInterfaceCard) return c;
  }

  // Second pass: any compatible slot
  for (const c of candidates) {
    if (c.slotType === MODULE_TYPE.eNonRemovableModule) continue;
    if (c.slotType === MODULE_TYPE.eNonRemovableInterfaceCard) continue;
    if (isNM && c.slotType === MODULE_TYPE.eNetworkModule) return c;
    if (isHWIC && c.slotType === MODULE_TYPE.eInterfaceCard) return c;
  }

  return null;
}
