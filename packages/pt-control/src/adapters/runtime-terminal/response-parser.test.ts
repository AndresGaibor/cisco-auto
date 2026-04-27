import { describe, expect, test } from "bun:test";
import { createResponseParser } from "./response-parser.js";

describe("response-parser", () => {
  test("trata una respuesta simple ok:false como fallo", () => {
    const parser = createResponseParser();

    const parsed = parser.parseCommandResponse(
      {
        ok: false,
        code: "IOS_EXEC_FAILED",
        error: "Error en ejecución de comando IOS",
        output: "",
        session: {
          modeBefore: "user-exec",
          modeAfter: "user-exec",
          promptBefore: "R1>",
          promptAfter: "R1>",
        },
      },
      {
        stepIndex: 0,
        isHost: false,
        command: "show version",
      },
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.status).toBe(1);
    expect(parsed.error).toContain("Error en ejecución de comando IOS");
  });
});
