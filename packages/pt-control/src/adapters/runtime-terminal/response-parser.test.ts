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

  test("no recorta un fallo semántico aunque el comando visible sea end", () => {
    const parser = createResponseParser();

    const errorText = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                             ^",
      "% Invalid input detected at '^' marker.",
    ].join("\n");

    const parsed = parser.parseCommandResponse(
      {
        ok: false,
        output: "end\nSW-SRV-DIST#",
        raw: "end\nSW-SRV-DIST#",
        result: {
          ok: false,
          rawOutput: errorText,
          raw: errorText,
          output: errorText,
          status: 1,
          code: "IOS_INVALID_INPUT",
          error: errorText,
          session: {
            mode: "privileged-exec",
            prompt: "SW-SRV-DIST#",
          },
        },
        error: errorText,
        code: "IOS_INVALID_INPUT",
      },
      {
        stepIndex: 0,
        isHost: false,
        command: "end",
      },
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.status).toBe(1);
    expect(parsed.raw).toContain("channel-group 7 mode active");
    expect(parsed.warnings).not.toContain(errorText);
  });

  test("recorta rawOutput histórico aunque la respuesta simple venga marcada como fallo", () => {
    const parser = createResponseParser();

    const rawOutput = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#end",
      "SW-SRV-DIST#",
      "SW-SRV-DIST#show version",
      "Cisco IOS Software, C2960 Software",
      "Configuration register is 0xF",
      "SW-SRV-DIST#",
    ].join("\n");

    const parsed = parser.parseCommandResponse(
      {
        ok: false,
        status: 1,
        result: {
          ok: false,
          status: 1,
          rawOutput,
          output: "% Invalid input detected at '^' marker.",
          session: {
            mode: "privileged-exec",
            prompt: "SW-SRV-DIST#",
          },
        },
      },
      {
        stepIndex: 0,
        isHost: false,
        command: "show version",
      },
    );

    expect(parsed.raw).toContain("SW-SRV-DIST#show version");
    expect(parsed.raw).toContain("Cisco IOS Software");
    expect(parsed.raw).not.toContain("channel-group 7 mode active");
  });

  test("no convierte cleanup semántico en warning gigante", () => {
    const parser = createResponseParser();

    const semanticError = [
      "channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
    ].join("\n");

    const semanticErrorWithCleanup = [
      semanticError,
      "",
      "[cleanup]",
      "end",
      "SW-SRV-DIST#",
      "%SYS-5-CONFIG_I: Configured from console by console",
    ].join("\n");

    const parsed = parser.parseCommandResponse(
      {
        ok: false,
        status: 1,
        error: semanticErrorWithCleanup,
        warnings: [semanticErrorWithCleanup],
        result: {
          ok: false,
          status: 1,
          rawOutput: semanticError,
          output: semanticError,
          code: "IOS_INVALID_INPUT",
          error: semanticErrorWithCleanup,
          session: {
            mode: "privileged-exec",
            prompt: "SW-SRV-DIST#",
          },
        },
      } as never,
      {
        stepIndex: 0,
        isHost: false,
        command: "channel-group 7 mode active",
      },
    );

    expect(parsed.ok).toBe(false);
    expect(parsed.status).toBe(1);
    expect(parsed.raw).toContain("% Invalid input detected");
    expect(parsed.error).toContain("% Invalid input detected");
    expect(parsed.error).not.toContain("[cleanup]");
    expect(parsed.warnings).toEqual([]);
  });

  test("propaga warnings y diagnostics desde result anidado", () => {
    const parser = createResponseParser();

    const parsed = parser.parseCommandResponse(
      {
        ok: true,
        status: 0,
        result: {
          ok: true,
          status: 0,
          rawOutput: "Queueing strategy: fifo\nSW-SRV-DIST#",
          output: "Queueing strategy: fifo",
          warnings: [
            "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
          ],
          diagnostics: {
            completionReason: "native-long-output-without-echo",
            partialOutput: true,
            statusCode: 0,
          },
          session: {
            mode: "privileged-exec",
            prompt: "SW-SRV-DIST#",
          },
        },
      } as never,
      {
        stepIndex: 0,
        isHost: false,
        command: "show interfaces",
      },
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.warnings).toContain(
      "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.",
    );
    expect(parsed.diagnostics?.completionReason).toBe("native-long-output-without-echo");
    expect(parsed.diagnostics?.partialOutput).toBe(true);
  });
});
