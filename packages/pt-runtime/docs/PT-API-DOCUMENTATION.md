# Packet Tracer IPC API - Documentación

> Exploración de la API de Packet Tracer via QTScript/JSExtensions

## Resumen de Descubrimientos

| Objeto | Métodos | Descripción |
|--------|---------|-------------|
| `ipc` | 19 | Root IPC object |
| `ipc.network()` | 14 | Gestión de red, dispositivos y enlaces |
| `ipc.hardwareFactory()` | 10 | Fabricación de hardware/dispositivos |
| `ipc.systemFileManager()` | 58 | Sistema de archivos |
| `Device` | 102 | Cualquier dispositivo en la topología |

---

## CATÁLOGO COMPLETO DE DISPOSITIVOS (170)

### Routers (type=0) - 24 modelos
| # | Modelo | Módulos |
|---|--------|---------|
| 1-2 | 1841 | 2 |
| 3 | 1941 | 2 |
| 4 | 2620XM | 2 |
| 5-6 | 2621XM | 2 |
| 7-10 | 2811 | 3 |
| 11 | 2901 | 2 |
| 12 | 2911 | 2 |
| 13 | 819HG-4G-IOX | 0 |
| 14 | 819HGW | 0 |
| 15 | 829 | 1 |
| 16 | CGR1240 | 3 |
| 17 | IR1101 | 3 |
| 18 | IR8340 | 4 |
| 19 | ISR4321 | 2 |
| 20 | ISR4331 | 2 |
| 21-22 | PT8200 | 2 |
| 23 | Router-PT | 1 |
| 24 | Router-PT-Empty | 1 |

### Switches (type=1) - 7 modelos
| # | Modelo | Módulos |
|---|--------|---------|
| 25-26 | 2950-24 | 0 |
| 27 | 2950T-24 | 0 |
| 28-30 | 2960-24TT | 0 |
| 31 | Switch-PT | 2 |
| 32 | Switch-PT-Empty | 2 |

### Cloud/Bridge/Hub (type=2-5)
| # | Modelo | Type | Módulos |
|---|--------|------|---------|
| 33 | Cloud-PT | 2 | 1 |
| 34 | Cloud-PT-Empty | 2 | 1 |
| 35 | Bridge-PT | 3 | 2 |
| 36 | Hub-PT | 4 | 1 |
| 37 | Repeater-PT | 5 | 1 |

### Red Especial (type=6-16)
| # | Modelo | Type | Módulos |
|---|--------|------|---------|
| 38 | CoAxialSplitter-PT | 6 | 0 |
| 39-42 | AccessPoint-PT variants | 7 | 1 |
| 43-44 | PC-PT | 8 | 3 |
| 45 | Server-PT | 9 | 1 |
| 46 | Printer-PT | 10 | 1 |
| 47 | Linksys-WRT300N | 11 | 0 |
| 48 | 7960 (IP Phone) | 12 | 1 |
| 49 | DSL-Modem-PT | 13 | 1 |
| 50 | Cable-Modem-PT | 14 | 1 |
| 51 | 3560-24PS | 16 | 0 |
| 52 | 3650-24PS | 16 | 3 |
| 53 | IE-2000 | 16 | 0 |
| 54 | IE-3400 | 16 | 1 |
| 55 | IE-9320 | 16 | 3 |

### End Devices (type=18-25)
| # | Modelo | Type | Módulos |
|---|--------|------|---------|
| 56-57 | Laptop-PT | 18 | 3 |
| 58 | TabletPC-PT | 19 | 0 |
| 59 | SMARTPHONE-PT | 20 | 0 |
| 60 | WirelessEndDevice-PT | 21 | 0 |
| 61 | WiredEndDevice-PT | 22 | 0 |
| 62 | TV-PT | 23 | 1 |
| 63 | Home-VoIP-PT | 24 | 0 |
| 64 | Analog-Phone-PT | 25 | 0 |

### Firewalls (type=27)
| # | Modelo | Módulos |
|---|--------|---------|
| 65 | 5505 | 2 |
| 66 | 5506-X | 2 |
| 67 | ISA-3000 | 5 |

### IoT/Industrial (type=29-39)
| # | Modelos |
|---|---------|
| 68-155 | DLC100, HomeRouter-PT-AC, Cell-Tower, Central-Office-Server, 802, 803, Sniffer, MCU-PT, SBC-PT |
| 77-154 | **74 IoT devices**: Air Conditioner, Alarm, Battery, Door, Fan, LED, Light, Motor, Servo, Smoke Detector, Temperature Sensor, Thermostat, etc. |

### Wireless Controllers (type=41)
| # | Modelo | Módulos |
|---|--------|---------|
| 156-158 | WLC-2504, WLC-3504, WLC-PT | 0 |

