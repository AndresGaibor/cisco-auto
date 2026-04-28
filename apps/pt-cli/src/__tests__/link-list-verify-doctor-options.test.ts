import { describe, expect, test } from "bun:test";
import { createLinkListCommand } from "../commands/link/list.js";
import { createLinkVerifyCommand } from "../commands/link/verify.js";
import { createLinkDoctorCommand } from "../commands/link/doctor.js";

describe("link list/verify/doctor options", () => {
  test("link list expone flags de filtrado", () => {
    const flags = createLinkListCommand().options.map((option) => option.flags);

    expect(flags).toContain("--device <name>");
    expect(flags).toContain("--up");
    expect(flags).toContain("--down");
    expect(flags).toContain("--json");
  });

  test("link verify expone wait-green", () => {
    const flags = createLinkVerifyCommand().options.map((option) => option.flags);

    expect(flags).toContain("--wait-green <ms>");
    expect(flags).toContain("--json");
  });

  test("link doctor expone json", () => {
    const flags = createLinkDoctorCommand().options.map((option) => option.flags);

    expect(flags).toContain("--json");
  });
});
