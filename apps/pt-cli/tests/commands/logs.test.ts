import { describe, expect, test } from "bun:test";

import { createLogCommand } from "../../src/commands/log.js";
import { createLogsCommand } from "../../src/commands/logs.js";

describe("logs command", () => {
  test("expone live en el comando padre", () => {
    const logsCommand = createLogsCommand();
    const logCommand = createLogCommand();

    expect(logsCommand.options.some((option) => option.long === "--live")).toBe(true);
    expect(logCommand.options.some((option) => option.long === "--live")).toBe(true);
  });
});
