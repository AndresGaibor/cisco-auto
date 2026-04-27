import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

export function createLinkDoctorCommand(): Command {
  return new Command("doctor")
    .description("Diagnosticar por qué un link no está verde")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("--json", "Salida JSON", false)
    .action(async (arg1, arg2, arg3, arg4, options) => {
      const controller = createDefaultPTController();
      const values = [arg1, arg2, arg3, arg4].filter(Boolean);
      const singleValue = values.length === 1 ? String(values[0]) : "";
      const deviceOnly = values.length === 1;
      const endpoints = deviceOnly && singleValue.includes(":")
        ? { a: { device: singleValue.split(":")[0], port: singleValue.split(":")[1] }, b: { device: "", port: "" } }
        : deviceOnly
          ? { a: { device: singleValue, port: "" }, b: { device: "", port: "" } }
          : parseLinkEndpointArgs(values);
      await controller.start();
      try {
        const value: any = deviceOnly
          ? { state: "device", advice: [], connected: false, verified: false }
          : (await controller.getBridge().sendCommandAndWait("verifyLink", {
              type: "verifyLink",
              device1: endpoints.a.device,
              port1: endpoints.a.port,
              device2: endpoints.b.device,
              port2: endpoints.b.port,
            }))?.value ?? null;

        if (options.json) {
          console.log(JSON.stringify({ ok: true, diagnosis: value }, null, 2));
          return;
        }

        console.log(chalk.bold("\n🩺 Diagnóstico de link\n"));
        console.log(deviceOnly ? `Solicitado: ${endpoints.a.device}` : `Solicitado: ${endpoints.a.device}:${endpoints.a.port} ↔ ${endpoints.b.device}:${endpoints.b.port}`);
        console.log(`Resultado: ${value?.state ?? "missing"}`);
        if (Array.isArray(value?.advice) && value.advice.length > 0) {
          console.log("Siguientes pasos:");
          for (const item of value.advice) {
            console.log(`- ${item}`);
          }
        }
      } finally {
        await controller.stop();
      }
    });
}
