import { describe, expect, test } from "bun:test";
import {
  normalizeCommandForFallback,
  isLongOutputReadOnlyIosCommand,
  normalizeEol,
  isIosPrompt,
  lastNonEmptyLine,
  isPagerOnlyLine,
  lineContainsCommandEcho,
  stripCommandEchoFromLine,
  isConfigPromptText,
  isEndCommand,
  isPromptOnlyTransitionCommand,
  blockHasCommandEcho,
  nativeEndCommandLooksComplete,
  nativePromptOnlyTransitionLooksComplete,
  nativeConfigCommandEchoAndPromptLooksComplete,
  nativeFallbackBlockLooksComplete,
  outputHasPager,
  nativeOutputTailHasActivePager,
  outputLooksComplete,
  normalizeIosMode,
  inferIosModeFromPrompt,
  isConfigMode,
  inferPromptFromTerminalText,
  firstMeaningfulNativeOutputLine,
  lineLooksLikeNativeInterfaceHeader,
  nativeLongOutputLooksPartial,
  buildNativeLongOutputWarnings,
  nativeLongOutputCanCompleteWithoutEcho,
  nativeLongOutputHasCommandEvidence,
  detectIosSemanticErrorFromOutput,
  isIosConfigPromptText,
  isIosConfigModeText,
  nativeSnapshotIsStillInConfigMode,
  inferModeFromPrompt,
  extractLatestCommandBlock,
  extractCurrentCommandBlockStrict,
  appendStepOutput,
  PARTIAL_LONG_OUTPUT_WARNING,
} from "../../../pt/kernel/output-completion-policy.js";

