import { afterEach, beforeEach, expect, mock, test } from "bun:test";

const confirmMock = mock(() => {
  throw new Error("no debería mostrarse prompt cuando skipPrompt está activo");
});

mock.module("@inquirer/prompts", () => ({
  confirm: confirmMock,
}));

const isTTY = {
  stdin: process.stdin.isTTY,
  stdout: process.stdout.isTTY,
};

beforeEach(() => {
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", { value: isTTY.stdin, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: isTTY.stdout, configurable: true });
});

test("omite el prompt y confirma acciones destructivas con skipPrompt", async () => {
  const { requestConfirmation } = await import("../src/autonomy/confirmation.js");

  const result = await requestConfirmation({
    action: "topology-change",
    details: "Eliminar el dispositivo R1",
    targetDevice: "R1",
    skipPrompt: true,
  } as any);

  expect(result.confirmed).toBe(true);
  expect(result.status).toBe("confirmed");
  expect(confirmMock).not.toHaveBeenCalled();
});