### Otros
| # | Modelo | Type | Módulos |
|---|--------|------|---------|
| 159 | 3702i/LAP-PT | 44 | 1 |
| 160 | Power Distribution Device | 45 | 0 |
| 161-164 | Patch Panels/Wall Mounts | 46-47 | 0 |
| 165 | Meraki-MX65W | 48 | 1 |
| 166 | Meraki-Server | 49 | 1 |
| 167 | NetworkController | 50 | 1 |
| 168 | PLC-PT | 51 | 5 |
| 169 | CyberObserver | 54 | 1 |
| 170 | DataHistorianServer | 55 | 1 |

---

## CATÁLOGO COMPLETO DE MÓDULOS (199)

### NM Modules (Legacy Router) - 1-14
| # | Módulo | Descripción |
|---|--------|-------------|
| 1-2 | NM-1E, NM-1E2W | Ethernet |
| 3-4 | NM-1FE-FX, NM-1FE-TX | Fast Ethernet |
| 5-14 | NM-1FE2W, NM-2E2W, NM-2FE2W, NM-2W, NM-4A/S, NM-4E, NM-8A/S, NM-8AM, NM-Cover, NM-ESW-161 |

### HWIC/NIM Modules - 15-30
| # | Módulo | Descripción |
|---|--------|-------------|
| 15-16 | 1240-Cellular, 1240-Cover | Cellular |
| 17 | HWIC-1GE-SFP | Gigabit |
| 18-20 | HWIC-2T, HWIC-4ESW, HWIC-8A | Serial/Switch |
| 21 | HWIC-AP-AG-B | Wireless |
| 22-24 | NIM-2T, NIM-Cover, NIM-ES2-4 | NIM |
| 25-30 | WIC-1AM, WIC-1ENET, WIC-1T, WIC-2AM, WIC-2T, WIC-Cover | WIC |

### LTE/Cellular - 31-33
| 31 | P-5GS6-GL | 5G |
| 32 | P-LTEA18-GL | LTE |

### PT Router NM Modules - 34-43
| 34-43 | PT-ROUTER-NM-1AM, PT-ROUTER-NM-1CE, PT-ROUTER-NM-1CFE, etc. |

### Power Supplies - 44-46
| 44-46 | 9320-AC-POWER-SUPPLY, AC-POWER-SUPPLY, POWER-COVER-PLATE |

### PT Switch/Cloud/Host NM - 47-106
| 47-54 | PT-SWITCH-NM-* |
| 55-72 | PT-CLOUD-NM-* |
| 73 | Linksys-WMP300N |
| 74-87 | PT-HOST-NM-* (PC/Server) |
| 88-90 | PT-MODEM-NM-* |

### Laptop/Tablet/PDA/Wireless Modules - 91-141
| 91 | Linksys-WPC300N |
| 92-105 | PT-LAPTOP-NM-* |
| 106 | IP_PHONE_POWER_ADAPTER |
| 107 | Linksys-WPC300N |
| 108-118 | PT-TABLETPC-NM-* |
| 119-131 | PT-PDA-NM-* |
| 132-141 | PT-WIRELESSENDDEVICE-NM-* |

### End Device NM - 142-150
| 142-150 | PT-WIREDENDDEVICE-NM-*, PT-HEADPHONE, PT-MICROPHONE |

### ASA/IOT/Power - 151-175
| 151 | ASA-Cover |
| 152-154 | PT-CELL-NM-* |
| 155-172 | PT-IOT-NM-* |
| 173-175 | PWR-RGD-AC-DC, PWR_IE50W_AC_L, ROUTER-ADAPTER |

### SFP Modules - 176-183
| 176-183 | GLC-FE-100FX-RGD, GLC-GE-100FX, GLC-LH-SMD, GLC-LX-SM-RGD, GLC-SX-MM-RGD, GLC-T, GLC-TE |

### Built-in Modules - 184-199
| 184-195 | C3650-BUILTIN, C9320-BUILTIN, IE3400-SFP-BUILTIN, IR1101-BUILTIN, IR8340-*, ISA3000-*, ISR4321-*, ISR4331-* |
| 196 | PT8200-BUILTIN |
| 197-199 | MERAKI-POWER-ADAPTER, ISA-DC-POWER-ADAPTER-A/B |

---

## Device API - 102 Métodos

### Gestión de Nombre y Posición (14)
`getName`, `setName`, `getXCoordinate`, `getYCoordinate`, `getCenterXCoordinate`, `getCenterYCoordinate`, `getAreaLeftX`, `getAreaTopY`, `getGlobalXPhysicalWS`, `getGlobalYPhysicalWS`, `moveToLocation`, `moveToLocationCentered`, `moveToLocInPhysicalWS`, `moveByInPhysicalWS`

### Módulos y Puertos (11)
`getPort`, `getPortAt`, `getPortCount`, `getPorts`, `getUsbPortAt`, `getUsbPortCount`, `getRs232Port`, **`addModule`**, `removeModule`, `getSupportedModule`, `getRootModule`

