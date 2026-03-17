/**
 * ModuleTemplates.ts
 * Definiciones de estructuras XML para módulos físicos de Packet Tracer.
 */

export const MODULE_TYPES = {
  // Routers ISR 1941/2911
  HWIC_2T: {
    MODEL: "HWIC-2T",
    NAME: "HWIC-2T",
    PORTS: [
      { TYPE: "eSerial", NAME: "Serial0/0/0" },
      { TYPE: "eSerial", NAME: "Serial0/0/1" }
    ]
  },
  NM_1FE_TX: {
    MODEL: "NM-1FE-TX",
    NAME: "NM-1FE-TX",
    PORTS: [{ TYPE: "eCopperFastEthernet", NAME: "FastEthernet1/0" }]
  },
  // Fibra Óptica
  GLC_LH_SM: {
    MODEL: "GLC-LH-SM",
    NAME: "GigabitEthernet-Fiber",
    PORTS: [{ TYPE: "eFiberGigabitEthernet", NAME: "GigabitEthernet0/1" }]
  },
  // Switches
  NM_1FGE: {
    MODEL: "NM-1FGE",
    NAME: "1-Port Gigabit Ethernet",
    PORTS: [{ TYPE: "eCopperGigabitEthernet", NAME: "GigabitEthernet1/1" }]
  }
};

export function createModuleNode(template: any) {
  return {
    TYPE: "eRemovableModule",
    MODEL: template.MODEL,
    PORT: template.PORTS.map((p: any) => ({
      TYPE: p.TYPE,
      NAME: p.NAME,
      POWER: "true",
      BANDWIDTH: "100000",
      FULLDUPLEX: "true",
      AUTONEGOTIATEBANDWIDTH: "true",
      AUTONEGOTIATEDUPLEX: "true",
      MACADDRESS: generateRandomMAC(),
      BIA: generateRandomMAC(),
      UP_METHOD: "5"
    }))
  };
}

function generateRandomMAC(): string {
  return "000" + Math.floor(Math.random() * 9) + "." + 
         Math.random().toString(16).toUpperCase().substring(2, 6) + "." + 
         Math.random().toString(16).toUpperCase().substring(2, 6);
}
