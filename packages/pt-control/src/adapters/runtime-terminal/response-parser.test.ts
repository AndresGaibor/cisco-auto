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

  test("prefiere result.raw/output cuando existen", () => {
    const parser = createResponseParser();

    const parsed = parser.parseCommandResponse(
      {
        ok: true,
        output: "salida contaminada",
        raw: "salida contaminada",
        result: {
          ok: true,
          raw: "SW-SRV-DIST#show running-config\nversion 15.2\nSW-SRV-DIST#",
          output: "SW-SRV-DIST#show running-config\nversion 15.2\nSW-SRV-DIST#",
          status: 0,
          session: {
            modeBefore: "privileged-exec",
            modeAfter: "privileged-exec",
            promptBefore: "SW-SRV-DIST#",
            promptAfter: "SW-SRV-DIST#",
          },
        },
        session: {
          modeBefore: "user-exec",
          modeAfter: "user-exec",
          promptBefore: "SW-SRV-DIST>",
          promptAfter: "SW-SRV-DIST>",
        },
      },
      {
        stepIndex: 0,
        isHost: false,
        command: "show running-config",
      },
    );

    expect(parsed.raw).toContain("SW-SRV-DIST#show running-config");
    expect(parsed.promptAfter).toBe("SW-SRV-DIST#");
    expect(parsed.modeAfter).toBe("privileged-exec");
  });
});