### Desktop y Aplicaciones (9)
`getUserDesktopAppAt`, `getUserDesktopAppById`, `getUserDesktopAppByDir`, `getUserDesktopAppCount`, `addUserDesktopApp`, `addUserDesktopAppFrom`, `addUserDesktopAppFromGlobal`, `removeUserDesktopApp`, `relinkUserDesktopApp`, `isDesktopAvailable`

### Proyecto y Código (4)
`runProject`, `stopProject`, `runCodeInProject`, `isProjectRunning`

### Potencia y Estado (6)
`getPower`, `setPower`, `getUpTime`, `getSerialNumber`, `getModel`, `getType`

### IP y Red (5)
`getCommandLine`, `getCommandPrompt`, `setDefaultGateway`, `setDhcpFlag`, `getDhcpFlag`

### Protocolos Industriales (6)
`enableCip`, `disableCip`, `enableOpc`, `disableOpc`, `enableProfinet`, `disableProfinet`

### Variables Custom (7)
`addCustomVar`, `removeCustomVar`, `getCustomVarNameAt`, `getCustomVarStr`, `getCustomVarValueStrAt`, `getCustomVarsCount`, `hasCustomVar`

### Atributos Externos (6)
`addDeviceExternalAttributes`, `clearDeviceExternalAttributes`, `getDeviceExternalAttributes`, `getDeviceExternalAttributeValue`, `setDeviceExternalAttributes`, `subtractDeviceExternalAttributes`

### Imágenes (6)
`getCustomInterface`, `setCustomInterface`, `getCustomLogicalImage`, `setCustomLogicalImage`, `getCustomPhysicalImage`, `setCustomPhysicalImage`

### Utilidades (10)
`activityTreeToXml`, `serializeToXml`, `restoreToDefault`, `updateTemplateCreationTime`, `getProcess`, `getDescriptor`, `getPhysicalObject`, `isOutdated`, `setTime`, `getObjectUuid`

### Sonido (5)
`addSound`, `playSound`, `stopSound`, `stopSounds`, `destroySounds`

### Serial/Programación (3)
`addProgrammingSerialOutputs`, `getProgrammingSerialOutputs`, `clearProgrammingSerialOutputs`

---

## Network API - 14 Métodos
`getDevice`, `getDeviceAt`, `getDeviceCount`, `getLinkAt`, `getLinkCount`, `getTotalDeviceAttributeValue`, `getClassName`, `getObjectUuid`, `registerObjectEvent`, `unregisterObjectEvent`, `registerEvent`, `registerDelegate`, `unregisterEvent`, `unregisterDelegate`

---

## HardwareFactory API - 10 Métodos
`devices()` - Devuelve DeviceFactory con:
- `getAvailableDeviceCount()`
- `getAvailableDeviceAt(index)` → DeviceDescriptor

`modules()` - Devuelve ModuleFactory con:
- `getAvailableModuleCount()`
- `getAvailableModuleAt(index)` → ModuleDescriptor

---

## DeviceDescriptor - Métodos
`addRequiredScriptModule`, `addSpecifiedModel`, `addSupportedModuleType`, `getClassName`, `getModel`, `getObjectUuid`, `getRequiredScriptModuleAt`, `getRequiredScriptModuleCount`, `getRootModule`, `getSpecifiedModelAt`, `getSpecifiedModelCount`, `getSupportedModuleTypeAt`, `getSupportedModuleTypeCount`, `getType`, `isExistSpecifiedModel`, `isModelSupported`, `isModuleTypeSupported`, `registerObjectEvent`, `removeRequiredScriptModule`, `removeSpecifiedModel`, `removeSupportedModuleType`, `setModelSupportedFlag`, `unregisterObjectEvent`

---

## Notas Técnicas

### Estructura de Prototypes
```
_IpcBase (6 métodos base)
  └── Device (102 métodos)
  └── Network (14 métodos)
  └── HardwareFactory (10 métodos)
  └── DeviceFactory/DeviceDescriptor (22 métodos)
  └── SystemFileManager (58 métodos)
```

### Acceso a Propiedades
- Las propiedades propias (`Object.keys`) solo contienen `_parser`
- **Todos los métodos están en el PROTOTYPE**
- Usar `for...in` sobre el prototype para encontrar métodos

### Compatibilidad QTScript
- NO usar template literals (backticks) → `SyntaxError`
- NO usar `print()` → no existe, usar `dprint()`
- NO usar `forEach` en algunos objetos → usar `for` loops
- Usar IIFE `(function() { ... })()` para encapsular

---

## Scripts Disponibles

| Script | Propósito |
|--------|-----------|
| `pt-minimal-explorer.js` | Lista rápida de objetos |
| `pt-targeted-explorer.js` | Explora objeto específico |
| `pt-full-methods.js` | Lista TODOS los métodos |
| `pt-full-catalog.js` | **Lista todos los 170 dispositivos y 199 módulos** |
| `pt-device-descriptor-explorer.js` | Explora DeviceDescriptor |

### Uso en Packet Tracer
1. Copiar código del script
2. Pegar en consola PT (Ctrl+Alt+Shift+X)
3. Ejecutar funciones disponibles globalmente
