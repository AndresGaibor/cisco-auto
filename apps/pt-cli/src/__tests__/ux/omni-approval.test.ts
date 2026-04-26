#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { hasRawApproval } from "../../commands/omni/policy.js";

describe("omni raw approval", () => {
  test("acepta --yes", () => {
    expect(hasRawApproval({ yes: true })).toBe(true);
  });

  test("acepta --approve", () => {
    expect(hasRawApproval({ approve: true })).toBe(true);
  });

  test("rechaza sin aprobación", () => {
    const previous = process.env.PT_OMNI_AUTO_APPROVE;
    delete process.env.PT_OMNI_AUTO_APPROVE;

    expect(hasRawApproval({})).toBe(false);

    if (previous !== undefined) {
      process.env.PT_OMNI_AUTO_APPROVE = previous;
    }
  });
});