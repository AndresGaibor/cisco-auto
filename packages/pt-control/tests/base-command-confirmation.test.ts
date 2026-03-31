import { expect, mock, test } from "bun:test";

const requestConfirmationMock = mock(async () => ({
  confirmed: true,
  status: "confirmed",
  correlationId: "cor_test",
  isDestructive: true,
}));

mock.module("../src/autonomy/index.js", () => ({
  requestConfirmation: requestConfirmationMock,
  getDestructiveActions: () => [],
  DESTRUCTIVE_ACTIONS: [],
  isDestructive: () => true,
  getConfirmationPrompt: () => "",
  requireConfirmation: async () => undefined,
  getActionConfirmationInfo: () => ({ needsConfirmation: true }),
  isInteractive: () => true,
}));

test("BaseCommand propaga la intención de saltar confirmación con yes", async () => {
  const { BaseCommand } = await import("../src/cli/base-command.js");

  class ProbeCommand extends BaseCommand {
    async run(): Promise<void> {}

    async ejecutarConfirmacion() {
      this.globalFlags = {
        format: "text",
        jq: undefined,
        quiet: false,
        verbose: false,
        devDir: "/tmp/pt-dev",
        yes: true,
      } as any;

      this.logSessionId = "ses_test";

      return await (this as any).confirmDestructiveAction({
        action: "topology-change",
        details: "Eliminar el dispositivo R1",
        targetDevice: "R1",
      });
    }
  }

  const command = new ProbeCommand([], {} as never);

  await command.ejecutarConfirmacion();

  expect(requestConfirmationMock).toHaveBeenCalledTimes(1);
  expect((requestConfirmationMock.mock as any).calls[0]?.[0]).toMatchObject({
    action: "topology-change",
    targetDevice: "R1",
    sessionId: "ses_test",
    skipPrompt: true,
  });
});