describe("output-completion-policy", () => {
  describe("normalizeCommandForFallback", () => {
    test("normaliza espacios y lowercase", () => {
      expect(normalizeCommandForFallback("  SHOW   VERSION  ")).toBe("show version");
      expect(normalizeCommandForFallback("show ip route")).toBe("show ip route");
    });

    test("maneja valores nulos", () => {
      expect(normalizeCommandForFallback(null)).toBe("");
      expect(normalizeCommandForFallback(undefined)).toBe("");
    });
  });

  describe("isLongOutputReadOnlyIosCommand", () => {
    test("detecta comandos largos de solo lectura", () => {
      expect(isLongOutputReadOnlyIosCommand("show version")).toBe(true);
      expect(isLongOutputReadOnlyIosCommand("show running-config")).toBe(true);
      expect(isLongOutputReadOnlyIosCommand("show interfaces")).toBe(true);
      expect(isLongOutputReadOnlyIosCommand("show startup-config")).toBe(true);
      expect(isLongOutputReadOnlyIosCommand("show ip route")).toBe(true);
    });

    test("no detecta comandos de configuración", () => {
      expect(isLongOutputReadOnlyIosCommand("configure terminal")).toBe(false);
      expect(isLongOutputReadOnlyIosCommand("interface f0/1")).toBe(false);
      expect(isLongOutputReadOnlyIosCommand("no shutdown")).toBe(false);
    });
  });

  describe("normalizeEol", () => {
    test("normaliza CRLF y CR a LF", () => {
      expect(normalizeEol("line1\r\nline2\rline3")).toBe("line1\nline2\nline3");
      expect(normalizeEol("a\r\nb")).toBe("a\nb");
    });
  });

  describe("isIosPrompt", () => {
    test("detecta prompts IOS válidos", () => {
      expect(isIosPrompt("Router#")).toBe(true);
      expect(isIosPrompt("Router>")).toBe(true);
      expect(isIosPrompt("Switch(config-if)#")).toBe(true);
      expect(isIosPrompt("R1.1.1.1(config)#")).toBe(true);
    });

    test("rechaza prompts inválidos", () => {
      expect(isIosPrompt("")).toBe(false);
      expect(isIosPrompt("   ")).toBe(false);
      expect(isIosPrompt("Router")).toBe(false);
      expect(isIosPrompt("--More--")).toBe(false);
    });
  });

  describe("lastNonEmptyLine", () => {
    test("devuelve última línea no vacía", () => {
      expect(lastNonEmptyLine("a\nb\nc")).toBe("c");
      expect(lastNonEmptyLine("a\n\nb\n")).toBe("b");
      expect(lastNonEmptyLine("")).toBe("");
    });
  });

  describe("isPagerOnlyLine", () => {
    test("detecta línea --More--", () => {
      expect(isPagerOnlyLine("--More--")).toBe(true);
      expect(isPagerOnlyLine("--more--")).toBe(true);
      expect(isPagerOnlyLine("Router#")).toBe(false);
    });
  });

  describe("lineContainsCommandEcho", () => {
    test("detecta eco de comando en línea", () => {
      expect(lineContainsCommandEcho("Router#show version", "show version")).toBe(true);
      expect(lineContainsCommandEcho("Router>show version", "show version")).toBe(true);
      expect(lineContainsCommandEcho("show version", "show version")).toBe(true);
    });

    test("no detecta eco cuando no coincide", () => {
      expect(lineContainsCommandEcho("Router#show ip", "show version")).toBe(false);
    });
  });

  describe("stripCommandEchoFromLine", () => {
    test("elimina eco de línea", () => {
      expect(stripCommandEchoFromLine("Router#show version", "show version")).toBe("");
      expect(stripCommandEchoFromLine("show version", "show version")).toBe("");
    });

    test("devuelve línea original si no hay eco", () => {
      expect(stripCommandEchoFromLine("Some output line", "show version")).toBe("Some output line");
    });
  });

  describe("isConfigPromptText", () => {
    test("detecta prompts de config", () => {
      expect(isConfigPromptText("Router(config)#")).toBe(true);
      expect(isConfigPromptText("Switch(config-if)#")).toBe(true);
    });

    test("rechaza prompts no-config", () => {
      expect(isConfigPromptText("Router#")).toBe(false);
      expect(isConfigPromptText("Router>")).toBe(false);
    });
  });

  describe("isEndCommand", () => {
    test("detecta comando end", () => {
      expect(isEndCommand("end")).toBe(true);
      expect(isEndCommand("END")).toBe(true);
      expect(isEndCommand("end ")).toBe(true);
      expect(isEndCommand("exit")).toBe(false);
    });
  });

  describe("isPromptOnlyTransitionCommand", () => {
    test("detecta comandos de transición", () => {
      expect(isPromptOnlyTransitionCommand("disable")).toBe(true);
      expect(isPromptOnlyTransitionCommand("enable")).toBe(true);
      expect(isPromptOnlyTransitionCommand("end")).toBe(true);
      expect(isPromptOnlyTransitionCommand("exit")).toBe(true);
      expect(isPromptOnlyTransitionCommand("configure terminal")).toBe(true);
    });

    test("rechaza otros comandos", () => {
      expect(isPromptOnlyTransitionCommand("show version")).toBe(false);
      expect(isPromptOnlyTransitionCommand("interface f0/1")).toBe(false);
    });
  });

  describe("nativeEndCommandLooksComplete", () => {
    test("devuelve true cuando end tiene eco y prompt privileged", () => {
      const lines = ["end", "Router#"];
      expect(nativeEndCommandLooksComplete(lines, "end", "Router#")).toBe(true);
    });

    test("devuelve false cuando está en config mode", () => {
      const lines = ["end", "Router(config)#"];
      expect(nativeEndCommandLooksComplete(lines, "end", "Router(config)#")).toBe(false);
    });
  });

  describe("nativeConfigCommandEchoAndPromptLooksComplete", () => {
    test("devuelve true con eco y prompt config", () => {
      const lines = ["interface f0/1", "Switch(config-if)#"];
      expect(nativeConfigCommandEchoAndPromptLooksComplete(lines, "interface f0/1", "Switch(config-if)#")).toBe(true);
    });
  });

  describe("nativeFallbackBlockLooksComplete", () => {
    test("devuelve true con output completo con eco y prompt", () => {
      const block = "show version\nCisco IOS Software\nRouter#";
      expect(nativeFallbackBlockLooksComplete(block, "show version", "Router#")).toBe(true);
    });

    test("devuelve false sin prompt", () => {
      expect(nativeFallbackBlockLooksComplete("show version\nCisco IOS", "show version", "")).toBe(false);
    });

    test("devuelve false con pager activo", () => {
      expect(nativeFallbackBlockLooksComplete("show version\n--More--\nRouter#", "show version", "Router#")).toBe(false);
    });

    test("detecta prompt user-exec Router>", () => {
      const block = "Router>";
      expect(nativeFallbackBlockLooksComplete(block, "show version", "Router>")).toBe(true);
    });

    test("detecta prompt privileged-exec Router#", () => {
      const block = "Router#";
      expect(nativeFallbackBlockLooksComplete(block, "show version", "Router#")).toBe(true);
    });

    test("detecta prompt config Router(config)#", () => {
      const block = "Enter configuration commands, one per line.  End with CNTL/Z.\nRouter(config)#";
      expect(nativeFallbackBlockLooksComplete(block, "configure terminal", "Router(config)#")).toBe(true);
    });

    test("detecta prompt config-if Router(config-if)#", () => {
      const block = "Router(config-if)#";
      expect(nativeFallbackBlockLooksComplete(block, "interface f0/1", "Router(config-if)#")).toBe(true);
    });

    test("detecta prompt config-line Router(config-line)#", () => {
      const block = "Router(config-line)#";
      expect(nativeFallbackBlockLooksComplete(block, "line vty", "Router(config-line)#")).toBe(true);
    });

    test("detecta prompt config-router Router(config-router)#", () => {
      const block = "Router(config-router)#";
      expect(nativeFallbackBlockLooksComplete(block, "router ospf 1", "Router(config-router)#")).toBe(true);
    });

    test("detecta prompt Switch", () => {
      const block = "Switch#";
      expect(nativeFallbackBlockLooksComplete(block, "show version", "Switch#")).toBe(true);
      const block2 = "Switch(config)#";
      expect(nativeFallbackBlockLooksComplete(block2, "configure terminal", "Switch(config)#")).toBe(true);
    });

    test("detecta prompt con hostname largo", () => {
      const block = "R1-CORE-GW-RTR01(config)#";
      expect(nativeFallbackBlockLooksComplete(block, "configure terminal", "R1-CORE-GW-RTR01(config)#")).toBe(true);
    });

    test("detecta prompt con IP", () => {
      const block = "192.168.1.1(config)#";
      expect(nativeFallbackBlockLooksComplete(block, "configure terminal", "192.168.1.1(config)#")).toBe(true);
    });

    test("detecta prompt con interface en config", () => {
      const block = "Router(config-if)#";
      expect(nativeFallbackBlockLooksComplete(block, "interface GigabitEthernet0/0", "Router(config-if)#")).toBe(true);
    });

    test("devuelve false con output incompleto sin prompt final", () => {
      expect(nativeFallbackBlockLooksComplete("some output line", "show version", "")).toBe(false);
    });

    test("maneja block con \\r\\n line endings", () => {
      const block = "Router#\r\nshow version\r\nCisco IOS\r\nRouter#";
      expect(nativeFallbackBlockLooksComplete(block, "show version", "Router#")).toBe(true);
    });

    test("detecta prompt aunque haya syslog despues", () => {
      const block = "end\nRouter#\n%SYS-5-CONFIG_I: Configured from console by console\n";
      expect(nativeFallbackBlockLooksComplete(block, "end", "Router#")).toBe(true);
    });

    test("detecta prompt con syslog multilinea", () => {
      const block = "interface GigabitEthernet0/0\nRouter(config-if)#\n%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up\n";
      expect(nativeFallbackBlockLooksComplete(block, "interface GigabitEthernet0/0", "Router(config-if)#")).toBe(true);
    });

    test("rechaza block que solo tiene syslog sin prompt", () => {
      const block = "%SYS-5-CONFIG_I: Configured from console by console\n";
      expect(nativeFallbackBlockLooksComplete(block, "end", "Router#")).toBe(false);
    });
  });

  describe("outputHasPager", () => {
    test("detecta pager en output", () => {
      expect(outputHasPager("some output\n--More--")).toBe(true);
      expect(outputHasPager("Press any key to continue")).toBe(true);
    });

    test("devuelve false sin pager", () => {
      expect(outputHasPager("Router#")).toBe(false);
    });
  });

  describe("nativeOutputTailHasActivePager", () => {
    test("detecta pager activo al final", () => {
      expect(nativeOutputTailHasActivePager("output\n--More--")).toBe(true);
      expect(nativeOutputTailHasActivePager("output  --More--")).toBe(true);
    });

    test("devuelve false sin pager al final", () => {
      expect(nativeOutputTailHasActivePager("Router#")).toBe(false);
    });
  });

  describe("outputLooksComplete", () => {
    test("detecta output completo", () => {
      expect(outputLooksComplete("show version\nCisco IOS\nRouter#", "show version")).toBe(true);
    });

    test("devuelve false sin prompt", () => {
      expect(outputLooksComplete("some output", "show version")).toBe(false);
    });

    test("devuelve false sin eco de comando", () => {
      expect(outputLooksComplete("Router#", "show version")).toBe(false);
    });
  });

  describe("normalizeIosMode", () => {
    test("normaliza modos IOS", () => {
      expect(normalizeIosMode("enable")).toBe("privileged-exec");
      expect(normalizeIosMode("privileged")).toBe("privileged-exec");
      expect(normalizeIosMode("config")).toBe("global-config");
      expect(normalizeIosMode("user")).toBe("user-exec");
    });
  });

  describe("inferIosModeFromPrompt", () => {
    test("infiere modo desde prompt", () => {
      expect(inferIosModeFromPrompt("Router#")).toBe("privileged-exec");
      expect(inferIosModeFromPrompt("Router>")).toBe("user-exec");
      expect(inferIosModeFromPrompt("Router(config)#")).toBe("global-config");
      expect(inferIosModeFromPrompt("Router(config-if)#")).toBe("config-if");
    });
  });

  describe("isConfigMode", () => {
    test("detecta modos config", () => {
      expect(isConfigMode("global-config")).toBe(true);
      expect(isConfigMode("config-if")).toBe(true);
      expect(isConfigMode("privileged-exec")).toBe(false);
    });

    test("detecta desde prompt", () => {
      expect(isConfigMode("unknown", "Router(config)#")).toBe(true);
    });
  });

  describe("inferPromptFromTerminalText", () => {
    test("infiere prompt de texto multilínea", () => {
      const text = "some output\nRouter#";
      expect(inferPromptFromTerminalText(text)).toBe("Router#");
    });

    test("devuelve vacío si no hay prompt válido", () => {
      expect(inferPromptFromTerminalText("no prompt here")).toBe("");
    });
  });

  describe("firstMeaningfulNativeOutputLine", () => {
    test("devuelve primera línea significativa", () => {
      const output = "Router#\nshow version\nCisco IOS Software\nRouter#";
      expect(firstMeaningfulNativeOutputLine(output, "show version")).toBe("Cisco IOS Software");
    });

    test("filtra prompts y pagers", () => {
      const output = "Router#\n--More--\nCisco IOS";
      expect(firstMeaningfulNativeOutputLine(output, "show version")).toBe("Cisco IOS");
    });
  });

  describe("lineLooksLikeNativeInterfaceHeader", () => {
    test("detecta headers de interfaz", () => {
      expect(lineLooksLikeNativeInterfaceHeader("FastEthernet0/1 is up")).toBe(true);
      expect(lineLooksLikeNativeInterfaceHeader("GigabitEthernet0/1 is down")).toBe(true);
    });

    test("rechaza líneas que no son headers", () => {
      expect(lineLooksLikeNativeInterfaceHeader("some random output")).toBe(false);
    });
  });

  describe("nativeLongOutputLooksPartial", () => {
    test("detecta output parcial de show interfaces", () => {
      const args = {
        command: "show interfaces",
        block: "Queueing strategy: fifo\nRouter#",
        hasCommandEcho: false,
      };
      expect(nativeLongOutputLooksPartial(args)).toBe(true);
    });

    test("no marca como parcial si tiene header", () => {
      const args = {
        command: "show interfaces",
        block: "FastEthernet0/1 is up\nRouter#",
        hasCommandEcho: true,
      };
      expect(nativeLongOutputLooksPartial(args)).toBe(false);
    });
  });

  describe("buildNativeLongOutputWarnings", () => {
    test("devuelve warning cuando es parcial", () => {
      const args = {
        command: "show interfaces",
        block: "Queueing strategy: fifo\nRouter#",
        hasCommandEcho: false,
      };
      expect(buildNativeLongOutputWarnings(args)).toEqual([PARTIAL_LONG_OUTPUT_WARNING]);
    });

    test("devuelve array vacío cuando no es parcial", () => {
      const args = {
        command: "show interfaces",
        block: "FastEthernet0/1 is up\nRouter#",
        hasCommandEcho: true,
      };
      expect(buildNativeLongOutputWarnings(args)).toEqual([]);
    });
  });

describe("nativeLongOutputCanCompleteWithoutEcho", () => {
    test("completa show interfaces sin eco si tiene header de interfaz", () => {
      const args = {
        block: "FastEthernet0/1 is up, line protocol is up\n  Hardware is Lance, address is 0060.5c93.4501\n  MTU 1500 bytes, BW 100000 Kbit\nRouter#",
        command: "show interfaces",
        prompt: "Router#",
      };
      expect(nativeLongOutputCanCompleteWithoutEcho(args)).toBe(true);
    });

    test("no completa show interfaces si no tiene header", () => {
      const args = {
        block: "Queueing strategy: fifo\nRouter#",
        command: "show interfaces",
        prompt: "Router#",
      };
      expect(nativeLongOutputCanCompleteWithoutEcho(args)).toBe(false);
    });

    test("no completa comandos de configuración", () => {
      const args = {
        block: "interface f0/1\nRouter(config-if)#",
        command: "configure terminal",
        prompt: "Router(config)#",
      };
      expect(nativeLongOutputCanCompleteWithoutEcho(args)).toBe(false);
    });

    test("no completa si tiene pager activo", () => {
      const args = {
        block: "FastEthernet0/1 is up\n--More--\nRouter#",
        command: "show interfaces",
        prompt: "Router#",
      };
      expect(nativeLongOutputCanCompleteWithoutEcho(args)).toBe(false);
    });

    test("no completa si el prompt no es válido", () => {
      const args = {
        block: "FastEthernet0/1 is up",
        command: "show interfaces",
        prompt: "",
      };
      expect(nativeLongOutputCanCompleteWithoutEcho(args)).toBe(false);
    });
  });

  describe("nativeLongOutputHasCommandEvidence", () => {
    test("detecta evidencia para show version", () => {
      const block = "Cisco IOS Software, Version 15.2\nSystem image file is flash:\nRouter#";
      expect(nativeLongOutputHasCommandEvidence("show version", block)).toBe(true);
    });

    test("detecta evidencia para show running-config", () => {
      const block = "Building configuration\nCurrent configuration\nend\nRouter#";
      expect(nativeLongOutputHasCommandEvidence("show running-config", block)).toBe(true);
    });

    test("detecta evidencia para show interfaces", () => {
      const block = "FastEthernet0/1 is up\nRouter#";
      expect(nativeLongOutputHasCommandEvidence("show interfaces", block)).toBe(true);
    });

    test("devuelve true para comandos sin verificación especial", () => {
      expect(nativeLongOutputHasCommandEvidence("show ip route", "some output")).toBe(true);
    });
  });

  describe("detectIosSemanticErrorFromOutput", () => {
    test("detecta error de input inválido", () => {
      const output = "% Invalid input detected at '^' marker.";
      expect(detectIosSemanticErrorFromOutput(output)).toEqual({
        code: "IOS_INVALID_INPUT",
        message: expect.stringContaining("Invalid input"),
      });
    });

    test("detecta comando incompleto", () => {
      const output = "% Incomplete command.";
      expect(detectIosSemanticErrorFromOutput(output)).toEqual({
        code: "IOS_INCOMPLETE_COMMAND",
        message: expect.stringContaining("Incomplete"),
      });
    });

    test("detecta comando ambiguo", () => {
      const output = "% Ambiguous command.";
      expect(detectIosSemanticErrorFromOutput(output)).toEqual({
        code: "IOS_AMBIGUOUS_COMMAND",
        message: expect.stringContaining("Ambiguous"),
      });
    });

    test("devuelve null para output sin errores", () => {
      expect(detectIosSemanticErrorFromOutput("Router#show version")).toBe(null);
    });
  });

  describe("nativeSnapshotIsStillInConfigMode", () => {
    test("detecta config mode desde prompt", () => {
      expect(nativeSnapshotIsStillInConfigMode({ prompt: "Router(config)#", mode: "unknown" })).toBe(true);
    });

    test("detecta config mode desde mode", () => {
      expect(nativeSnapshotIsStillInConfigMode({ prompt: "", mode: "config-if" })).toBe(true);
    });

    test("devuelve false para exec normal", () => {
      expect(nativeSnapshotIsStillInConfigMode({ prompt: "Router#", mode: "privileged-exec" })).toBe(false);
    });
  });

  describe("inferModeFromPrompt", () => {
    test("infiere modo desde prompt", () => {
      expect(inferModeFromPrompt("Router#")).toBe("privileged-exec");
      expect(inferModeFromPrompt("Router>")).toBe("user-exec");
    });
  });

  describe("extractLatestCommandBlock", () => {
    test("extrae bloque desde eco de comando", () => {
      const output = "Router#show version\nCisco IOS Software\nRouter#";
      expect(extractLatestCommandBlock(output, "show version")).toContain("show version");
    });

    test("devuelve todo el texto si no encuentra eco", () => {
      expect(extractLatestCommandBlock("some output", "show version")).toBe("some output");
    });
  });

  describe("extractCurrentCommandBlockStrict", () => {
    test("extrae bloque con eco estrict", () => {
      const output = "Router#show version\nCisco IOS\nRouter#";
      const result = extractCurrentCommandBlockStrict(output, "show version");
      expect(result.block).toContain("show version");
      expect(result.hasCommandEcho).toBe(true);
    });

    test("devuelve bloque vacío sin eco", () => {
      const result = extractCurrentCommandBlockStrict("Cisco IOS\nRouter#", "show version");
      expect(result.block).toBe("");
      expect(result.hasCommandEcho).toBe(false);
    });
  });

  describe("appendStepOutput", () => {
    test("concatena outputs", () => {
      expect(appendStepOutput("first", "second")).toBe("first\nsecond");
    });

    test("devuelve segundo si primero vacío", () => {
      expect(appendStepOutput("", "second")).toBe("second");
    });

    test("devuelve primero si segundo vacío", () => {
      expect(appendStepOutput("first", "")).toBe("first");
    });
  });
});