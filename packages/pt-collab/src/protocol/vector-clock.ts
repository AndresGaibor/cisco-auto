export interface VectorClock {
  [peerId: string]: number;
}

export function createVectorClock(peerIds?: string[]): VectorClock {
  const clock: VectorClock = {};
  if (peerIds) {
    for (const id of peerIds) {
      clock[id] = 0;
    }
  }
  return clock;
}

export function incrementVectorClock(clock: VectorClock, peerId: string): VectorClock {
  return { ...clock, [peerId]: (clock[peerId] ?? 0) + 1 };
}

export function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [peerId, counter] of Object.entries(b)) {
    merged[peerId] = Math.max(merged[peerId] ?? 0, counter);
  }
  return merged;
}

export function vectorClockCompare(a: VectorClock, b: VectorClock): "equal" | "happened-before" | "happened-after" | "concurrent" {
  let aLessOrEqual = true;
  let bLessOrEqual = true;
  const allPeers = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const peerId of allPeers) {
    const aVal = a[peerId] ?? 0;
    const bVal = b[peerId] ?? 0;

    if (aVal > bVal) aLessOrEqual = false;
    if (bVal > aVal) bLessOrEqual = false;
  }

  if (aLessOrEqual && bLessOrEqual) return "equal";
  if (aLessOrEqual) return "happened-before";
  if (bLessOrEqual) return "happened-after";
  return "concurrent";
}

export function isDeltaCausallyReady(
  deltaVector: VectorClock,
  peerVector: VectorClock,
  peerId: string,
): boolean {
  const deltaSeq = deltaVector[peerId] ?? 0;
  const peerSeq = peerVector[peerId] ?? 0;

  if (deltaSeq !== peerSeq + 1) return false;

  for (const [id, seq] of Object.entries(deltaVector)) {
    if (id === peerId) continue;
    if (seq > (peerVector[id] ?? 0)) return false;
  }

  return true;
}
