# Auditoria de Templates vs Handlers

## Cobertura

| Handler | Template | Handler TS | Estado | Notas |
|---------|----------|-----------|--------|------|
| handleAddDevice | device-handlers-template.ts | runtime-handlers.ts | ⚠️ | El template ejecuta la API PT directamente; el handler TS construye un plan diferido. |
| handleRemoveDevice | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleListDevices | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleRenameDevice | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleAddModule | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleRemoveModule | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleAddLink | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleRemoveLink | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleConfigHost | device-handlers-template.ts | runtime-handlers.ts | ⚠️ | El template cubre mas casos que el handler TS. |
| handleInspectHost | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleMoveDevice | device-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleConfigIos | ios-config-handlers-template.ts | runtime-handlers.ts | ⚠️ | Template y handler TS siguen estrategias distintas. |
| handleExecIos | ios-exec-handlers-template.ts | runtime-handlers.ts | ⚠️ | El manejo de sesion IOS vive en template legacy. |
| handleSnapshot | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleInspect | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleHardwareInfo | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleHardwareCatalog | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleCommandLog | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleResolveCapabilities | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleListCanvasRects | canvas-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleGetRect | canvas-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleDevicesInRect | canvas-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleClearTopology | canvas-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleEnsureVlans | vlan-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleConfigVlanInterfaces | vlan-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleConfigDhcpServer | dhcp-server-handlers-template.ts | - | ❌ | Solo existe en template. |
| handleInspectDhcpServer | dhcp-server-handlers-template.ts | - | ❌ | Solo existe en template. |

## Hallazgos

1. Hay una divergencia fuerte entre templates legacy y handlers TS.
2. Los templates todavia concentran mas comportamiento que los handlers reales.
3. El runtime legacy sigue dependiendo de llamadas directas a la API PT.
4. La base nueva de tipos y validacion permite auditar sin tocar comportamiento existente.
