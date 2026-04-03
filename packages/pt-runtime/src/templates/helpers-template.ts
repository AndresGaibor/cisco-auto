/**
 * Runtime Helpers Template - Generates helper functions section
 * Device type resolution, model lookup, etc.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedModelMapPath = join(__dirname, 'generated-model-map.ts');
const generatedPortMapPath = join(__dirname, 'generated-port-map.ts');
const generatedModuleMapPath = join(__dirname, 'generated-module-map.ts');

export function generateHelpersTemplate(): string {
  let generatedModelMap = '';
  let generatedDeviceTypeMap = '';
  
  try {
    const generatedContent = readFileSync(generatedModelMapPath, 'utf-8');
    const modelMapMatch = generatedContent.match(/var PT_MODEL_MAP = ({[\s\S]*?});/);
    const deviceTypeMapMatch = generatedContent.match(/var PT_DEVICE_TYPE_MAP = ({[\s\S]*?});/);
    
    if (modelMapMatch) {
      generatedModelMap = modelMapMatch[1];
    }
    if (deviceTypeMapMatch) {
      generatedDeviceTypeMap = deviceTypeMapMatch[1];
    }
  } catch (e) {
    console.warn('⚠️  No se encontró generated-model-map.ts, usando fallback');
    generatedModelMap = '{}';
    generatedDeviceTypeMap = '{}';
  }
  
  let generatedPortMap = '{}';
  try {
    const portMapContent = readFileSync(generatedPortMapPath, 'utf-8');
    const portMapMatch = portMapContent.match(/var PT_PORT_MAP = ({[\s\S]*?});/);
    if (portMapMatch) {
      generatedPortMap = portMapMatch[1];
    }
  } catch (e) {
    console.warn('⚠️  No se encontró generated-port-map.ts, usando fallback');
    generatedPortMap = '{}';
  }
  
  let generatedModuleCatalog = '{}';
  let generatedDeviceModuleSlots = '{}';
  try {
    const moduleMapContent = readFileSync(generatedModuleMapPath, 'utf-8');
    const moduleCatalogMatch = moduleMapContent.match(/var PT_MODULE_CATALOG = ({[\s\S]*?});/);
    const deviceSlotsMatch = moduleMapContent.match(/var PT_DEVICE_MODULE_SLOTS = ({[\s\S]*?});/);
    if (moduleCatalogMatch) {
      generatedModuleCatalog = moduleCatalogMatch[1];
    }
    if (deviceSlotsMatch) {
      generatedDeviceModuleSlots = deviceSlotsMatch[1];
    }
  } catch (e) {
    console.warn('⚠️  No se encontró generated-module-map.ts, usando fallback');
    generatedModuleCatalog = '{}';
    generatedDeviceModuleSlots = '{}';
  }
  
  return `// ============================================================================
// Helpers
// ============================================================================

// Modelo exacto de Packet Tracer para cada alias común (AUTO-GENERATED)
var PT_MODEL_MAP = ${generatedModelMap};

// Mapeo de modelos a deviceType numérico de PT (AUTO-GENERATED)
var PT_DEVICE_TYPE_MAP = ${generatedDeviceTypeMap};

// Mapeo de modelo -> puertos válidos (AUTO-GENERATED)
var PT_PORT_MAP = ${generatedPortMap};

// Mapeo de código de módulo -> info del módulo (AUTO-GENERATED)
var PT_MODULE_CATALOG = ${generatedModuleCatalog};

// Mapeo de modelo -> slots de módulos (AUTO-GENERATED)
var PT_DEVICE_MODULE_SLOTS = ${generatedDeviceModuleSlots};

// Registro en memoria de enlaces creados exitosamente
var LINK_REGISTRY = {};
var LINKS_FILE = DEV_DIR + "/links.json";

function normalizePortKey(name) {
  var value = String(name || "").replace(/\\s+/g, "").toLowerCase();
  var suffix = value.match(/(\\d+(?:\\/\\d+)*(?:\\.\\d+)?)$/);
  return suffix ? suffix[1] : value;
}

function getDevicePortNames(device) {
  var names = [];
  var count = 0;

  try {
    count = device.getPortCount ? device.getPortCount() : 0;
  } catch (e) {
    return names;
  }

  for (var i = 0; i < count; i++) {
    try {
      var port = device.getPortAt(i);
      if (port && port.getName) {
        var portName = port.getName();
        if (portName) names.push(String(portName));
      }
    } catch (e) {}
  }

  return names;
}

function validatePortExists(deviceModel, portName) {
  var modelKey = (deviceModel || "").toLowerCase();
  var ports = PT_PORT_MAP[modelKey];
  
  if (!ports) {
    return { valid: false, error: "Modelo '" + deviceModel + "' no encontrado en PT_PORT_MAP. Available models: " + Object.keys(PT_PORT_MAP).slice(0, 5).join(", ") + "..." };
  }
  
  var requestedLower = (portName || "").toLowerCase();
  
  if (ports[requestedLower] !== undefined) {
    return { valid: true, connector: ports[requestedLower] };
  }
  
  var availablePorts = Object.keys(ports).join(", ");
  return { 
    valid: false, 
    error: "Puerto '" + portName + "' no existe en " + deviceModel + ". Puertos válidos: " + availablePorts
  };
}

function getPortConnector(deviceModel, portName) {
  var modelKey = (deviceModel || "").toLowerCase();
  var ports = PT_PORT_MAP[modelKey];
  if (!ports) return null;
  var requestedLower = (portName || "").toLowerCase();
  return ports[requestedLower] || null;
}

var CABLE_CONNECTOR_COMPATIBILITY = {
  'straight': ['rj45'],
  'cross': ['rj45'],
  'ethernet-straight': ['rj45'],
  'ethernet-cross': ['rj45'],
  'fiber': ['sfp', 'sfp+'],
  'serial': ['serial'],
  'console': ['console'],
  'phone': ['rj45'],
  'cable': ['rj45'],
  'roll': ['rj45'],
  'auto': ['rj45', 'sfp', 'sfp+', 'serial', 'console'],
  'wireless': ['rj45'],
  'coaxial': ['rj45'],
  'octal': ['rj45'],
  'cellular': ['rj45'],
  'usb': ['usb'],
};

function validateCablePortCompatibility(cableType, connectorType) {
  if (!cableType || cableType === 'auto') return { valid: true };
  if (!connectorType) return { valid: true };
  
  var cableKey = (cableType || "").toLowerCase();
  var compatibleConnectors = CABLE_CONNECTOR_COMPATIBILITY[cableKey];
  
  if (!compatibleConnectors) {
    return { valid: true };
  }
  
  if (compatibleConnectors.indexOf(connectorType) >= 0) {
    return { valid: true };
  }
  
  return { 
    valid: false, 
    error: "Cable tipo '" + cableType + "' no es compatible con conector '" + connectorType + "'. Conectores compatibles: " + compatibleConnectors.join(", ")
  };
}

function validateModuleExists(moduleCode) {
  var moduleKey = (moduleCode || "").toUpperCase();
  var module = PT_MODULE_CATALOG[moduleKey];
  
  if (!module) {
    return { valid: false, error: "Módulo '" + moduleCode + "' no encontrado en catálogo. Módulos disponibles: " + Object.keys(PT_MODULE_CATALOG).join(", ") };
  }
  
  return { valid: true, module: module };
}

function validateModuleSlotCompatible(deviceModel, slot, moduleCode) {
  var modelKey = (deviceModel || "").toLowerCase();
  var deviceSlots = PT_DEVICE_MODULE_SLOTS[modelKey];
  
  if (!deviceSlots) {
    return { valid: false, error: "Modelo '" + deviceModel + "' no tiene información de slots de módulos" };
  }
  
  var moduleKey = (moduleCode || "").toUpperCase();
  var module = PT_MODULE_CATALOG[moduleKey];
  
  if (!module) {
    return { valid: false, error: "Módulo '" + moduleCode + "' no encontrado en catálogo" };
  }
  
  var slotIndex = parseInt(String(slot).replace(/[^0-9]/g, ''), 10) || 0;
  var slotType = deviceSlots.length > slotIndex ? deviceSlots[slotIndex].type : null;
  
  if (!slotType) {
    return { valid: false, error: "Slot '" + slot + "' no existe en " + deviceModel + ". Slots disponibles: " + deviceSlots.length };
  }
  
  if (module.slotType !== slotType) {
    var supportedForSlot = deviceSlots[slotIndex].supportedModules || [];
    return { 
      valid: false, 
      error: "Módulo '" + moduleCode + "' (tipo " + module.slotType + ") no es compatible con slot " + slot + " (tipo " + slotType + ") en " + deviceModel + ". Módulos compatibles con este slot: " + supportedForSlot.join(", ") || "ninguno"
    };
  }
  
  return { valid: true };
}

function resolveDevicePortName(device, requested) {
  var wanted = String(requested || "").replace(/\\s+/g, "").toLowerCase();
  var names = getDevicePortNames(device);

  // Pass 1: exact match across ALL ports
  for (var i = 0; i < names.length; i++) {
    var candidate = names[i];
    var candidateValue = String(candidate || "").replace(/\\s+/g, "").toLowerCase();
    if (candidateValue === wanted) return candidate;
  }

  // Pass 2: suffix match as fallback
  var wantedKey = normalizePortKey(requested);
  for (var i = 0; i < names.length; i++) {
    var candidate = names[i];
    if (normalizePortKey(candidate) === wantedKey) return candidate;
  }

  return null;
}

function loadLinkRegistry() {
  try {
    if (!fm.fileExists(LINKS_FILE)) {
      LINK_REGISTRY = {};
      return;
    }

    var content = fm.getFileContents(LINKS_FILE);
    if (!content) {
      LINK_REGISTRY = {};
      return;
    }

    var loaded = JSON.parse(content);
    LINK_REGISTRY = loaded && typeof loaded === "object" ? loaded : {};
  } catch (e) {
    LINK_REGISTRY = {};
    dprint("[loadLinkRegistry] Error: " + e);
  }
}

function saveLinkRegistry() {
  try {
    fm.writePlainTextToFile(LINKS_FILE, JSON.stringify(LINK_REGISTRY, null, 2));
  } catch (e) {
    dprint("[saveLinkRegistry] Error: " + e);
  }
}

function getLW() {
  return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
}

function getNet() {
  return ipc.network();
}

function resolveModel(model) {
  if (!model) return "1941";  // default router del catálogo
  var key = model.toLowerCase();
  
  // Mapeo desde catálogo validado (ÚNICA FUENTE DE VERDAD)
  if (PT_MODEL_MAP[key]) {
    dprint("[resolveModel] ✓ Modelo válido encontrado en catálogo: " + key + " → " + PT_MODEL_MAP[key]);
    return PT_MODEL_MAP[key];
  }
  
  // NO hay fallback - modelo debe estar en catálogo
  dprint("[resolveModel] ✗ MODELO INVÁLIDO: " + model + " NO está en catálogo");
  throw new Error("Invalid device model: '" + model + "'. Check packages/core/src/catalog/ for valid models. Available: " + Object.keys(PT_MODEL_MAP).slice(0, 5).join(", ") + "...");
}

function getDeviceTypeForModel(model) {
  var name = (model || "").toLowerCase();
  
  // 1. Intentar obtener desde PT_DEVICE_TYPE_MAP generado
  if (PT_DEVICE_TYPE_MAP[name] !== undefined) {
    return PT_DEVICE_TYPE_MAP[name];
  }
  
  // 2. Fallback: inferir desde el nombre del modelo
  if (name.indexOf("2960") === 0 || name.indexOf("3560") === 0 || name.indexOf("switch") >= 0) return DEVICE_TYPES.switch;
  if (name.indexOf("wrt") >= 0 || name.indexOf("wireless") >= 0 || name.indexOf("accesspoint") >= 0) return DEVICE_TYPES.wireless;
  if (name.indexOf("pc") === 0 || name.indexOf("laptop") === 0) return DEVICE_TYPES.pc;
  if (name.indexOf("server") === 0) return DEVICE_TYPES.server;
  if (name.indexOf("cloud") >= 0) return DEVICE_TYPES.cloud;
  if (name.indexOf("printer") >= 0) return DEVICE_TYPES.printer;
  
  // Default: router
  return DEVICE_TYPES.router;
}

function getDeviceTypeCandidates(model) {
  var normalized = (model || "").toLowerCase();
  
  // 1. Intentar obtener tipo desde catálogo
  var canonicalType = PT_DEVICE_TYPE_MAP[normalized];
  if (canonicalType !== undefined) {
    return [canonicalType];
  }
  
  // 2. Fallback: inferir desde el nombre
  // Switches específicos - intentar SOLO switch type
  if (normalized.indexOf("2960") === 0 || normalized.indexOf("3560") === 0 || normalized.indexOf("switch") >= 0) {
    return [DEVICE_TYPES.switch];
  }
  
  // Wireless específico
  if (normalized.indexOf("wrt") >= 0 || normalized.indexOf("wireless") >= 0 || normalized.indexOf("accesspoint") >= 0) {
    return [DEVICE_TYPES.wireless];
  }
  
  // PCs y laptops
  if (normalized.indexOf("pc") === 0 || normalized.indexOf("laptop") === 0) {
    return [DEVICE_TYPES.pc, DEVICE_TYPES.laptop];
  }
  
  // Servers
  if (normalized.indexOf("server") === 0) {
    return [DEVICE_TYPES.server];
  }
  
  // Printers
  if (normalized.indexOf("printer") >= 0) {
    return [DEVICE_TYPES.printer];
  }
  
  // Cloud
  if (normalized.indexOf("cloud") >= 0) {
    return [DEVICE_TYPES.cloud];
  }
  
  // Default: routers y genéricos
  return [DEVICE_TYPES.router];
}

function createDeviceWithFallback(model, x, y, typeList, lw, net) {
  dprint("[createDeviceWithFallback] Trying model='" + model + "' with types=[" + typeList.join(",") + "]");
  
  for (var i = 0; i < typeList.length; i++) {
    var typeId = typeList[i];
    dprint("[createDeviceWithFallback] Attempting: typeId=" + typeId);
    
    var autoName = lw.addDevice(typeId, model, x, y);
    
    if (!autoName) {
      dprint("[createDeviceWithFallback] lw.addDevice returned null/empty");
      continue;
    }
    
    dprint("[createDeviceWithFallback] lw.addDevice returned: " + autoName);
    
    var device = net.getDevice(autoName);
    if (!device) {
      dprint("[createDeviceWithFallback] net.getDevice('" + autoName + "') returned null");
      lw.removeDevice(autoName);
      continue;
    }
    
    var deviceModel = "";
    try { deviceModel = (device.getModel && device.getModel()) || ""; } catch (e) {
      dprint("[createDeviceWithFallback] Error getting model: " + e);
    }
    
    dprint("[createDeviceWithFallback] Device model='" + deviceModel + "', expected='" + model + "'");
    
    if (deviceModel && deviceModel.toLowerCase() === model.toLowerCase()) {
      dprint("[createDeviceWithFallback] SUCCESS with typeId=" + typeId);
      return { autoName: autoName, device: device, typeId: typeId };
    }
    
    dprint("[createDeviceWithFallback] Model mismatch, removing and trying next type");
    lw.removeDevice(autoName);
  }
  
  dprint("[createDeviceWithFallback] ALL ATTEMPTS FAILED");
  return null;
}
`;
}
