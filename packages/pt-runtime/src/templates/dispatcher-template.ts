/**
 * Runtime Dispatcher Template - Command dispatcher and factory
 * Routes payloads to appropriate handlers
 */

export function generateDispatcherTemplate(): string {
  return `// ============================================================================
// Command Dispatcher
// ============================================================================

return (function(payload, ipc, dprint) {
  try {
    dprint("[Runtime] Processing: " + payload.type);
    
    switch (payload.type) {
      case "addDevice": return handleAddDevice(payload);
      case "removeDevice": return handleRemoveDevice(payload);
      case "listDevices": return handleListDevices(payload);
      case "renameDevice": return handleRenameDevice(payload);
      case "addModule": return handleAddModule(payload);
      case "removeModule": return handleRemoveModule(payload);
      case "addLink": return handleAddLink(payload);
      case "removeLink": return handleRemoveLink(payload);
      case "configHost": return handleConfigHost(payload);
      case "configIos": return handleConfigIos(payload);
      case "execIos": return handleExecIos(payload);
      case "snapshot": return handleSnapshot();
      case "inspect": return handleInspect(payload);
      case "hardwareInfo": return handleHardwareInfo();
      case "hardwareCatalog": return handleHardwareCatalog(payload);
      case "commandLog": return handleCommandLog(payload);
      case "listCanvasRects": return handleListCanvasRects(payload);
      case "getRect": return handleGetRect(payload);
      case "devicesInRect": return handleDevicesInRect(payload);
      default: return { ok: false, error: "Unknown command: " + payload.type };
    }
  } catch (e) {
    dprint("[Runtime] Error: " + String(e));
    return { ok: false, error: String(e), stack: String(e.stack || "") };
  }
})(payload, ipc, dprint);
`;
}
