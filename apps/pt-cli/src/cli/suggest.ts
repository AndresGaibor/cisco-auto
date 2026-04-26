#!/usr/bin/env bun
export function levenshtein(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();

  const dp = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );

  for (let i = 0; i <= left.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= right.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[left.length]![right.length]!;
}

export function suggestClosest(input: string, candidates: string[], limit = 4): string[] {
  const normalized = input.trim();
  if (!normalized) return [];

  return candidates
    .map((candidate) => ({
      candidate,
      distance: levenshtein(normalized, candidate),
    }))
    .filter((item) => item.distance <= Math.max(2, Math.floor(normalized.length / 2)))
    .sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate))
    .slice(0, limit)
    .map((item) => item.candidate);
}

export function suggestFlag(input: string): string[] {
  return suggestClosest(input, [
    "--json",
    "--quiet",
    "--verbose",
    "--trace",
    "--timeout",
    "--yes",
    "--no-input",
    "--no-color",
    "--raw",
    "--table",
    "--config",
    "--file",
    "--stdin",
    "--save",
    "--mode",
    "--verify",
    "--dry-run",
    "--gateway",
    "--dns",
    "--mask",
    "--cidr",
    "--devices",
    "--where",
    "--all",
  ]);
}