import { tslibHelpersTemplate } from "../templates/kernel-iife";

export class TslibHelperBundle {
  static compose(): string {
    return tslibHelpersTemplate();
  }
}

export function countOccurrences(code: string, marker: string): number {
  if (marker.length === 0) {
    return 0;
  }
  let count = 0;
  let from = 0;
  while (true) {
    const idx = code.indexOf(marker, from);
    if (idx === -1) {
      return count;
    }
    count += 1;
    from = idx + marker.length;
  }
}
