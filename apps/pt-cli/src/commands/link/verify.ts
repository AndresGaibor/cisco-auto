#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGreen(controller: any, payload: any, timeoutMs: number): Promise<any> {
  const startedAt = Date.now();
  let last: any = null;
  while (Date.now() - startedAt < timeoutMs) {
    const result = await controller.getBridge().sendCommandAndWait("verifyLink", payload);
    last = result?.value ?? null;
    if (last?.state === "green") return last;
    await sleep(500);
  }
  return last;
}

export function createLinkVerifyCommand(): Command {
  return new Command("verify")
    .description("Verificar un enlace live entre dos puertos")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("--wait-green <ms>", "Esperar hasta que quede verde", "0")
    .option("--json", "Salida en JSON", false)
    .action(async (arg1, arg2, arg3, arg4, options) => {
      const controller = createDefaultPTController();
      const endpoints = parseLinkEndpointArgs([arg1, arg2, arg3, arg4].filter(Boolean));
      if (!endpoints.b.device || !endpoints.b.port) {
        throw new Error("Debes indicar ambos extremos del enlace.");
      }
      const payload = {
        type: "verifyLink",
        device1: endpoints.a.device,
        port1: endpoints.a.port,
        device2: endpoints.b.device,
        port2: endpoints.b.port,
      };

      await controller.start();
      try {
        let result = await controller.getBridge().sendCommandAndWait("verifyLink", payload);
        let value: any = result?.value ?? null;

        if (Number(options.waitGreen ?? 0) > 0 && value?.state !== "green") {
          value = await waitForGreen(controller, payload, Number(options.waitGreen));
        }

        if (options.json) {
          console.log(JSON.stringify({
            schemaVersion: "1.0",
            ok: true,
            action: "link.verify",
            data: value,
          }, null, 2));
          return;
        }

        console.log(chalk.bold(`\n🔗 Verificación de enlace ${endpoints.a.device}:${endpoints.a.port} ↔ ${endpoints.b.device}:${endpoints.b.port}\n`));
        console.log(`  Estado: ${value?.state ?? "missing"}`);
        console.log(`  Conectado: ${value?.connected ? "sí" : "no"}`);
        console.log(`  Verde: ${value?.verified ? "sí" : "no"}`);

        if (Array.isArray(value?.advice) && value.advice.length > 0) {
          console.log("  Siguientes pasos:");
          for (const item of value.advice) {
            console.log(`   - ${item}`);
          }
        }
      } finally {
        await controller.stop();
      }
    });
}
