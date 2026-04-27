#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

function toCableType(value: string): string {
  const raw = String(value ?? "auto").trim().toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, string> = {
    auto: "auto",
    straight: "straight",
    "straight-through": "straight",
    "copper-straight": "straight",
    "copper-straight-through": "straight",
    cross: "cross",
    crossover: "cross",
    "cross-over": "cross",
    "copper-cross": "cross",
    "copper-crossover": "cross",
    serial: "serial",
    console: "console",
    fiber: "fiber",
    phone: "phone",
    coaxial: "coaxial",
    cable: "cable",
    usb: "usb",
    wireless: "wireless",
    roll: "roll",
  };
  return aliases[raw] ?? raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEndpoint(device: string, port: string): string {
  return `${device}:${port}`;
}

async function waitForGreen(controller: any, requested: { device1: string; port1: string; device2: string; port2: string }, timeoutMs: number): Promise<any> {
  const startedAt = Date.now();
  let last: any = null;
  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await controller.snapshot();
    const links = Object.values(snapshot?.links ?? {});
    last = links.find((link: any) => {
      const direct = link?.device1 === requested.device1 && link?.port1 === requested.port1 && link?.device2 === requested.device2 && link?.port2 === requested.port2;
      const reverse = link?.device1 === requested.device2 && link?.port1 === requested.port2 && link?.device2 === requested.device1 && link?.port2 === requested.port1;
      return direct || reverse;
    }) ?? null;

    if (last?.state === "green") return last;
    await sleep(500);
  }

  return last;
}

export function createLinkAddCommand(): Command {
  return new Command("add")
    .description("Crear un enlace físico live entre dos puertos de Packet Tracer")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("-t, --type <type>", "Cable: auto, straight, cross, serial, console, fiber", "auto")
    .option("--replace", "Si un puerto está ocupado, elimina el enlace existente antes de crear el nuevo", false)
    .option("--allow-auto-fallback", "Permite autoConnectDevices si createLink exacto falla", false)
    .option("--wait-green <ms>", "Esperar hasta que el link quede verde", "0")
    .option("--verify", "Verificar live después de crear", true)
    .option("--no-verify", "No verificar después de crear")
    .option("--json", "Salida JSON")
    .option("--plan", "Mostrar plan sin mutar Packet Tracer")
    .action(async (arg1, arg2, arg3, arg4, options) => {
      const controller = createDefaultPTController();
      const endpoints = parseLinkEndpointArgs([arg1, arg2, arg3, arg4].filter(Boolean));
      const cableType = toCableType(options.type);
      const waitGreenMs = Number(options.waitGreen ?? 0);

      if (!endpoints.b.device || !endpoints.b.port) {
        throw new Error("Debes indicar ambos extremos del enlace.");
      }

      if (options.plan) {
        console.log([
          "Plan de ejecución:",
          `  1. Crear enlace ${formatEndpoint(endpoints.a.device, endpoints.a.port)} ↔ ${formatEndpoint(endpoints.b.device, endpoints.b.port)}`,
          `  2. Cable: ${cableType}`,
          `  3. Verificar estado live${waitGreenMs > 0 ? ` y esperar verde hasta ${waitGreenMs}ms` : ""}`,
        ].join("\n"));
        return;
      }

      await controller.start();
      try {
        const payload = {
          type: "addLink",
          device1: endpoints.a.device,
          port1: endpoints.a.port,
          device2: endpoints.b.device,
          port2: endpoints.b.port,
          linkType: cableType,
          cableType,
          strictPorts: true,
          allowAutoFallback: Boolean(options.allowAutoFallback),
          replaceExisting: Boolean(options.replace),
        };

        const result = await controller.getBridge().sendCommandAndWait("link.add", payload);
        const data: any = result?.value ?? null;

        if (!result?.ok) {
          if (options.json) {
            console.log(JSON.stringify({ schemaVersion: "1.0", ok: false, action: "link.add", error: result?.error ?? "Unknown error", payload }, null, 2));
          } else {
            console.log(chalk.red(`❌ No se pudo crear el link exacto`));
            console.log(`Solicitado: ${formatEndpoint(endpoints.a.device, endpoints.a.port)} ↔ ${formatEndpoint(endpoints.b.device, endpoints.b.port)}`);
            console.log(`Error: ${result?.error ?? "Unknown error"}`);
          }
          process.exitCode = 1;
          return;
        }

        const requested = {
          device1: endpoints.a.device,
          port1: data?.port1 ?? endpoints.a.port,
          device2: endpoints.b.device,
          port2: data?.port2 ?? endpoints.b.port,
          cableType,
        };

        let verification: any = { executed: Boolean(options.verify), verified: Boolean((data as any)?.state === "green"), checks: [] };
        let live: any = data;

        if (options.verify) {
          const verifyResult = await controller.getBridge().sendCommandAndWait("verifyLink", {
            type: "verifyLink",
            device1: endpoints.a.device,
            port1: data?.port1 ?? endpoints.a.port,
            device2: endpoints.b.device,
            port2: data?.port2 ?? endpoints.b.port,
          });
          verification = verifyResult?.value ?? verification;

          if (waitGreenMs > 0 && verification.state !== "green") {
            live = await waitForGreen(controller, requested, waitGreenMs);
            verification = {
              ...(verification ?? {}),
              state: live?.state ?? verification.state,
              verified: live?.state === "green",
            };
          }
        }

        if (options.json) {
          console.log(JSON.stringify({
            schemaVersion: "1.0",
            ok: true,
            action: "link.add",
            data: {
              requested,
              created: live ? {
                id: live.id,
                device1: live.device1,
                port1: live.port1,
                device2: live.device2,
                port2: live.port2,
                state: live.state,
              } : null,
            },
            verification,
          }, null, 2));
          return;
        }

        if (live?.state === "green") {
          console.log(chalk.green("✅ Link creado y verificado"));
        } else if (live) {
          console.log(chalk.yellow("⚠️ Link existe, pero todavía no está verde"));
        } else {
          console.log(chalk.red("❌ No se pudo crear el link exacto"));
        }

        console.log(`\n${formatEndpoint(endpoints.a.device, (data as any)?.port1 ?? endpoints.a.port)} ↔ ${formatEndpoint(endpoints.b.device, (data as any)?.port2 ?? endpoints.b.port)}`);
        console.log(`Cable: ${cableType}`);
        console.log(`Estado: ${live?.state ?? "unknown"}`);

        if (live?.state !== "green") {
          console.log("\nPosibles causas:");
          console.log("- STP todavía está convergiendo");
          console.log("- La interfaz está administrativamente down");
          console.log("- El dispositivo aún está booteando");
          console.log("- El cable no es compatible");
        }
      } catch (error) {
        console.error(chalk.red(`✗ Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exitCode = 1;
      } finally {
        await controller.stop();
      }
    });
}
