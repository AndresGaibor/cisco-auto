import { describe, expect, test } from "bun:test";
import { createLinkAddCommand } from "../commands/link/add.js";
import { createLinkRemoveCommand } from "../commands/link/remove.js";

describe("link add/remove options", () => {
  test("link add usa verify negable sin default explícito", () => {
    const verifyOption = createLinkAddCommand().options.find((option) => option.flags.includes("--verify"));

    expect(verifyOption).toBeDefined();
    expect(verifyOption?.defaultValue).toBeUndefined();
  });

  test("link remove expone if-exists", () => {
    const flags = createLinkRemoveCommand().options.map((option) => option.flags);

    expect(flags).toContain("--if-exists");
  });
});
