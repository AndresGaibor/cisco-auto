#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { suggestClosest, suggestFlag } from "../../cli/suggest.js";

describe("sugerencias", () => {
  test("sugiere comando cercano", () => {
    expect(suggestClosest("cmdd", ["cmd", "device", "doctor"])).toContain("cmd");
  });

  test("sugiere flag cercana", () => {
    expect(suggestFlag("--jsoon")).toContain("--json");
  });
});