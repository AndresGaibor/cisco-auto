import { createDefaultPTController } from "../packages/pt-control/src/controller";

async function main() {
  const controller = createDefaultPTController();
  await controller.connect();
  
  const res = await controller.runPrimitive("runCode", {
    code: `
      function run() {
        var device = api.getDeviceByName("PC1");
        var cli = device.getCommandLine();
        
        var methods = [];
        var meta = typeof cli.metaObject === "function" ? cli.metaObject() : null;
        if (meta) {
            for (var i = 0; i < meta.methodCount(); i++) {
                var method = meta.method(i);
                methods.push(typeof method.signature === "function" ? method.signature() : method.name());
            }
        }
        
        return {
           type: typeof cli,
           toString: String(cli),
           metaMethods: methods
        };
      }
      run();
    `
  });
  console.log(JSON.stringify(res, null, 2));
  
  controller.disconnect();
}

main().catch(console.error);