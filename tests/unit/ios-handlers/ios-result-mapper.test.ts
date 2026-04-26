// ============================================================================
// IOS Result Mapper Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import type { TerminalExecutionResult } from "../../../packages/pt-runtime/src/terminal/terminal-execution-result.js";
import { mapTerminalResultToPtResult, mapExecResultToTerminalResult } from "../../../packages/pt-runtime/src/handlers/ios/ios-result-mapper.ts";

describe("ios-result-mapper", () => {
  describe("mapTerminalResultToPtResult", () => {
    it("should return success result when terminal result is ok", () => {
      const terminalResult: TerminalExecutionResult = {
        ok: true,
        device: "R1",
        command: "show ip int brief",
        output: "Interface IP-Address OK? Method Status Protocol\nGigabitEthernet0/0 10.0.0.1 YES manual up up",
        raw: "same raw output",
        diagnostics: {
          status: "completed",
          statusCode: 0,
          completionReason: undefined,
          outputSource: "event",
          confidence: "high",
          startedSeen: true,
          endedSeen: true,
          outputEvents: 5,
          promptMatched: true,
          modeMatched: true,
          semanticOk: true,
          durationMs: 150,
        },
        session: {
          kind: "ios",
          promptBefore: "Router#",
          promptAfter: "Router#",
          modeBefore: "privileged-exec",
          modeAfter: "privileged-exec",
          paging: false,
          awaitingConfirm: false,
          autoDismissedInitialDialog: false,
        },
        events: [],
        warnings: [],
      };

      const result = mapTerminalResultToPtResult(terminalResult);
      expect(result.ok).toBe(true);
    });

    it("should return error result when terminal result is not ok", () => {
      const terminalResult: TerminalExecutionResult = {
        ok: false,
        device: "R1",
        command: "show ip int brief",
        output: "% Invalid input detected",
        raw: "% Invalid input detected",
        error: {
          code: "IOS_INVALID_INPUT",
          message: "Comando IOS con input inválido detectado",
          phase: "execution",
          details: { status: 1 },
        },
        diagnostics: {
          status: "failed",
          statusCode: 1,
          completionReason: "IOS_INVALID_INPUT",
          outputSource: "event",
          confidence: "high",
          startedSeen: true,
          endedSeen: true,
          outputEvents: 5,
          promptMatched: true,
          modeMatched: true,
          semanticOk: false,
          durationMs: 150,
        },
        session: {
          kind: "ios",
          promptBefore: "Router#",
          promptAfter: "Router#",
          modeBefore: "privileged-exec",
          modeAfter: "privileged-exec",
          paging: false,
          awaitingConfirm: false,
          autoDismissedInitialDialog: false,
        },
        events: [],
        warnings: [],
      };

      const result = mapTerminalResultToPtResult(terminalResult);
      expect(result.ok).toBe(false);
      expect(result.code).toBe("IOS_INVALID_INPUT");
    });
  });

  describe("mapExecResultToTerminalResult", () => {
    it("should map successful exec result to terminal result", () => {
      const execResult = {
        ok: true,
        output: "Reply from 192.168.1.1: bytes=32 time<1ms TTL=255",
        rawOutput: "Reply from 192.168.1.1: bytes=32 time<1ms TTL=255",
        command: "ping 192.168.1.1",
        status: 0,
        startedAt: Date.now() - 100,
        endedAt: Date.now(),
        durationMs: 100,
        promptBefore: "PC1>",
        promptAfter: "PC1>",
        modeBefore: "host",
        modeAfter: "host",
        startedSeen: true,
        endedSeen: true,
        outputEvents: 3,
        confidence: "high",
        events: [],
        warnings: [],
      };

      const semantic = { ok: true, warnings: [] };
      const result = mapExecResultToTerminalResult(execResult, "PC1", "ping 192.168.1.1", semantic);

      expect(result.ok).toBe(true);
      expect(result.device).toBe("PC1");
      expect(result.command).toBe("ping 192.168.1.1");
      expect(result.output).toContain("Reply from 192.168.1.1");
    });

    it("should mark as failed when semantic verification fails", () => {
      const execResult = {
        ok: true,
        output: "Request timed out",
        rawOutput: "Request timed out",
        command: "ping 192.168.1.1",
        status: 1,
        startedAt: Date.now() - 100,
        endedAt: Date.now(),
        durationMs: 100,
        promptBefore: "PC1>",
        promptAfter: "PC1>",
        modeBefore: "host",
        modeAfter: "host",
        startedSeen: true,
        endedSeen: true,
        outputEvents: 3,
        confidence: "high",
        events: [],
        warnings: [],
      };

      const semantic = { ok: false, code: "HOST_NETWORK_TIMEOUT", message: "Request timed out", warnings: [] };
      const result = mapExecResultToTerminalResult(execResult, "PC1", "ping 192.168.1.1", semantic);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("HOST_NETWORK_TIMEOUT");
    });
  });
});
