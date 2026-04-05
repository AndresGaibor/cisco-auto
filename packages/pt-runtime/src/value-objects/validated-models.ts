// AUTO-GENERATED FROM CORE CATALOG
// Source: packages/core/src/catalog/
// DO NOT EDIT MANUALLY - Run: bun packages/pt-runtime/src/scripts/generate-validated-model-map.ts

export const PT_MODEL_MAP: Record<string, string> = {
  "819": "819",
  "829": "829",
  "1841": "1841",
  "1941": "1941",
  "2811": "2811",
  "2901": "2901",
  "2911": "2911",
  "2950": "2950-24",
  "2960": "2960-24TT-L",
  "3560": "3560-24PS",
  "7960": "7960",
  "isr4321": "ISR4321",
  "isr4331": "ISR4331",
  "2620xm": "2620XM",
  "2621xm": "2621XM",
  "cgr1240": "CGR1240",
  "ir-8340": "IR-8340",
  "router-pt": "Router-PT",
  "c8200": "C8200",
  "2960-24tt-l": "2960-24TT-L",
  "2960-24tc-l": "2960-24TC-L",
  "2950-24": "2950-24",
  "2950t-24": "2950T-24",
  "3560-24ps": "3560-24PS",
  "3650-24ps": "3650-24PS",
  "ie2000": "IE2000",
  "ie-3400": "IE-3400",
  "ie-9320": "IE-9320",
  "bridge-pt": "Bridge-PT",
  "pc-pt": "PC-PT",
  "laptop-pt": "Laptop-PT",
  "server-pt": "Server-PT",
  "meraki-server": "Meraki-Server",
  "printer-pt": "Printer-PT",
  "home-voip-pt": "Home-VoIP-PT",
  "analog-phone-pt": "Analog-Phone-PT",
  "tabletpc-pt": "TabletPC-PT",
  "smartphone-pt": "SMARTPHONE-PT",
  "tv-pt": "TV-PT",
  "wirelessenddevice-pt": "WirelessEndDevice-PT",
  "wireddevice-pt": "WiredDevice-PT",
  "sniffer": "Sniffer",
  "datahistorianserver": "DataHistorianServer",
  "cyberobserver": "CyberObserver",
  "cloud-pt": "Cloud-PT",
  "dsl-modem-pt": "DSL-Modem-PT",
  "cable-modem-pt": "Cable-Modem-PT",
  "cell-tower": "Cell-Tower",
  "central-office-server": "Central-Office-Server",
  "accesspoint-pt": "AccessPoint-PT",
  "accesspoint-pt-a": "AccessPoint-PT-A",
  "accesspoint-pt-n": "AccessPoint-PT-N",
  "accesspoint-pt-ac": "AccessPoint-PT-AC",
  "lap-pt": "LAP-PT",
  "aironet-3702i": "Aironet-3702i",
  "wlc-pt": "WLC-PT",
  "wlc-2504": "WLC-2504",
  "wlc-3504": "WLC-3504",
  "wirelessrouter-pt": "WirelessRouter-PT",
  "home-router": "Home-Router",
  "wrt300n": "WRT300N",
  "home-gateway": "Home-Gateway",
  "repeater-pt": "Repeater-PT",
  "asa-5505": "ASA-5505",
  "asa-5506": "ASA-5506",
  "isa-3000": "ISA-3000",
  "meraki-mx65w": "Meraki-MX65W",
  "router": "1941",
  "switch": "2960-24TT-L",
  "pc": "PC-PT",
  "laptop": "Laptop-PT",
  "server": "Server-PT",
  "cloud": "Cloud-PT",
  "ap": "AccessPoint-PT"
};

export const PT_DEVICE_TYPE_MAP: Record<string, number> = {
  "819": 0,
  "829": 0,
  "1841": 0,
  "1941": 0,
  "2811": 0,
  "2901": 0,
  "2911": 0,
  "2950": 1,
  "2960": 1,
  "3560": 1,
  "7960": 3,
  "isr4321": 0,
  "isr4331": 0,
  "2620xm": 0,
  "2621xm": 0,
  "cgr1240": 0,
  "ir-8340": 0,
  "router-pt": 0,
  "c8200": 0,
  "2960-24tt-l": 1,
  "2960-24tc-l": 1,
  "2950-24": 1,
  "2950t-24": 1,
  "3560-24ps": 1,
  "3650-24ps": 1,
  "ie2000": 1,
  "ie-3400": 1,
  "ie-9320": 1,
  "bridge-pt": 1,
  "pc-pt": 3,
  "laptop-pt": 3,
  "server-pt": 4,
  "meraki-server": 4,
  "printer-pt": 5,
  "home-voip-pt": 3,
  "analog-phone-pt": 3,
  "tabletpc-pt": 3,
  "smartphone-pt": 3,
  "tv-pt": 3,
  "wirelessenddevice-pt": 3,
  "wireddevice-pt": 3,
  "sniffer": 3,
  "datahistorianserver": 4,
  "cyberobserver": 4,
  "cloud-pt": 7,
  "dsl-modem-pt": 7,
  "cable-modem-pt": 7,
  "cell-tower": 7,
  "central-office-server": 4,
  "accesspoint-pt": 6,
  "accesspoint-pt-a": 6,
  "accesspoint-pt-n": 6,
  "accesspoint-pt-ac": 6,
  "lap-pt": 6,
  "aironet-3702i": 6,
  "wlc-pt": 4,
  "wlc-2504": 4,
  "wlc-3504": 4,
  "wirelessrouter-pt": 0,
  "home-router": 0,
  "wrt300n": 0,
  "home-gateway": 0,
  "repeater-pt": 0,
  "asa-5505": 0,
  "asa-5506": 0,
  "isa-3000": 0,
  "meraki-mx65w": 0,
  "router": 0,
  "switch": 1,
  "pc": 3,
  "laptop": 3,
  "server": 4,
  "cloud": 7,
  "ap": 6
};

/**
 * Valida si un modelo existe en el catálogo validado
 * @throws Error si el modelo no existe
 */
export function validatePTModel(model: string): string {
  const key = model.toLowerCase();
  if (!(key in PT_MODEL_MAP)) {
    throw new Error(`Invalid device model: '${model}'. Must be one of: ${Object.keys(PT_MODEL_MAP).join(', ')}`);
  }
  return PT_MODEL_MAP[key];
}

/**
 * Obtiene el tipo PT para un modelo
 */
export function getPTDeviceType(model: string): number {
  const key = model.toLowerCase();
  return PT_DEVICE_TYPE_MAP[key] ?? 0;
}

/**
 * Obtiene todos los modelos válidos
 */
export function getAllValidModels(): string[] {
  return [...new Set(Object.values(PT_MODEL_MAP))];
}
