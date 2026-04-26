#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { getRegisteredCommandIds } from "../../commands/command-registry.js";

describe("registry público", () => {
  test("solo expone comandos raíz profesionales", () => {
    expect(getRegisteredCommandIds()).toEqual([
      "cmd",
      "completion",
      "device",
      "doctor",
      "link",
      "omni",
      "runtime",
      "set",
      "verify",
    ]);
  });
});