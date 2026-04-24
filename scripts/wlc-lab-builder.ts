import { createDefaultPTController } from "../packages/pt-control/src/controller";

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const controller = createDefaultPTController();
  await controller.start();
  
  console.log("Limpiando workspace...");
  await controller.runPrimitive("runCode", {
    code: `
      function run() {
        ipc.options().setAnimation(false);
        var net = ipc.network();
        while (net.getDeviceCount() > 0) {
          net.removeDevice(net.getDeviceAt(0).getName());
        }
        return "Cleaned";
      }
      run();
    `
  });

  await delay(1000);

  console.log("Agregando dispositivos...");
  await controller.addDevice("WLC1", "WLC-3504");
  await controller.addDevice("SW1", "2960-24TT");
  await controller.addDevice("AAA_Server", "Server-PT");
  await controller.addDevice("R1", "2911");
  await controller.addDevice("AP1", "LAP-PT");
  await controller.addDevice("AP2", "LAP-PT");
  await controller.addDevice("AP3", "LAP-PT");

  console.log("Conectando dispositivos...");
  await controller.addLink("R1", "GigabitEthernet0/0", "SW1", "GigabitEthernet0/1");
  await controller.addLink("WLC1", "GigabitEthernet1", "SW1", "GigabitEthernet0/2");
  await controller.addLink("AAA_Server", "FastEthernet0", "SW1", "FastEthernet0/24");

  await controller.addLink("AP1", "GigabitEthernet0", "SW1", "FastEthernet0/1");
  await controller.addLink("AP2", "GigabitEthernet0", "SW1", "FastEthernet0/2");
  await controller.addLink("AP3", "GigabitEthernet0", "SW1", "FastEthernet0/3");

  console.log("Configurando Router R1 (DHCP + Option 43)...");
  await controller.runPrimitive("configIos", {
    device: "R1",
    commands: [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.10.1 255.255.255.0",
      "no shutdown",
      "exit",
      "ip dhcp pool AP_POOL",
      "network 192.168.10.0 255.255.255.0",
      "default-router 192.168.10.1",
      "option 43 ip 192.168.10.20",
      "exit"
    ]
  });

  console.log("Configurando IPs del servidor AAA y WLC...");
  await controller.configHost("AAA_Server", {
    ip: "192.168.10.10",
    mask: "255.255.255.0",
    gateway: "192.168.10.1"
  });

  // El WLC también se configura via IP en su puerto de gestión
  // pero aprovechamos el motor robusto que ya conoce su prompt especial
  console.log("Configurando IP de gestión en WLC1...");
  await controller.configIos("WLC1", [
    "interface GigabitEthernet1",
    "ip address 192.168.10.20 255.255.255.0",
    "no shutdown"
  ]);

  console.log("Lab base creado exitosamente.");
  await controller.stop();
}

main().catch(console.error);