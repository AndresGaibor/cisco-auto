import { describe, it, expect } from "bun:test";
import {
  isQueueIndexFile,
  isFsSidecarFile,
  isLegacyCommandFile,
  isBridgeCommandFile,
  isBridgeResultFile,
  isDeadLetterCommandFile,
  filterBridgeCommandFiles,
  filterBridgeResultFiles,
  filterDeadLetterCommandFiles,
} from "./bridge-file-classifier";

describe("bridge-file-classifier", () => {
  describe("isQueueIndexFile", () => {
    it("returns true for _queue.json", () => {
      expect(isQueueIndexFile("_queue.json")).toBe(true);
    });
    it("returns false for other files", () => {
      expect(isQueueIndexFile("cmd_000000000001.json")).toBe(false);
      expect(isQueueIndexFile("000000000001-terminal.plan.run.json")).toBe(false);
    });
  });

  describe("isFsSidecarFile", () => {
    it("returns true for .dotfiles", () => {
      expect(isFsSidecarFile(".DS_Store")).toBe(true);
      expect(isFsSidecarFile(".hidden.json")).toBe(true);
    });
    it("returns true for .tmp files", () => {
      expect(isFsSidecarFile("file.tmp")).toBe(true);
      expect(isFsSidecarFile("something.tmp.json")).toBe(true);
    });
    it("returns true for .meta.json and .error.json", () => {
      expect(isFsSidecarFile("cmd_000000000001.meta.json")).toBe(true);
      expect(isFsSidecarFile("000000000001-terminal.plan.run.error.json")).toBe(true);
    });
    it("returns false for normal command files", () => {
      expect(isFsSidecarFile("000000000001-terminal.plan.run.json")).toBe(false);
      expect(isFsSidecarFile("cmd_000000000001.json")).toBe(false);
    });
  });

  describe("isLegacyCommandFile", () => {
    it("returns true for cmd_<seq>.json pattern", () => {
      expect(isLegacyCommandFile("cmd_000000000001.json")).toBe(true);
      expect(isLegacyCommandFile("cmd_123.json")).toBe(true);
    });
    it("returns false for new format files", () => {
      expect(isLegacyCommandFile("000000000001-terminal.plan.run.json")).toBe(false);
    });
    it("returns false for queue index", () => {
      expect(isLegacyCommandFile("_queue.json")).toBe(false);
    });
  });

  describe("isBridgeCommandFile", () => {
    it("returns true for new format command files", () => {
      expect(isBridgeCommandFile("000000000001-terminal.plan.run.json")).toBe(true);
      expect(isBridgeCommandFile("000000000042-configIos.json")).toBe(true);
    });
    it("returns true for legacy command files", () => {
      expect(isBridgeCommandFile("cmd_000000000001.json")).toBe(true);
    });
    it("returns false for sidecar files", () => {
      expect(isBridgeCommandFile(".DS_Store")).toBe(false);
      expect(isBridgeCommandFile("file.tmp")).toBe(false);
      expect(isBridgeCommandFile("cmd_000000000001.meta.json")).toBe(false);
      expect(isBridgeCommandFile("cmd_000000000001.error.json")).toBe(false);
    });
    it("returns false for queue index", () => {
      expect(isBridgeCommandFile("_queue.json")).toBe(false);
    });
  });

  describe("isBridgeResultFile", () => {
    it("returns true for legacy result files", () => {
      expect(isBridgeResultFile("cmd_000000000001.json")).toBe(true);
      expect(isBridgeResultFile("cmd_000000000042.json")).toBe(true);
    });
    it("returns false for queue index", () => {
      expect(isBridgeResultFile("_queue.json")).toBe(false);
    });
    it("returns false for sidecar files", () => {
      expect(isBridgeResultFile("cmd_000000000001.meta.json")).toBe(false);
      expect(isBridgeResultFile("cmd_000000000001.error.json")).toBe(false);
    });
    it("returns false for new format commands", () => {
      expect(isBridgeResultFile("000000000001-terminal.plan.run.json")).toBe(false);
    });
  });

  describe("isDeadLetterCommandFile", () => {
    it("returns true for any .json not matching other categories", () => {
      expect(isDeadLetterCommandFile("corrupt.json")).toBe(true);
      expect(isDeadLetterCommandFile("unknown.json")).toBe(true);
    });
    it("returns false for queue index", () => {
      expect(isDeadLetterCommandFile("_queue.json")).toBe(false);
    });
    it("returns false for sidecar files", () => {
      expect(isDeadLetterCommandFile("file.tmp")).toBe(false);
      expect(isDeadLetterCommandFile("cmd_000000000001.meta.json")).toBe(false);
    });
  });

  describe("filterBridgeCommandFiles", () => {
    it("returns only bridge command files sorted", () => {
      const files = [
        "_queue.json",
        ".DS_Store",
        "000000000002-configIos.json",
        "cmd_000000000001.json",
        "000000000001-terminal.plan.run.json",
        "file.tmp",
        "000000000003-cmd.json",
      ];
      const result = filterBridgeCommandFiles(files);
      expect(result).toEqual([
        "000000000001-terminal.plan.run.json",
        "000000000002-configIos.json",
        "000000000003-cmd.json",
        "cmd_000000000001.json",
      ]);
    });
  });

  describe("filterBridgeResultFiles", () => {
    it("returns only bridge result files sorted", () => {
      const files = [
        "_queue.json",
        "cmd_000000000002.json",
        ".DS_Store",
        "cmd_000000000001.json",
        "file.tmp",
      ];
      const result = filterBridgeResultFiles(files);
      expect(result).toEqual(["cmd_000000000001.json", "cmd_000000000002.json"]);
    });
  });

  describe("filterDeadLetterCommandFiles", () => {
    it("returns dead letter candidates sorted", () => {
      const files = [
        "_queue.json",
        "corrupt.json",
        ".DS_Store",
        "unknown.json",
        "file.tmp",
      ];
      const result = filterDeadLetterCommandFiles(files);
      expect(result).toEqual(["corrupt.json", "unknown.json"]);
    });
  });
});