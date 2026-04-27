import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "../../application/controller-provider.js";
import { parseLinkEndpointArgs } from "../../utils/link-endpoint-parser.js";

export function createLinkRemoveCommand(): Command {
  return new Command("remove")
    .description("Eliminar un enlace live")
    .argument("[endpointOrDevice1]", "R1:Gi0/0 o R1")
    .argument("[endpointOrPort1]", "S1:Fa0/1 o Gi0/0")
    .argument("[device2]", "S1 si usas formato de 4 argumentos")
    .argument("[port2]", "Fa0/1 si usas formato de 4 argumentos")
    .option("-f, --force", "Eliminar sin confirmar", false)
    .option("--verify", "Verificar que el enlace ya no existe", true)
    .option("--json", "Salida JSON", false)
    .action(async (arg1, arg2, arg3, arg4, options) => {
      const controller = createDefaultPTController();
      const endpoints = parseLinkEndpointArgs([arg1, arg2, arg3, arg4].filter(Boolean));
      const payload: any = {
        type: "removeLink",
        device: endpoints.a.device,
        port: endpoints.a.port,
      };

      if (endpoints.b.device && endpoints.b.port) {
        payload.device2 = endpoints.b.device;
        payload.port2 = endpoints.b.port;
      }

      await controller.start();
      try {
        const result = await controller.getBridge().sendCommandAndWait("link.remove", payload);
        if (!result?.ok) {
          console.error(chalk.red(`✗ Error: ${result?.error ?? "Error desconocido"}`));
          process.exitCode = 1;
          return;
        }

        let verification: any = null;
        let verifiedAbsent = true;

        if (options.verify) {
          if (endpoints.b.device && endpoints.b.port) {
            verification = await controller.getBridge().sendCommandAndWait("verifyLink", {
              type: "verifyLink",
              device1: endpoints.a.device,
              port1: endpoints.a.port,
              device2: endpoints.b.device,
              port2: endpoints.b.port,
            });
            verifiedAbsent = !(verification?.value?.connected ?? false);
          } else {
            const snapshot = await controller.snapshot();
            const links = Object.values(snapshot?.links ?? {}) as any[];
            verifiedAbsent = !links.some((link) => (
              (link.device1 === endpoints.a.device && link.port1 === endpoints.a.port) ||
              (link.device2 === endpoints.a.device && link.port2 === endpoints.a.port)
            ));
          }
        }

        if (options.json) {
          console.log(JSON.stringify({
            ok: true,
            removed: (result.value as any)?.removed ?? null,
            verification: verification?.value ?? null,
            verifiedAbsent,
          }, null, 2));
          return;
        }

        console.log(chalk.green("✅ Link eliminado y verificado"));
        console.log(`\nEliminado:\n${endpoints.a.device}:${endpoints.a.port}${endpoints.b.device ? ` ↔ ${endpoints.b.device}:${endpoints.b.port}` : ""}`);
      } finally {
        await controller.stop();
      }
    });
}
