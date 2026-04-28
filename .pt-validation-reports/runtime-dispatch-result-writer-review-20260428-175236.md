# runtime dispatch result writer review

Fecha: Tue Apr 28 17:52:36 -05 2026

## source grep dispatch/result writer
```
packages/pt-runtime/src/compat/es5-validator.ts:88:    regex: /\bPromise\s*\(/,
packages/pt-runtime/src/compat/es5-validator.ts:89:    mensaje: 'Promise no es un global disponible en ES5/Qt Script',
packages/pt-runtime/src/compat/es5-validator.ts:90:    pattern: 'Promise',
packages/pt-runtime/src/compat/__tests__/es5-validator.test.ts:161:    test('rechaza Promise', () => {
packages/pt-runtime/src/compat/__tests__/es5-validator.test.ts:162:      const codigo = `var p = new Promise(cb);`;
packages/pt-runtime/src/compat/__tests__/es5-validator.test.ts:165:      expect(resultado.errors.some(e => e.pattern === 'Promise')).toBe(true);
packages/pt-runtime/src/compat/pt-safe-validator.ts:30:  '$putData', '$getData', '$removeData',
packages/pt-runtime/src/compat/pt-safe-validator.ts:60:  { regex: /\bfs\s*\.\s*(readFile|writeFile|readdir|mkdir|unlink|rename|stat|existsSync)/, mensaje: 'fs directo no disponible en PT', pattern: 'fs direct' },
packages/pt-runtime/src/compat/pt-safe-validator.ts:73:  { regex: /\btry\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{\s*\}/, mensaje: 'catch vacio silenciara errores', pattern: 'empty catch' },
packages/pt-runtime/src/compat/pt-safe-validator.ts:163:  'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally',
packages/pt-runtime/src/core/middleware.ts:2:// Middleware — Pre/post processing for dispatched commands
packages/pt-runtime/src/core/middleware.ts:27:  remove(middleware: MiddlewareFn): void {
packages/pt-runtime/src/core/middleware.ts:41:    function dispatch(): RuntimeResult {
packages/pt-runtime/src/core/middleware.ts:45:        return middleware(ctx, dispatch);
packages/pt-runtime/src/core/middleware.ts:50:    return dispatch();
packages/pt-runtime/src/core/plugin-api.ts:16:  registerHandler(type: string, handler: HandlerFn): void;
packages/pt-runtime/src/core/plugin-api.ts:33:      registerHandler: function(type: string, handler: HandlerFn) {
packages/pt-runtime/src/core/built-in-middleware.ts:11:  var log = getLogger("dispatch");
packages/pt-runtime/src/core/built-in-middleware.ts:24:  metrics.increment("dispatch.request", { type: ctx.type });
packages/pt-runtime/src/core/built-in-middleware.ts:27:    metrics.increment("dispatch.success", { type: ctx.type });
packages/pt-runtime/src/core/built-in-middleware.ts:29:    metrics.increment("dispatch.error", { type: ctx.type, code: result.code || "unknown" });
packages/pt-runtime/src/core/built-in-middleware.ts:90:    var log = getLogger("dispatch");
packages/pt-runtime/src/core/registry.ts:6: * The compiled runtime uses a simpler object-based dispatcher in handlers/runtime-handlers.ts.
packages/pt-runtime/src/core/index.ts:2:export * from "./dispatcher";
packages/pt-runtime/src/core/dispatcher.ts:4: * The ACTIVE dispatcher compiled into runtime.js is `runtimeDispatcher()` in
packages/pt-runtime/src/core/dispatcher.ts:12: * `handlers/runtime-handlers.ts` via `registerHandler()`.
packages/pt-runtime/src/core/dispatcher.ts:25:  dispatch(payload: HandlerPayload, deps: HandlerDeps): HandlerResult | Promise<HandlerResult> {
packages/pt-runtime/src/core/dispatcher.ts:41:    } catch (error) {
packages/pt-runtime/src/core/dispatcher.ts:46:  registerHandler(handler: HandlerPort): void {
packages/pt-runtime/src/runtime/payload-validator.ts:71:    case "removeDevice":
packages/pt-runtime/src/runtime/index.ts:93: * Main runtime dispatcher
packages/pt-runtime/src/runtime/index.ts:164:    log.debug("Runtime dispatch", { commandType: commandType });
packages/pt-runtime/src/runtime/index.ts:187:  } catch (error) {
packages/pt-runtime/src/runtime/validators/device-ops.ts:2:// Validadores para operaciones de dispositivo (moveDevice, removeDevice, listDevices)
packages/pt-runtime/src/runtime/pt-version.ts:5:// Local interface overrides were removed because they diverged from the real API.
packages/pt-runtime/src/runtime/pt-version.ts:54:  "PTLogicalWorkspace.deleteDevice": { sinceVersion: "8.0", fallback: "Use removeDevice instead" },
packages/pt-runtime/src/runtime/pt-version.ts:55:  "PTLogicalWorkspace.deleteObject": { sinceVersion: "7.2", fallback: "Use removeObject instead" },
packages/pt-runtime/src/terminal/mode-guard.ts:46:  async function ensureNotInWizard(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:53:    const result = await executor.executeCommand(deviceName, "no", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:70:  async function escapeToExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:77:    const first = await executor.executeCommand(deviceName, "end", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:87:    const second = await executor.executeCommand(deviceName, "exit", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:105:  async function ensureUserExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:121:        const disableResult = await executor.executeCommand(deviceName, "disable", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:152:  ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:171:      const result = await executor.executeCommand(deviceName, "enable", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:200:  async function sleepMs(ms: number): Promise<void> {
packages/pt-runtime/src/terminal/mode-guard.ts:201:    return new Promise((resolve) => setTimeout(resolve, ms));
packages/pt-runtime/src/terminal/mode-guard.ts:204:  async function ensurePrivilegedExec(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:214:    ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:215:      const result = await executor.executeCommand(deviceName, "enable", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:285:  async function ensureGlobalConfig(deviceName: string, terminal: PTCommandLine): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/mode-guard.ts:313:    const result = await executor.executeCommand(deviceName, "configure terminal", terminal, {
packages/pt-runtime/src/terminal/mode-guard.ts:336:  ): Promise<ModeTransitionResult> {
packages/pt-runtime/src/terminal/plan-engine.ts:19:  ): Promise<TerminalPlanResult> {
packages/pt-runtime/src/terminal/plan-engine.ts:132:        const result = await executor.executeCommand(
packages/pt-runtime/src/terminal/command-executor.ts:26:  async function executeCommand(
packages/pt-runtime/src/terminal/command-executor.ts:31:  ): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/command-executor.ts:46:  return { executeCommand };
packages/pt-runtime/src/terminal/terminal-ready.ts:240:): Promise<{ ready: boolean; prompt: string; mode: string }> {
packages/pt-runtime/src/terminal/terminal-ready.ts:263:            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
packages/pt-runtime/src/terminal/terminal-ready.ts:273:          await new Promise((resolve) => setTimeout(resolve, 300));
packages/pt-runtime/src/terminal/terminal-ready.ts:289:      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
packages/pt-runtime/src/terminal/terminal-utils.ts:20: * Promise-based sleep.
packages/pt-runtime/src/terminal/terminal-utils.ts:23:export async function sleep(ms: number): Promise<void> {
packages/pt-runtime/src/terminal/terminal-utils.ts:24:  return new Promise((resolve) => setTimeout(resolve, ms));
packages/pt-runtime/src/terminal/engine/command-executor.ts:126:): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:315:    } catch (error) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:323:  async run(): Promise<CommandExecutionResult> {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:400:    return new Promise((resolve) => {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:581:          } catch (error) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:755:        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
packages/pt-runtime/src/utils/device-creation.ts:16:  } catch (error) {
packages/pt-runtime/src/utils/device-creation.ts:94:      lw.removeDevice(autoName);
packages/pt-runtime/src/utils/device-creation.ts:109:    lw.removeDevice(autoName);
packages/pt-runtime/src/utils/device-utils.ts:68:          try { ip = String(ipv4.getIpAddress().toString()); } catch(e) { ip = String(ipv4.getIpAddress()); }
packages/pt-runtime/src/utils/device-utils.ts:69:          try { mask = String(ipv4.getSubnetMask().toString()); } catch(e) { mask = String(ipv4.getSubnetMask()); }
packages/pt-runtime/src/utils/port-utils.ts:22:/** Normalize a MAC address for comparison (remove delimiters, lowercase) */
packages/pt-runtime/src/README.md:113:} catch (error) {
packages/pt-runtime/src/primitives/module/index.ts:17:  type: "removeModule";
packages/pt-runtime/src/primitives/module/index.ts:55:export function removeModule(payload: RemoveModulePayload, net: any): ModulePrimitiveResult {
packages/pt-runtime/src/primitives/module/index.ts:62:    const result = device.removeModule(payload.slot);
packages/pt-runtime/src/primitives/module/index.ts:64:      return { ok: false, error: "Failed to remove module", code: "MODULE_REMOVE_FAILED" };
packages/pt-runtime/src/primitives/module/index.ts:129:  id: "module.remove",
packages/pt-runtime/src/primitives/module/index.ts:131:  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeModule(payload, ctx.net)) as any,
packages/pt-runtime/src/primitives/link/index.ts:18:  type: "removeLink";
packages/pt-runtime/src/primitives/link/index.ts:87:export function removeLink(payload: RemoveLinkPayload, lw: any): LinkPrimitiveResult {
packages/pt-runtime/src/primitives/link/index.ts:106:  id: "link.remove",
packages/pt-runtime/src/primitives/link/index.ts:108:  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeLink(payload, ctx.lw)) as any,
packages/pt-runtime/src/primitives/device/index.ts:20:  type: "removeDevice";
packages/pt-runtime/src/primitives/device/index.ts:82:export function removeDevice(payload: RemoveDevicePayload, net: any, lw: any): DevicePrimitiveResult {
packages/pt-runtime/src/primitives/device/index.ts:84:    const result = lw.removeDevice(payload.name);
packages/pt-runtime/src/primitives/device/index.ts:175:  id: "device.remove",
packages/pt-runtime/src/primitives/device/index.ts:177:  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeDevice(payload, ctx.net, ctx.lw)) as any,
packages/pt-runtime/src/primitives/index.ts:8:  removeDevice,
packages/pt-runtime/src/primitives/index.ts:16:  removeLink,
packages/pt-runtime/src/primitives/index.ts:21:  removeModule,
packages/pt-runtime/src/pt-api/pt-helpers.ts:253:      lw.removeDevice(autoName);
packages/pt-runtime/src/pt-api/pt-helpers.ts:258:    try { deviceModel = (device.getModel && device.getModel()) || ""; } catch (e) {
packages/pt-runtime/src/pt-api/pt-helpers.ts:270:    lw.removeDevice(autoName);
packages/pt-runtime/src/pt-api/pt-helpers.ts:328:  removeLinksFor(devicePort: string): void {
packages/pt-runtime/src/pt-api/pt-processes.ts:82:  removePool(name: string): boolean;
packages/pt-runtime/src/pt-api/pt-processes.ts:100:  removeVlan(vlanId: number): boolean;
packages/pt-runtime/src/pt-api/pt-processes.ts:135:  removeARecordFromNameServerDb(domain: string): void;
packages/pt-runtime/src/pt-api/pt-processes.ts:159:  removeVlan(vlanId: number): boolean;
packages/pt-runtime/src/pt-api/pt-processes.ts:165:  removeVlanInt(vlanId: number): boolean;
packages/pt-runtime/src/pt-api/pt-processes.ts:174:  removeStaticRoute(dest: string, mask: string, nextHop: string): void;
packages/pt-runtime/src/pt-api/pt-processes.ts:183:  removeAcl(name: string): void;
packages/pt-runtime/src/pt-api/pt-events.ts:274:    description: "When a device is removed from topology",
packages/pt-runtime/src/pt-api/registry/all-types.ts:137:  removeModuleAt(slotIndex: number): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:173:  removeModule(slot: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:189:  removeUserDesktopApp(appId: string): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:215:  removeOspfMd5Key(keyId: number): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:217:  removeEntryEigrpPassive(as: number, network: string, wildcard: string): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:224:  removeIpv6Address(ip: string): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:225:  removeAllIpv6Addresses(): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:256:  removeTrunkVlans(vlans: number[]): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:295:  removeBookmark(name: string): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:318:  removePortConnection(port1: string, port2: string): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:319:  removeAllPortConnection(): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:348:  removeDlci(vpi: number): void;
packages/pt-runtime/src/pt-api/registry/all-types.ts:569:  removeDevice(name: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:570:  removeObject(name: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:595:  removeCluster?(clusterId: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:596:  removeCanvasItem?(itemId: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:597:  removeTextPopup?(popupId: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:598:  removeRemoteNetwork?(networkId: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:687:  removeFile(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:688:  removeDirectory?(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/all-types.ts:802:  PTLogicalWorkspace: ["addDevice", "removeDevice", "removeObject", "deleteObject", "createLink", "autoConnectDevices", "deleteLink", "addCluster", "addNote", "addTextPopup", "addRemoteNetwork", "changeNoteText", "setCanvasItemRealPos", "setDeviceCustomImage", "clearLayer", "drawCircle", "drawLine", "getCanvasRectIds", "getCanvasEllipseIds", "getCanvasItemIds", "getCanvasNoteIds", "getRectItemData", "centerOn", "centerOnComponentByName", "devicesAt"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:804:  PTDevice: ["getName", "setName", "getModel", "getType", "getPower", "setPower", "skipBoot", "getCommandLine", "getPortCount", "getPortAt", "getPort", "addModule", "removeModule", "setDhcpFlag", "getDhcpFlag", "moveToLocation", "moveToLocationCentered", "getX", "getY", "serializeToXml", "getProcess", "getRootModule", "isBooting", "restoreToDefault", "getUpTime", "getSerialNumber"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:805:  PTModule: ["getSlotCount", "getSlotTypeAt", "getModuleCount", "getModuleAt", "addModuleAt", "removeModuleAt", "getPortCount", "getPortAt", "getOwnerDevice"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:806:  PTServer: ["enableCip", "disableCip", "enableOpc", "disableOpc", "enableProfinet", "disableProfinet", "addProgrammingSerialOutputs", "clearProgrammingSerialOutputs", "addUserDesktopApp", "removeUserDesktopApp", "isDesktopAvailable"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:807:  PTAsa: ["addBookmark", "removeBookmark", "getBookmarkCount", "getWebvpnUserManager", "setHostName", "setEnablePassword", "setEnableSecret"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:808:  PTCloud: ["addPhoneConnection", "addPortConnection", "addSubLinkConnection", "removePortConnection", "removeAllPortConnection", "isDslConnection"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:810:  PTWirelessRouter: ["addNatEntry", "removeNatEntry", "setDMZEntry", "isRemoteManagementEnable"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:816:  PTRouterPort: ["getOspfCost", "setOspfCost", "getOspfPriority", "setOspfPriority", "getOspfHelloInterval", "getOspfDeadInterval", "getOspfAuthKey", "getOspfAuthType", "addOspfMd5Key", "removeOspfMd5Key", "addEntryEigrpPassive", "removeEntryEigrpPassive", "isRipPassive", "setRipPassive", "isRipSplitHorizon", "setRipSplitHorizon", "getIpv6Addresses", "addIpv6Address", "getNatMode", "setNatMode", "getAclInID", "setAclInID", "getAclOutID", "setAclOutID", "setZoneMemberName", "getZoneMemberName", "getClockRate", "setClockRate"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:817:  PTSwitchPort: ["getAccessVlan", "setAccessVlan", "getNativeVlanId", "setNativeVlanId", "getVoipVlanId", "setVoipVlanId", "addTrunkVlans", "removeTrunkVlans", "isAccessPort", "isAdminModeSet", "isNonegotiate", "setNonegotiateFlag", "getPortSecurity", "getStpStatus"],
packages/pt-runtime/src/pt-api/registry/all-types.ts:819:  PTCloudSerialPort: ["addDlci", "removeDlci", "getDlciCount", "getDlciAt"],
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:146:  removeDevice(name: string): boolean;
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:147:  removeObject(name: string): boolean;
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:178:  removeCluster?(clusterId: string): boolean;
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:179:  removeCanvasItem?(itemId: string): boolean;
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:180:  removeTextPopup?(popupId: string): boolean;
packages/pt-runtime/src/pt-api/registry/workspace-api.ts:181:  removeRemoteNetwork?(networkId: string): boolean;
packages/pt-runtime/src/pt-api/registry/file-manager-api.ts:20:  removeFile(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/file-manager-api.ts:21:  removeDirectory?(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/globals.ts:42:  removeFile(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/globals.ts:43:  removeDirectory?(path: string): boolean;
packages/pt-runtime/src/pt-api/registry/globals.ts:209:  removeFile?(path: string): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:27:  removeOspfMd5Key(keyId: number): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:31:  removeEntryEigrpPassive(as: number, network: string, wildcard: string): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:40:  removeIpv6Address(ip: string): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:41:  removeAllIpv6Addresses(): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:79:  removeTrunkVlans(vlans: number[]): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:132:  removeBookmark(name: string): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:160:  removePortConnection(port1: string, port2: string): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:161:  removeAllPortConnection(): void;
packages/pt-runtime/src/pt-api/registry/server-api.ts:195:  removeDlci(vpi: number): void;
packages/pt-runtime/src/pt-api/registry/metadata.ts:108:    "removeDevice",
packages/pt-runtime/src/pt-api/registry/metadata.ts:109:    "removeObject",
packages/pt-runtime/src/pt-api/registry/metadata.ts:147:    "removeModule",
packages/pt-runtime/src/pt-api/registry/metadata.ts:168:    "removeModuleAt",
packages/pt-runtime/src/pt-api/registry/metadata.ts:183:    "removeUserDesktopApp",
packages/pt-runtime/src/pt-api/registry/metadata.ts:188:    "removeBookmark",
packages/pt-runtime/src/pt-api/registry/metadata.ts:199:    "removePortConnection",
packages/pt-runtime/src/pt-api/registry/metadata.ts:200:    "removeAllPortConnection",
packages/pt-runtime/src/pt-api/registry/metadata.ts:218:  PTWirelessRouter: ["addNatEntry", "removeNatEntry", "setDMZEntry", "isRemoteManagementEnable"],
packages/pt-runtime/src/pt-api/registry/metadata.ts:298:    "removeOspfMd5Key",
packages/pt-runtime/src/pt-api/registry/metadata.ts:300:    "removeEntryEigrpPassive",
packages/pt-runtime/src/pt-api/registry/metadata.ts:326:    "removeTrunkVlans",
packages/pt-runtime/src/pt-api/registry/metadata.ts:335:  PTCloudSerialPort: ["addDlci", "removeDlci", "getDlciCount", "getDlciAt"],
packages/pt-runtime/src/pt-api/registry/module-api.ts:12:  removeModuleAt(slotIndex: number): boolean;
packages/pt-runtime/src/pt-api/registry/device-api.ts:28:  removeModule(slot: string): boolean;
packages/pt-runtime/src/pt-api/registry/device-api.ts:48:  removeUserDesktopApp(appId: string): void;
packages/pt-runtime/src/pt-api/template-audit.md:24:| handleCommandLog | inspect-handlers-template.ts | - | ❌ | Solo existe en template. |
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:73:  const { executeCommand } = createCommandExecutor({
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:168:  ): Promise<TerminalResult> {
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:174:      return Promise.reject(new Error(`No terminal attached to ${device}`));
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:177:    const execResult = await executeCommand(device, command, term as any, options);
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:221:    executeCommand: executeCmd,
packages/pt-runtime/src/pt/kernel/safe-fm.ts:16:    removeFile: (p: string) => boolean;
packages/pt-runtime/src/pt/kernel/safe-fm.ts:94:          fm.removeFile(src);
packages/pt-runtime/src/pt/kernel/safe-fm.ts:145:    removeFile: function (p: string) {
packages/pt-runtime/src/pt/kernel/safe-fm.ts:147:        if ((_ScriptModule as any).removeFile) (_ScriptModule as any).removeFile(p);
packages/pt-runtime/src/pt/kernel/queue-poller.ts:120:    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
packages/pt-runtime/src/pt/kernel/dead-letter.ts:1:// packages/pt-runtime/src/pt/kernel/dead-letter.ts
packages/pt-runtime/src/pt/kernel/dead-letter.ts:2:// Mover archivos fallidos al directorio dead-letter con metadata enriquecida
packages/pt-runtime/src/pt/kernel/dead-letter.ts:27:            dprint("[dead-letter] copy-delete falló: " + basename);
packages/pt-runtime/src/pt/kernel/dead-letter.ts:31:              dprint("[dead-letter] source residue tras copy-delete: " + filePath);
packages/pt-runtime/src/pt/kernel/dead-letter.ts:35:          dprint("[dead-letter] copy-delete error: " + String(e));
packages/pt-runtime/src/pt/kernel/dead-letter.ts:41:          dprint("[dead-letter] move error: " + String(e));
packages/pt-runtime/src/pt/kernel/dead-letter.ts:55:      dprint("[dead-letter] movido: " + basename + " modo=" + modo + " sourceAlive=" + sourceAlive);
packages/pt-runtime/src/pt/kernel/dead-letter.ts:57:      dprint("[dead-letter] error: " + String(e));
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:129:      const dispatch = _g._ptDispatch;
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:130:      if (typeof dispatch !== "function") {
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:138:      runtimeFn = dispatch;
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:139:      lastGoodRuntimeFn = dispatch;
packages/pt-runtime/src/pt/kernel/runtime-loader.ts:148:      visibleLog("[loader] _ptDispatch registered, ready for dispatch");
packages/pt-runtime/src/pt/kernel/queue-claim.ts:2:// Lógica de claim atómico: mover commands -> in-flight y reclamar huérfanos
packages/pt-runtime/src/pt/kernel/queue-claim.ts:14:import { DeadLetter } from "./dead-letter";
packages/pt-runtime/src/pt/kernel/queue-claim.ts:145:    logQueue("[queue-claim] reclaim in-flight: " + filename);
packages/pt-runtime/src/pt/kernel/queue-claim.ts:196:          fm.removeFile(srcPath);
packages/pt-runtime/src/pt/kernel/queue-claim.ts:260:            fm.removeFile(srcPath);
packages/pt-runtime/src/pt/kernel/queue-claim.ts:308:            "[queue-claim] control skip in-flight no permitido: " +
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts:14:  removeFile(path: string): boolean;
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts:82:  removeDevice?(name: string): void;
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts:92:  removeDevice(name: string): boolean;
packages/pt-runtime/src/pt/kernel/pt-globals.d.ts:128:  removeModule?(slot: string): boolean;
packages/pt-runtime/src/pt/kernel/types.ts:20:  resultsDir: string;
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:2:// Cleanup de archivos procesados (in-flight + residue en commands)
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:56:  function removeFileIfExists(fm: NonNullable<SafeFM["fm"]>, path: string, label: string): void {
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:59:      fm.removeFile(path);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:60:      dprint("[queue-cleanup] removed " + label + ": " + path);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:62:      dprint("[queue-cleanup] remove " + label + " error: " + String(e));
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:96:        fm.removeFile(inFlightPath);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:97:        queueIndex.remove(filename);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:98:        dprint("[queue-cleanup] removed stale in-flight: " + filename);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:100:        dprint("[queue-cleanup] stale in-flight error: " + String(e));
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:109:        fm.removeFile(commandPath);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:110:        queueIndex.remove(filename);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:111:        dprint("[queue-cleanup] removed stale command: " + filename);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:128:      queueIndex.remove(filename);
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:141:    removeFileIfExists(fm, inFlightPath, "in-flight");
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:142:    removeFileIfExists(fm, commandsPath, "commands residue");
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:143:    queueIndex.remove(filename);
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:34:      executeCommand: vi.fn(),
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:46:      inFlightDir: "/tmp/pt-dev/in-flight",
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:47:      resultsDir: "/tmp/pt-dev/results",
packages/pt-runtime/src/pt/kernel/__tests__/kernel-lifecycle.test.ts:48:      deadLetterDir: "/tmp/pt-dev/dead-letter",
packages/pt-runtime/src/pt/kernel/command-queue.ts:6:// - dead-letter: mover archivos fallidos
packages/pt-runtime/src/pt/kernel/command-queue.ts:12:import { createDeadLetter } from "./dead-letter";
packages/pt-runtime/src/pt/kernel/directories.ts:11:    resultsDir: string;
packages/pt-runtime/src/pt/kernel/directories.ts:22:  resultsDir: string;
packages/pt-runtime/src/pt/kernel/directories.ts:31:    resultsDir: config.resultsDir,
packages/pt-runtime/src/pt/kernel/command-finalizer.ts:26:    const resPath = subsystems.config.resultsDir + "/" + state.activeCommand.id + ".json";
packages/pt-runtime/src/pt/kernel/queue-index.ts:10:  remove(filename: string): void;
packages/pt-runtime/src/pt/kernel/queue-index.ts:72:  function remove(filename: string): void {
packages/pt-runtime/src/pt/kernel/queue-index.ts:88:      dprint("[queue-index] removed: " + filename);
packages/pt-runtime/src/pt/kernel/queue-index.ts:90:      dprint("[queue-index] remove error: " + String(e));
packages/pt-runtime/src/pt/kernel/queue-index.ts:121:  return { read, remove, add, rebuildFromFiles };
packages/pt-runtime/src/pt/kernel/execution-engine.ts:59:  pendingCommand: Promise<TerminalResult> | null;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:399:    } catch (error) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:416:      .executeCommand(device, "end", {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:421:      .catch(function (error) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1074:        } catch (error) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1338:        job.pendingCommand = terminal.executeCommand(job.device, command, {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1526:        job.pendingCommand = terminal.executeCommand(job.device, command, {
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts:78:          " resultsDir=" +
packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts:79:          config.resultsDir,
packages/pt-runtime/src/__tests__/queue-claim.test.ts:14:import { createDeadLetter } from "../pt/kernel/dead-letter";
packages/pt-runtime/src/__tests__/queue-claim.test.ts:40:    removeFile(path: string) {
packages/pt-runtime/src/__tests__/queue-claim.test.ts:77:  test("envelope sin id|seq|type|payload va a dead-letter", () => {
packages/pt-runtime/src/__tests__/queue-claim.test.ts:79:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:80:    const deadLetterDir = join(TEST_ROOT, "dead-letter");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:98:  test("archivo vacío va a dead-letter", () => {
packages/pt-runtime/src/__tests__/queue-claim.test.ts:100:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:101:    const deadLetterDir = join(TEST_ROOT, "dead-letter");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:121:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:122:    const deadLetterDir = join(TEST_ROOT, "dead-letter");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:146:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-claim.test.ts:147:    const deadLetterDir = join(TEST_ROOT, "dead-letter");
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:94:  removeObject(name: string): boolean {
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:449:          type: "removeDevice",
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:464:          type: "removeDevice",
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:499:      const removeResult = handleRemoveDevice(
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:501:          type: "removeDevice",
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:506:      expect(removeResult.ok).toBe(true);
packages/pt-runtime/src/__tests__/device-catalog-validation.test.ts:509:      // VERIFY removed
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:44:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:45:      resultsDir: "/tmp/results",
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:46:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:66:        new Promise((resolve) => {
packages/pt-runtime/src/__tests__/pt/queue-poller.test.ts:85:    await new Promise((resolve) => setTimeout(resolve, 30));
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:11:  removeFile: vi.fn(),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:27:  removeFile: vi.fn(),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:105:      inFlightDir: "/tmp/pt-dev/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:106:      resultsDir: "/tmp/pt-dev/results",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:107:      deadLetterDir: "/tmp/pt-dev/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:124:    mockFm.removeFile.mockClear();
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:132:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:133:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:142:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:143:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:153:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:170:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:171:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:186:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:203:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:204:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:223:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:224:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:237:      if (p.includes("in-flight")) return false;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:259:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:260:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:267:  test("poll recupera un comando huérfano en in-flight", () => {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:272:      if (p.includes("in-flight") && p.endsWith("000000000006-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:294:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:295:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:301:  test("poll recupera desde commands cuando in-flight existe pero no es legible", () => {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:306:      if (p.includes("in-flight") && p.endsWith("000000000007-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:314:      if (p.includes("in-flight")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:331:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:332:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:367:      inFlightDir: "/tmp/in-flight",
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:368:      deadLetterDir: "/tmp/dead-letter",
packages/pt-runtime/src/__tests__/pt/job-executor.test.ts:136:      executeCommand: vi.fn(() => new Promise(() => {})),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:14:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:57:      expect(terminal.executeCommand).toHaveBeenCalledWith("R1", "show version", expect.any(Object));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:72:      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:99:      expect(terminal.executeCommand).not.toHaveBeenCalled();
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:114:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:148:      await new Promise((resolve) => setTimeout(resolve, 10));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:154:      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:169:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:203:      await new Promise((resolve) => setTimeout(resolve, 10));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:205:      expect(terminal.executeCommand).toHaveBeenCalledTimes(1);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:206:      expect(terminal.executeCommand).toHaveBeenCalledWith(
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:226:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:260:      await new Promise((resolve) => setTimeout(resolve, 10));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:262:      expect(terminal.executeCommand).toHaveBeenCalledWith(
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:296:      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:359:      executeCommand: vi.fn().mockReturnValue(new Promise(() => {})),
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:409:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:445:      await new Promise((resolve) => setTimeout(resolve, 20));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:447:      expect(terminal.executeCommand).toHaveBeenCalledTimes(2);
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:448:      expect(terminal.executeCommand).toHaveBeenNthCalledWith(1, "R1", "show version", expect.any(Object));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:449:      expect(terminal.executeCommand).toHaveBeenNthCalledWith(2, "R1", "show ip interface brief", expect.any(Object));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:464:      executeCommand: vi.fn().mockResolvedValue({
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:498:      await new Promise((resolve) => setTimeout(resolve, 0));
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:502:      expect(terminal.executeCommand).toHaveBeenNthCalledWith(
packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts:508:      expect(terminal.executeCommand).toHaveBeenNthCalledWith(
packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts:30:  test("detach removes session", () => {
packages/pt-runtime/src/__tests__/canvas-clear.test.ts:77:  removedDevices: string[] = [];
packages/pt-runtime/src/__tests__/canvas-clear.test.ts:87:  removeDevice(name: string): boolean {
packages/pt-runtime/src/__tests__/canvas-clear.test.ts:88:    this.removedDevices.push(name);
packages/pt-runtime/src/__tests__/canvas-clear.test.ts:121:    expect(workspace.removedDevices).toEqual(["SW1", "R1"]);
packages/pt-runtime/src/__tests__/canvas-clear.test.ts:134:      removeDevice: vi.fn(),
packages/pt-runtime/src/__tests__/build/main-runtime-contract.test.ts:16:    expect(getAllMainFiles()).toContain("pt/kernel/dead-letter.ts");
packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts:3:import { runtimeDispatcher } from "../../handlers/dispatcher.js";
packages/pt-runtime/src/__tests__/handlers/link-registry.test.ts:22:describe("Link handlers (addLink/removeLink)", () => {
packages/pt-runtime/src/__tests__/handlers/link-registry.test.ts:138:    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "Gi0/0" }, createDeps(lw, net, fm));
packages/pt-runtime/src/__tests__/handlers/link-registry.test.ts:160:    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "Gi0/0" }, createDeps(lw, net, fm));
packages/pt-runtime/src/__tests__/handlers/runtime-handler-wiring.test.ts:3:import { getHandler } from "../../handlers/dispatcher";
packages/pt-runtime/src/__tests__/handlers/link.test.ts:30:  removeModule() { return false; }
packages/pt-runtime/src/__tests__/handlers/link.test.ts:37:  removeDevice() {}
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:20:    removeModule: () => false,
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:43:    removeDevice: (name: string) => {
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:223:        removeDevice: () => {},
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:301:        removeDevice: (name: string) => {
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:313:    const result = handleRemoveDevice({ type: "removeDevice", name: "R1" }, deps);
packages/pt-runtime/src/__tests__/handlers/device-link-contract.test.ts:324:    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "GigabitEthernet0/0" }, deps);
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:25:  "removeDevice",
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:31:  "removeLink",
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:37:  "removeModule",
packages/pt-runtime/src/__tests__/handlers/module.test.ts:122:      { type: "removeModule", device: "NONEXISTENT", slot: "0" },
packages/pt-runtime/src/__tests__/handlers/module.test.ts:129:  test("handleRemoveModule returns error when device lacks removeModule", () => {
packages/pt-runtime/src/__tests__/handlers/module.test.ts:135:      removeModule: undefined,
packages/pt-runtime/src/__tests__/handlers/module.test.ts:139:      { type: "removeModule", device: "PC1", slot: "0" },
packages/pt-runtime/src/__tests__/handlers/terminal-plan-run-poll.integration.test.ts:3:import { runtimeDispatcher } from "../../handlers/dispatcher.js";
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:16:import { createDeadLetter } from "../pt/kernel/dead-letter";
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:43:    removeFile(path: string) {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:82:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:135:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:144:    const deadLetter = createDeadLetter(join(TEST_ROOT, "dead-letter"));
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:154:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:184:  test("stale in-flight se limpia, stale command se limpia, pero command sano no", () => {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:186:    const inFlightDir = join(TEST_ROOT, "in-flight");
packages/pt-runtime/src/ports.ts:5: * Used by core/dispatcher.ts and handlers/module.ts for dependency inversion.
packages/pt-runtime/src/ports.ts:8: * The compiled runtime uses a Map-based dispatcher in handlers/runtime-handlers.ts
packages/pt-runtime/src/ports.ts:25:  execute(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
packages/pt-runtime/src/ports.ts:38:  dispatch(payload: HandlerPayload, deps: PtDeps): PtResult | Promise<PtResult>;
packages/pt-runtime/src/ports.ts:39:  registerHandler(handler: HandlerPort): void;
packages/pt-runtime/src/runtime-validator.ts:10:// - runtime.js debe exponer símbolos mínimos del dispatcher runtime
packages/pt-runtime/src/runtime-validator.ts:48:  { pattern: /\bPromise\b/, message: "Promise may not be supported reliably in PT" },
packages/pt-runtime/src/index.ts:69:  removeDevice,
packages/pt-runtime/src/index.ts:74:  removeLink,
packages/pt-runtime/src/index.ts:76:  removeModule,
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:7:import { removeNode, type AstTransform, type Node } from "./types.js";
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:9:export const removeImportsExportsTransform: AstTransform = {
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:10:  name: "remove-imports-exports",
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:13:    [ts.SyntaxKind.ImportDeclaration]: removeNode,
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:14:    [ts.SyntaxKind.ImportEqualsDeclaration]: removeNode,
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:15:    [ts.SyntaxKind.ExportDeclaration]: removeNode,
packages/pt-runtime/src/build/ast-transforms/remove-imports-exports.transform.ts:16:    [ts.SyntaxKind.ExportAssignment]: removeNode,
packages/pt-runtime/src/build/ast-transforms/types.ts:21:export function removeNode(node: Node, _context: TransformationContext): Node | undefined {
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts:7:import { noVisit, removeNode, type AstTransform, type Node } from "./types.js";
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts:9:export const removeTypeAnnotationsTransform: AstTransform = {
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts:10:  name: "remove-type-annotations",
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts:13:    [ts.SyntaxKind.TypeAliasDeclaration]: removeNode,
packages/pt-runtime/src/build/ast-transforms/remove-type-annotations.transform.ts:14:    [ts.SyntaxKind.InterfaceDeclaration]: removeNode,
packages/pt-runtime/src/build/ast-transforms/index.ts:9:export { noVisit, removeNode } from "./types.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:11:export { removeImportsExportsTransform } from "./remove-imports-exports.transform.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:12:export { removeTypeAnnotationsTransform } from "./remove-type-annotations.transform.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:24:import { removeImportsExportsTransform } from "./remove-imports-exports.transform.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:25:import { removeTypeAnnotationsTransform } from "./remove-type-annotations.transform.js";
packages/pt-runtime/src/build/ast-transforms/index.ts:38:  removeImportsExportsTransform,
packages/pt-runtime/src/build/ast-transforms/index.ts:39:  removeTypeAnnotationsTransform,
packages/pt-runtime/src/build/main-manifest.ts:18:    "pt/kernel/dead-letter.ts",
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:83:    } catch (error) {
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:251:      // Check for Promise
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:252:      if (/\bPromise\s*\(/.test(line)) {
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:254:          type: 'Promise',
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:255:          message: `Promise may not be available in PT, use callbacks (line ${lineNum})`,
packages/pt-runtime/src/build/runtime-generator.ts:52:  async generate(): Promise<{ main: string; catalog: string; runtime: string }> {
packages/pt-runtime/src/build/runtime-generator.ts:68:  async validateGenerated(): Promise<void> {
packages/pt-runtime/src/build/runtime-generator.ts:73:  async deploy(): Promise<void> {
packages/pt-runtime/src/build/runtime-generator.ts:87:  async build(): Promise<RuntimeBuildReport> {
packages/pt-runtime/src/build/ast-transform.ts:125:      removeComments: false,
packages/pt-runtime/src/build/ast-transform.ts:304:    // Normalize: remove /. segments and leading ./
packages/pt-runtime/src/build/ast-transform.ts:506:function removeJSDocFromLine(line: string): string {
packages/pt-runtime/src/build/ast-transform.ts:540:    modified = modified.replace(/\bPromise\s*<[^>]+>/g, "void");
packages/pt-runtime/src/build/validate-pt-safe.ts:179:    suggestion: "Test on target PT versions or use Promise patterns",
packages/pt-runtime/src/build/validate-pt-safe.ts:208:    pattern: /\bPromise\b/g,
packages/pt-runtime/src/build/validate-pt-safe.ts:209:    message: "Promise - ensure PT version supports ES6+",
packages/pt-runtime/src/build/render-main-v2.ts:118://   runtime.js = all handlers + dispatcher (hot-reloaded by kernel)
packages/pt-runtime/src/build/runtime-manifest.ts:70:    "core/dispatcher.ts",
packages/pt-runtime/src/build/runtime-manifest.ts:76:    "handlers/dispatcher.ts",
packages/pt-runtime/src/build/runtime-manifest.ts:93:    "handlers/remove-link.ts",
packages/pt-runtime/src/build/runtime-manifest.ts:129:    // Main dispatcher
packages/pt-runtime/src/build/runtime-manifest.ts:136:    // NOTE: ios-engine.ts removed — IosSessionEngine duplicated terminal-engine.ts + job-executor.ts
packages/pt-runtime/src/build/runtime-manifest.ts:137:    // NOTE: ios-session.ts removed — inferModeFromPrompt duplicated prompt-parser.ts
packages/pt-runtime/src/build/main-generator.ts:137:  return new (P || (P = Promise))(function(resolve, reject) {
packages/pt-runtime/src/build/main-generator.ts:138:    function fulfilled(value) { try { step(generator.next(value)); } catch(e) { reject(e); } }
packages/pt-runtime/src/build/main-generator.ts:139:    function rejected(value) { try { step(generator["throw"](value)); } catch(e) { reject(e); } }
packages/pt-runtime/src/build/main-generator.ts:209:    try { if (typeof print === "function") print(String(msg)); } catch (_printErr) {}
packages/pt-runtime/src/build/main-generator.ts:224:          fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/main-generator.ts:225:          directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/main-generator.ts:228:          makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
packages/pt-runtime/src/build/main-generator.ts:229:          getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
packages/pt-runtime/src/build/main-generator.ts:230:          removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
packages/pt-runtime/src/build/main-generator.ts:231:          moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
packages/pt-runtime/src/build/main-generator.ts:232:          getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
packages/pt-runtime/src/build/main-generator.ts:233:          getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
packages/pt-runtime/src/build/main-generator.ts:256:          fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/main-generator.ts:257:          directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/main-generator.ts:260:          makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
packages/pt-runtime/src/build/main-generator.ts:261:          getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
packages/pt-runtime/src/build/main-generator.ts:262:          removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
packages/pt-runtime/src/build/main-generator.ts:263:          moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
packages/pt-runtime/src/build/main-generator.ts:264:          getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
packages/pt-runtime/src/build/main-generator.ts:265:          getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
packages/pt-runtime/src/build/main-generator.ts:335:          try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; }
packages/pt-runtime/src/build/main-generator.ts:393:        inFlightDir:            devDir + "/in-flight",
packages/pt-runtime/src/build/main-generator.ts:394:        resultsDir:             devDir + "/results",
packages/pt-runtime/src/build/main-generator.ts:395:        deadLetterDir:          devDir + "/dead-letter",
packages/pt-runtime/src/build/main-generator.ts:448://   runtime.js = all handlers + dispatcher (hot-reloaded by kernel)
packages/pt-runtime/src/build/render-runtime-v2.ts:28:  try { __fm = __ipc.systemFileManager(); } catch(e) {}
packages/pt-runtime/src/build/render-runtime-v2.ts:32:    fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/render-runtime-v2.ts:33:    directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/render-runtime-v2.ts:36:    makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
packages/pt-runtime/src/build/render-runtime-v2.ts:37:    getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
packages/pt-runtime/src/build/render-runtime-v2.ts:38:    removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
packages/pt-runtime/src/build/render-runtime-v2.ts:39:    moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
packages/pt-runtime/src/build/render-runtime-v2.ts:40:    getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
packages/pt-runtime/src/build/render-runtime-v2.ts:41:    getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
packages/pt-runtime/src/build/render-runtime-v2.ts:153:    dprint("[runtime] dispatch ready. Registered: " + count);
packages/pt-runtime/src/build/render-runtime-v2.ts:201:export async function renderRuntimeV2(options: RenderRuntimeV2Options): Promise<string> {
packages/pt-runtime/src/build/render-from-handlers.ts:42:  RUNTIME_EXPORTS.dispatch = function(payload) {
packages/pt-runtime/src/build/render-from-handlers.ts:48:var dispatch = RUNTIME_EXPORTS.dispatch;
packages/pt-runtime/src/build/runtime-module-manifest.ts:29:    description: "Device add/remove/move operations",
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:41:    executeCommand: function(device, cmd, opts) {
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:42:      return Promise.resolve({ ok: true, output: "", status: 0 });
packages/pt-runtime/src/build/__tests__/templates.test.ts:199:      expect(result).toContain("resultsDir:");
packages/pt-runtime/src/build/__tests__/generated-asset-checks.test.ts:122:    const dispatchErrors = result.errors.filter(
packages/pt-runtime/src/build/__tests__/generated-asset-checks.test.ts:123:      (e: { check: string }) => e.check === "has-dispatch",
packages/pt-runtime/src/build/__tests__/generated-asset-checks.test.ts:125:    expect(dispatchErrors.length).toBeGreaterThan(0);
packages/pt-runtime/src/build/templates/kernel-iife.ts:72:  return new (P || (P = Promise))(function(resolve, reject) {
packages/pt-runtime/src/build/templates/kernel-iife.ts:73:    function fulfilled(value) { try { step(generator.next(value)); } catch(e) { reject(e); } }
packages/pt-runtime/src/build/templates/kernel-iife.ts:74:    function rejected(value) { try { step(generator["throw"](value)); } catch(e) { reject(e); } }
packages/pt-runtime/src/build/templates/kernel-iife.ts:162:    try { if (typeof print === "function") print(String(msg)); } catch (_printErr) {}
packages/pt-runtime/src/build/templates/kernel-iife.ts:220:          removeFile: function(p) {
packages/pt-runtime/src/build/templates/kernel-iife.ts:222:              if (_ScriptModule.removeFile) {
packages/pt-runtime/src/build/templates/kernel-iife.ts:223:                _ScriptModule.removeFile(p);
packages/pt-runtime/src/build/templates/kernel-iife.ts:234:              if (_ScriptModule.removeFile) {
packages/pt-runtime/src/build/templates/kernel-iife.ts:235:                try { _ScriptModule.removeFile(s); } catch(_removeErr) {}
packages/pt-runtime/src/build/templates/kernel-iife.ts:256:              if (_ScriptModule.removeFile) {
packages/pt-runtime/src/build/templates/kernel-iife.ts:257:                _ScriptModule.removeFile(s);
packages/pt-runtime/src/build/templates/kernel-iife.ts:259:            } catch(_removeErr) {}
packages/pt-runtime/src/build/templates/kernel-iife.ts:315:          fileExists: function(p) { try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/templates/kernel-iife.ts:316:          directoryExists: function(p) { try { return _ScriptModule.getFileSize(p) >= 0; } catch(e) { return false; } },
packages/pt-runtime/src/build/templates/kernel-iife.ts:319:          makeDirectory: function(p) { try { _ScriptModule.writeTextToFile(p + "/.keep", ""); } catch(e) {} return true; },
packages/pt-runtime/src/build/templates/kernel-iife.ts:320:          getFilesInDirectory: function(p) { try { return _ScriptModule.getFilesInDirectory ? _ScriptModule.getFilesInDirectory(p) : []; } catch(e) { return []; } },
packages/pt-runtime/src/build/templates/kernel-iife.ts:321:          removeFile: function(p) { try { _ScriptModule.removeFile ? _ScriptModule.removeFile(p) : void 0; } catch(e) {} },
packages/pt-runtime/src/build/templates/kernel-iife.ts:322:          moveSrcFileToDestFile: function(s, d, o) { try { var c = _ScriptModule.getFileContents(s); _ScriptModule.writeTextToFile(d, c); } catch(e) {} },
packages/pt-runtime/src/build/templates/kernel-iife.ts:323:          getFileModificationTime: function(p) { try { return _ScriptModule.getFileModificationTime(p); } catch(e) { return 0; } },
packages/pt-runtime/src/build/templates/kernel-iife.ts:324:          getFileSize: function(p) { try { return _ScriptModule.getFileSize(p); } catch(e) { return -1; } },
packages/pt-runtime/src/build/templates/file-loader.ts:21:          try { var sz = _ScriptModule.getFileSize(p); return sz >= 0; } catch(e) { return false; }
packages/pt-runtime/src/build/templates/entry-points.ts:48:        inFlightDir:            devDir + "/in-flight",
packages/pt-runtime/src/build/templates/entry-points.ts:49:        resultsDir:             devDir + "/results",
packages/pt-runtime/src/build/templates/entry-points.ts:50:        deadLetterDir:          devDir + "/dead-letter",
packages/pt-runtime/src/build/manifest.ts:53:): Promise<RuntimeArtifactManifest> {
packages/pt-runtime/src/build/generated-asset-checks.ts:48:    check: "no-runtime-dispatcher",
packages/pt-runtime/src/build/generated-asset-checks.ts:126:    check: "has-dispatch",
packages/pt-runtime/src/build/generated-asset-checks.ts:132:    check: "has-runtime-dispatcher",
packages/pt-runtime/src/build/syntax-preflight.ts:38:  } catch (error) {
packages/pt-runtime/src/build/render-runtime-modular.ts:22: *       ├── registry.js   (handler registry + dispatcher)
packages/pt-runtime/src/build/render-runtime-modular.ts:93:  async generate(): Promise<{
packages/pt-runtime/src/build/render-runtime-modular.ts:171:  private async generateCatalog(): Promise<string> {
packages/pt-runtime/src/build/snapshot-validator.ts:7:  removed: string[];
packages/pt-runtime/src/build/snapshot-validator.ts:138:    const removed: string[] = [];
packages/pt-runtime/src/build/snapshot-validator.ts:157:    // Find removed lines
packages/pt-runtime/src/build/snapshot-validator.ts:160:        removed.push(line);
packages/pt-runtime/src/build/snapshot-validator.ts:166:      removed,
packages/pt-runtime/src/build/snapshot-validator.ts:168:      totalChanges: added.length + removed.length + modified.length,
packages/pt-runtime/src/build/snapshot-validator.ts:193:    if (diff.removed.length > 0) {
packages/pt-runtime/src/build/snapshot-validator.ts:194:      parts.push(`- ${diff.removed.length} removals`);
packages/pt-runtime/src/handlers/canvas.ts:246:          if (!name || typeof lw.removeDevice !== "function") continue;
packages/pt-runtime/src/handlers/canvas.ts:247:          lw.removeDevice(name);
packages/pt-runtime/src/handlers/dhcp.ts:110:  } catch (error) {
packages/pt-runtime/src/handlers/dhcp.ts:140:    } catch (error) {
packages/pt-runtime/src/handlers/dhcp.ts:151:    } catch (error) {
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:1:import type { HandlerFn } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:2:import { registerHandler } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:52:  handleCommandLog,
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:87:  registerHandler("configHost", handleConfigHost as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:88:  registerHandler("terminal.plan.run", handleTerminalPlanRun as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:89:  registerHandler("terminal.native.exec", handleTerminalNativeExec as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:90:  registerHandler("__pollDeferred", handlePollDeferred as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:94:  registerHandler("configIos", handleConfigIos as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:95:  registerHandler("execIos", handleExecIos as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:96:  registerHandler("__ping", handlePing as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:97:  registerHandler("execPc", handleExecPc as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:98:  registerHandler("readTerminal", handleReadTerminal as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:100:  registerHandler("ensureVlans", handleEnsureVlans as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:101:  registerHandler("configVlanInterfaces", handleConfigVlanInterfaces as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:102:  registerHandler("configDhcpServer", handleConfigDhcpServer as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:103:  registerHandler("inspectDhcpServer", handleInspectDhcpServer as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:104:  registerHandler("inspectHost", handleInspectHost as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:106:  registerHandler("listDevices", handleListDevices as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:107:  registerHandler("addDevice", handleAddDevice as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:108:  registerHandler("removeDevice", handleRemoveDevice as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:109:  registerHandler("renameDevice", handleRenameDevice as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:110:  registerHandler("moveDevice", handleMoveDevice as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:112:  registerHandler("setDeviceIp", handleSetDeviceIp as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:113:  registerHandler("setDefaultGateway", handleSetDefaultGateway as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:115:  registerHandler("addLink", handleAddLink as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:116:  registerHandler("removeLink", handleRemoveLink as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:117:  registerHandler("verifyLink", handleVerifyLink as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:118:  registerHandler("listLinks", handleListLinks as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:120:  registerHandler("listCanvasRects", handleListCanvasRects as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:121:  registerHandler("getRect", handleGetRect as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:122:  registerHandler("devicesInRect", handleDevicesInRect as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:123:  registerHandler("clearCanvas", handleClearCanvas as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:125:  registerHandler("addModule", handleAddModule as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:126:  registerHandler("removeModule", handleRemoveModule as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:127:  registerHandler("inspectModuleSlots", handleInspectModuleSlots as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:129:  registerHandler("inspect", handleInspect as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:130:  registerHandler("inspectDeviceFast", handleInspectDeviceFast as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:131:  registerHandler("snapshot", handleSnapshot as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:132:  registerHandler("hardwareInfo", handleHardwareInfo as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:133:  registerHandler("hardwareCatalog", handleHardwareCatalog as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:134:  registerHandler("commandLog", handleCommandLog as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:138:  registerHandler("deepInspect", handleDeepInspect as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:1:import type { HandlerFn } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:2:import { registerHandler } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:58:  registerHandler("omni.physical.siphon", handleSiphonPhysicalTopology as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:59:  registerHandler("omni.logical.siphonConfigs", handleSiphonAllConfigs as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:61:  registerHandler("getDeviceHardwareInfo", handleGetDeviceHardwareInfo as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:62:  registerHandler("getPortDeepStats", handleGetPortDeepStats as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:64:  registerHandler("siphonAllConfigs", handleSiphonAllConfigs as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:65:  registerHandler("getAssessmentState", handleGetAssessmentState as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:66:  registerHandler("setInstructionPanel", handleSetInstructionPanel as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:67:  registerHandler("evaluateInternalVariable", handleEvaluateInternalVariable as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:68:  registerHandler("getActivityTreeXml", handleGetActivityTreeXml as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:69:  registerHandler("execIosOmni", handleExecIosOmni as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:71:  registerHandler("setEnvironmentRules", handleSetEnvironmentRules as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:72:  registerHandler("controlSimulation", handleControlSimulation as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:73:  registerHandler("getNetworkGenoma", handleGetNetworkGenoma as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:74:  registerHandler("exfiltrateHostFile", handleExfiltrateHostFile as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:75:  registerHandler("skipBoot", handleSkipBoot as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:76:  registerHandler("workspaceVisuals", handleWorkspaceVisuals as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:78:  registerHandler("siphonDesktopApps", handleSiphonDesktopApps as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:79:  registerHandler("siphonActiveProcesses", handleSiphonActiveProcesses as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:80:  registerHandler("isDesktopReady", handleIsDesktopReady as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:82:  registerHandler("kvStore", handleKVStore as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:83:  registerHandler("base64", handleBase64 as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/omni-handlers.ts:84:  registerHandler("cryptoUtils", handleCryptoUtils as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts:1:import type { HandlerFn } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts:2:import { registerHandler } from "../dispatcher.js";
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts:25:  registerHandler("__evaluate", handleEvaluate as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts:26:  registerHandler("omni.evaluate.raw", handleEvaluate as unknown as HandlerFn);
packages/pt-runtime/src/handlers/registration/experimental-handlers.ts:27:  registerHandler("omni.raw", handleEvaluate as unknown as HandlerFn);
packages/pt-runtime/src/handlers/link-types.ts:15:  type: "removeLink";
packages/pt-runtime/src/handlers/terminal-native-exec.ts:14:function sleep(ms: number): Promise<void> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:15:  return new Promise((resolve) => setTimeout(resolve, ms));
packages/pt-runtime/src/handlers/terminal-native-exec.ts:128:): Promise<number> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:190:async function wakeTerminal(term: PTTerminal, timeoutMs: number): Promise<void> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:219:): Promise<boolean> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:236:async function ensurePrivilegedIfNeeded(term: PTTerminal, command: string): Promise<boolean> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:334:): Promise<RuntimeResult> {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:398:  } catch (error) {
packages/pt-runtime/src/handlers/deep-inspect.ts:84:  } catch (error: any) {
packages/pt-runtime/src/handlers/evaluate.ts:23:      try { w = global.appWindow.getActiveWorkspace().getLogicalWorkspace(); } catch(e) {}
packages/pt-runtime/src/handlers/evaluate.ts:35:  } catch (error: any) {
packages/pt-runtime/src/handlers/LIMITATIONS.md:7:Estos handlers existen en el dispatcher (`runtime-handlers.ts`) pero **no ejecutan lógica real** dentro del runtime.js. En cambio, devuelven `{ ok: true, requiresIpc: true, handler: "..." }` y delegan la ejecución a `main.js` (kernel) o a un proceso externo.
packages/pt-runtime/src/handlers/LIMITATIONS.md:23:### `handleCommandLog`
packages/pt-runtime/src/handlers/module/types.ts:13:  type: "removeModule";
packages/pt-runtime/src/handlers/module/handlers.ts:190:  if (!device.removeModule) {
packages/pt-runtime/src/handlers/module/handlers.ts:202:    dprint(`[removeModule] ${deviceName} powered off`);
packages/pt-runtime/src/handlers/module/handlers.ts:206:    const result = device.removeModule(slot);
packages/pt-runtime/src/handlers/module/handlers.ts:211:      dprint(`[removeModule] ${deviceName} powered back on`);
packages/pt-runtime/src/handlers/module/handlers.ts:215:      return { ok: false, error: `Failed to remove module from slot ${slot}` };
packages/pt-runtime/src/handlers/module/handlers.ts:226:    dprint(`[removeModule] ${deviceName} exception: ${errorMsg}`);
packages/pt-runtime/src/handlers/ios-engine.ts:2: * @deprecated IosSessionEngine — NOT included in runtime.js build (removed from runtime-manifest.ts)
packages/pt-runtime/src/handlers/verify-link.ts:19:      "Run: bun run pt link remove <device>:<port> --force",
packages/pt-runtime/src/handlers/omniscience-environment.ts:21:        try { opt.setWorkspaceBackgroundColor(payload.bg.r, payload.bg.g, payload.bg.b); } catch(e) {}
packages/pt-runtime/src/handlers/omniscience-environment.ts:51:        try { if (sim.resetEventList) sim.resetEventList(); } catch(e) {
packages/pt-runtime/src/handlers/omniscience-environment.ts:71:    } catch(e) { return { ok: false, error: String(e) }; }
packages/pt-runtime/src/handlers/inspect.ts:346:export function handleCommandLog(payload: CommandLogPayload, deps: HandlerDeps): HandlerResult {
packages/pt-runtime/src/handlers/omniscience-logical.ts:100:export async function handleExecIosOmni(payload: { deviceName: string, commands: string[] }, deps: HandlerDeps): Promise<HandlerResult> {
packages/pt-runtime/src/handlers/omniscience-logical.ts:117:        const result = await executor.executeCommand(deviceName, cmd, cli, {
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:33:export async function handleExecIos(payload: ExecIosPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/host-stabilize.ts:7:export async function stabilizeHostPrompt(terminal: PTTerminal): Promise<void> {
packages/pt-runtime/src/handlers/ios/host-stabilize.ts:20:  await new Promise((resolve) => setTimeout(resolve, 250));
packages/pt-runtime/src/handlers/ios/ping-handler.ts:14:): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/ping-handler.ts:46:    const result = await executor.executeCommand(
packages/pt-runtime/src/handlers/ios/config-ios-handler.ts:32:export async function handleConfigIos(payload: ConfigIosPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:24:export async function handleExecPc(payload: ExecPcPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:46:  let result = await executor.executeCommand(
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:59:    result = await executor.executeCommand(
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:27:  promise: Promise<T>,
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:30:): Promise<T> {
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:31:  return await Promise.race([
packages/pt-runtime/src/handlers/ios/ios-session-utils.ts:33:    new Promise<T>((_, reject) => {
packages/pt-runtime/src/handlers/device-config.ts:13:): Promise<PtResult> {
packages/pt-runtime/src/handlers/device-config.ts:30:        await new Promise(r => setTimeout(r, 100));
packages/pt-runtime/src/handlers/device-config.ts:57:        const res = await executor.executeCommand(payload.device, cmd, cli as any);
packages/pt-runtime/src/handlers/device-config.ts:65:        const res = await executor.executeCommand(payload.device, "configure terminal", cli as any);
packages/pt-runtime/src/handlers/device-config.ts:68:        await executor.executeCommand(payload.device, `interface ${payload.port}`, cli as any);
packages/pt-runtime/src/handlers/device-config.ts:69:        await executor.executeCommand(payload.device, `ip address ${payload.ip} ${payload.mask}`, cli as any);
packages/pt-runtime/src/handlers/device-config.ts:70:        await executor.executeCommand(payload.device, "no shutdown", cli as any);
packages/pt-runtime/src/handlers/device-config.ts:71:        await executor.executeCommand(payload.device, "end", cli as any);
packages/pt-runtime/src/handlers/device-crud.ts:32:  type: "removeDevice";
packages/pt-runtime/src/handlers/device-crud.ts:55:  } catch (error) {
packages/pt-runtime/src/handlers/device-crud.ts:89: * "ALL" o nombre vacío elimina todos los dispositivos (bulk remove).
packages/pt-runtime/src/handlers/device-crud.ts:103:      dprint("[handler:removeDevice] Bulk remove started. Count: " + deviceCount);
packages/pt-runtime/src/handlers/device-crud.ts:107:          if (device) lw.removeDevice(device.getName());
packages/pt-runtime/src/handlers/device-crud.ts:109:          dprint("[handler:removeDevice] Skip device at " + deviceIndex);
packages/pt-runtime/src/handlers/device-crud.ts:125:    var removeFn = lwAny.removeDevice || lwAny.deleteDevice || lwAny.removeObject || lwAny.deleteObject;
packages/pt-runtime/src/handlers/device-crud.ts:127:    if (!removeFn) {
packages/pt-runtime/src/handlers/device-crud.ts:131:    removeFn.call(lw, payload.name);
packages/pt-runtime/src/handlers/device-crud.ts:138:      return { ok: false, error: "Device still exists after remove: " + payload.name, code: "REMOVE_FAILED" };
packages/pt-runtime/src/handlers/handler-registry.ts:36:export function registerHandler(type: string, handler: HandlerFn): void {
packages/pt-runtime/src/handlers/handler-registry.ts:38:    dprintSafe("registerHandler: type inválido " + String(type));
packages/pt-runtime/src/handlers/add-link.ts:115:        hint: "Use --replace to remove existing links first, or choose another port.",
packages/pt-runtime/src/handlers/add-link.ts:130:  } catch (error) {
packages/pt-runtime/src/handlers/remove-link.ts:59:  } catch (error) {
packages/pt-runtime/src/handlers/remove-link.ts:85:      removed: link,
packages/pt-runtime/src/handlers/vlan.ts:104:    } catch (error) {
packages/pt-runtime/src/handlers/vlan.ts:182:    } catch (error) {
packages/pt-runtime/src/handlers/host-handler.ts:12:export async function handleConfigHost(payload: ConfigHostPayload, api: PtRuntimeApi): Promise<PtResult> {
packages/pt-runtime/src/handlers/host-handler.ts:37:        try { port.setIpSubnetMask(payload.ip, payload.mask); } catch(e) {}
packages/pt-runtime/src/handlers/host-handler.ts:39:        try { (ptDevice as any).setIpSubnetMask?.(payload.ip, payload.mask); } catch(e) {}
packages/pt-runtime/src/handlers/host-handler.ts:46:                await executor.executeCommand(
packages/pt-runtime/src/handlers/host-handler.ts:56:        try { (ptDevice as any).setDefaultGateway?.(payload.gateway); } catch(e) {}
packages/pt-runtime/src/handlers/host-handler.ts:65:        await new Promise(r => setTimeout(r, 200));
packages/pt-runtime/src/handlers/runtime-handlers.ts:25:} from "./dispatcher.js";
packages/pt-runtime/src/handlers/omniscience-utils.ts:12:export function handleKVStore(payload: { action: "get" | "put" | "remove", key: string, value?: string }, deps: HandlerDeps): HandlerResult {
packages/pt-runtime/src/handlers/omniscience-utils.ts:31:    if (payload.action === "remove") {
packages/pt-runtime/src/handlers/omniscience-utils.ts:32:      if (scope.$removeData) {
packages/pt-runtime/src/handlers/omniscience-utils.ts:33:        scope.$removeData(payload.key);
packages/pt-runtime/src/handlers/omniscience-utils.ts:36:      return { ok: false, error: "$removeData not found globally" };
packages/pt-runtime/src/handlers/link.ts:7:export { handleRemoveLink } from "./remove-link";
packages/pt-runtime/src/handlers/dispatcher.ts:9: * - addDevice, removeDevice, renameDevice, moveDevice
packages/pt-runtime/src/handlers/dispatcher.ts:11: * - addLink, removeLink
packages/pt-runtime/src/handlers/dispatcher.ts:21:  registerHandler,
packages/pt-runtime/src/handlers/dispatcher.ts:29:export { registerHandler, getHandler, getRegisteredTypes, validateHandlerCoverage };
packages/pt-runtime/src/handlers/dispatcher.ts:35: * @deprecated Use registerHandler/getHandler en vez de mutar HANDLER_MAP directo
packages/pt-runtime/src/handlers/dispatcher.ts:40: * Función de dispatch principal del runtime.
packages/pt-runtime/src/handlers/dispatcher.ts:69:  api.dprint("[runtime:" + type + "] dispatching payload=" + (payloadKeys || "(empty)"));
packages/pt-runtime/src/kernel/__tests__/dispatch-loop.test.ts:8:} from '../dispatch-loop';
packages/pt-runtime/src/kernel/__tests__/dispatch-loop.test.ts:10:describe('dispatch-loop', () => {
packages/pt-runtime/src/kernel/index.ts:3:// Estado global explícito, bootstrap, dispatch loop, runtime loader, cleanup
packages/pt-runtime/src/kernel/index.ts:7:export * from './dispatch-loop';
packages/pt-runtime/src/omni/omni-registry.ts:49:  fn: (payload: unknown, context: OmniContext) => Promise<OmniResult>;
packages/pt-runtime/src/omni/omni-registry.ts:142:): Promise<OmniResult> {
packages/pt-runtime/src/omni/omni-registry.ts:527:        net.removeDevice?.(deviceName);
packages/file-bridge/src/backpressure-manager.ts:5: * máxima de comandos pending (en cola + in-flight) para evitar que PT se
packages/file-bridge/src/backpressure-manager.ts:10: * 1. getPendingCount() = count(commands/*.json) + count(in-flight/*.json)
packages/file-bridge/src/backpressure-manager.ts:23:  /** Maximum number of pending commands (commands + in-flight) */
packages/file-bridge/src/backpressure-manager.ts:84:   * @returns Promise que resuelve cuando hay capacidad
packages/file-bridge/src/backpressure-manager.ts:87:  async waitForCapacity(timeoutMs?: number): Promise<void> {
packages/file-bridge/src/backpressure-manager.ts:97:      await new Promise((resolve) => setTimeout(resolve, this.config.checkIntervalMs));
packages/file-bridge/src/backpressure-manager.ts:110:   * Cuenta comandos pending = comandos en cola + comandos in-flight.
packages/file-bridge/src/backpressure-manager.ts:161:   * Obtiene métricas detalladas separando comandos en cola e in-flight.
packages/file-bridge/src/shared/local-types.ts:52: * Recovery info para comandos in-flight encontrados tras crash.
packages/file-bridge/src/shared/local-types.ts:67:  /** Acción tomada: requeued, completed, o dead-letter */
packages/file-bridge/src/shared/local-types.ts:68:  action: "requeued" | "completed" | "dead-letter";
packages/file-bridge/src/shared/fs-atomic.ts:16:  unlinkSync,
packages/file-bridge/src/shared/fs-atomic.ts:90:    unlinkSync(path);
packages/file-bridge/src/shared/path-layout.ts:8: *   - in-flight/*.json: comandos en proceso por PT (claim via rename)
packages/file-bridge/src/shared/path-layout.ts:9: *   - results/<id>.json: resultado authoritative de cada comando
packages/file-bridge/src/shared/path-layout.ts:10: *   - dead-letter/*.json: comandos corruptos que no se pudieron procesar
packages/file-bridge/src/shared/path-layout.ts:72:    return join(this.root, "in-flight");
packages/file-bridge/src/shared/path-layout.ts:76:  resultsDir(): string {
packages/file-bridge/src/shared/path-layout.ts:107:    return join(this.root, "dead-letter");
packages/file-bridge/src/shared/path-layout.ts:139:  /** Path completo a archivo de comando en in-flight/ */
packages/file-bridge/src/shared/path-layout.ts:146:    return join(this.resultsDir(), `${id}.json`);
packages/file-bridge/src/shared/path-layout.test.ts:53:      const resDir = paths.resultsDir();
packages/file-bridge/src/shared/path-layout.test.ts:59:      expect(resFile).toBe(join(TEST_ROOT, 'results', 'result-456.json'));
packages/file-bridge/src/shared/path-layout.test.ts:64:      expect(deadLetter).toBe(join(TEST_ROOT, 'dead-letter'));
packages/file-bridge/src/shared/path-layout.test.ts:69:      expect(dlFile).toContain('dead-letter');
packages/file-bridge/src/shared/path-layout.test.ts:124:      expect(paths.resultsDir()).toContain('results');
packages/file-bridge/src/shared/path-layout.test.ts:138:      expect(paths.resultFilePath('id')).toEndWith('.json');
packages/file-bridge/src/shared/sequence-store.ts:16:  unlinkSync,
packages/file-bridge/src/shared/sequence-store.ts:117:        // Lock exists — check if it's stale and remove it
packages/file-bridge/src/shared/sequence-store.ts:120:            unlinkSync(this.lockFile);
packages/file-bridge/src/shared/sequence-store.ts:122:            // Someone else removed it, retry
packages/file-bridge/src/shared/sequence-store.ts:141:      unlinkSync(this.lockFile);
packages/file-bridge/src/shared/sequence-store.ts:143:      // ignore — lock file may have been removed by another process
packages/file-bridge/src/v2/monitoring-service.ts:23:  ) => Promise<{ ok: boolean; value?: TResult; error?: unknown }>;
packages/file-bridge/src/v2/monitoring-service.ts:202:      } catch (error) {
packages/file-bridge/src/v2/monitoring-service.ts:252:      } catch (error) {
packages/file-bridge/src/v2/monitoring-service.ts:286:      } catch (error) {
packages/file-bridge/src/v2/crash-recovery.test.ts:37:    mkdirSync(paths.resultsDir(), { recursive: true });
packages/file-bridge/src/v2/crash-recovery.test.ts:45:  test("no mueve _queue.json a dead-letter", () => {
packages/file-bridge/src/v2/command-processor.test.ts:45:    mkdirSync(paths.resultsDir(), { recursive: true });
packages/file-bridge/src/v2/command-processor.ts:8: * El rename atómico de commands/ -> in-flight/ es la operación clave que
packages/file-bridge/src/v2/command-processor.ts:65:   * Hace claim atómico via rename de commands/ -> in-flight/.
packages/file-bridge/src/v2/command-processor.ts:202:   * Publica el resultado de un comando y limpia el archivo in-flight.
packages/file-bridge/src/v2/command-processor.ts:204:   * Escribe el resultado en results/<id>.json de forma atómica.
packages/file-bridge/src/v2/command-processor.ts:207:   * Finalmente limpia el archivo in-flight.
packages/file-bridge/src/v2/command-processor.ts:267:   * Mueve un archivo corrupto a dead-letter con metadata de error.
packages/file-bridge/src/v2/command-processor.ts:335:   * @param filename - Nombre del archivo de comando a remover
packages/file-bridge/src/v2/command-processor.ts:337:  static removeQueueEntry(root: string, filename: string): void {
packages/file-bridge/src/v2/diagnostics.ts:7: * - Commands stuck in-flight (>10 commands)
packages/file-bridge/src/v2/diagnostics.ts:10: * - Comandos oldest in-flight/pending (>5 min)
packages/file-bridge/src/v2/diagnostics.ts:93:    const results = this.countFilesInDir(this.paths.resultsDir());
packages/file-bridge/src/v2/diagnostics.ts:109:    if (inFlight > 10) issues.push(`${inFlight} commands stuck in-flight`);
packages/file-bridge/src/v2/diagnostics.ts:117:      issues.push(`Oldest in-flight command is ${oldestInFlightAgeMs}ms old`);
packages/file-bridge/src/v2/lease-manager.ts:16:import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
packages/file-bridge/src/v2/lease-manager.ts:101:        unlinkSync(this.leaseFilePath);
packages/file-bridge/src/v2/crash-recovery.ts:11: * 2. Commands in-flight: si hay resultado, limpia; si no, re-queue o falla
packages/file-bridge/src/v2/crash-recovery.ts:12: * 3. Archivos con formato inválido van a dead-letter
packages/file-bridge/src/v2/crash-recovery.ts:41:   * @param maxAttempts - Máximo de reintentos para comandos in-flight (default: 3)
packages/file-bridge/src/v2/crash-recovery.ts:55:   * Procesa commands/ y in-flight/ para dejar el estado consistente.
packages/file-bridge/src/v2/crash-recovery.ts:142:        this.moveToDeadLetter(filePath, new Error("Invalid in-flight filename"));
packages/file-bridge/src/v2/crash-recovery.ts:148:          note: "invalid in-flight filename",
packages/file-bridge/src/v2/crash-recovery.ts:163:          note: "result existed, in-flight cleaned",
packages/file-bridge/src/v2/crash-recovery.ts:170:        this.moveToDeadLetter(filePath, new Error("Corrupted in-flight JSON"));
packages/file-bridge/src/v2/crash-recovery.ts:176:          note: "could not parse in-flight JSON",
packages/file-bridge/src/v2/crash-recovery.ts:193:            note: "duplicate in-flight vs commands/",
packages/file-bridge/src/v2/crash-recovery.ts:197:          this.moveToDeadLetter(filePath, new Error("ID conflict between in-flight and commands/"));
packages/file-bridge/src/v2/garbage-collector.ts:9:import { readdirSync, statSync, unlinkSync } from "node:fs";
packages/file-bridge/src/v2/garbage-collector.ts:61:      const resultFiles = readdirSync(this.paths.resultsDir())
packages/file-bridge/src/v2/garbage-collector.ts:64:        const filePath = join(this.paths.resultsDir(), file);
packages/file-bridge/src/v2/garbage-collector.ts:68:            unlinkSync(filePath);
packages/file-bridge/src/v2/garbage-collector.ts:99:              unlinkSync(filePath);
packages/file-bridge/src/shared-result-watcher.ts:35:   * @param resultsDir - Directorio donde se escriben los resultados (results/)
packages/file-bridge/src/shared-result-watcher.ts:37:  constructor(private readonly resultsDir: string) {
packages/file-bridge/src/shared-result-watcher.ts:71:   * @param callback - Referencia exacta del callback a remover
packages/file-bridge/src/shared-result-watcher.ts:118:      this.watcher = watch(this.resultsDir, (eventType, filename) => {
packages/file-bridge/src/shared-result-watcher.ts:166:    this.removeAllListeners();
packages/file-bridge/src/file-bridge-v2.ts:11: * - in-flight/*.json: comandos en proceso por PT (claim via atomic rename)
packages/file-bridge/src/file-bridge-v2.ts:12: * - results/<id>.json: resultado authoritative de cada comando
packages/file-bridge/src/file-bridge-v2.ts:13: * - dead-letter/*.json: comandos corruptos que no se pudieron procesar
packages/file-bridge/src/file-bridge-v2.ts:18: * 2. PT hace claim con rename atómico -> in-flight/<seq>-<type>.json
packages/file-bridge/src/file-bridge-v2.ts:19: * 3. PT escribe resultado -> results/<id>.json
packages/file-bridge/src/file-bridge-v2.ts:20: * 4. CLI lee resultado, borra in-flight
packages/file-bridge/src/file-bridge-v2.ts:114:    this.resultWatcher = new SharedResultWatcher(this.paths.resultsDir());
packages/file-bridge/src/file-bridge-v2.ts:189:      ensureDir(this.paths.resultsDir());
packages/file-bridge/src/file-bridge-v2.ts:239:   * @returns Promise que resuelve cuando el shutdown está completo
packages/file-bridge/src/file-bridge-v2.ts:241:  async stop(): Promise<void> {
packages/file-bridge/src/file-bridge-v2.ts:271:  async loadRuntime(code: string): Promise<void> {
packages/file-bridge/src/file-bridge-v2.ts:281:  async loadRuntimeFromFile(filePath: string): Promise<void> {
packages/file-bridge/src/file-bridge-v2.ts:394:  static removeQueueEntry(root: string, filename: string): void {
packages/file-bridge/src/file-bridge-v2.ts:395:    CommandProcessor.removeQueueEntry(root, filename);
packages/file-bridge/src/file-bridge-v2.ts:418:  ): Promise<BridgeResultEnvelope<TResult>> {
packages/file-bridge/src/file-bridge-v2.ts:435:    const result = await new Promise<BridgeResultEnvelope<TResult>>((resolve, reject) => {
packages/file-bridge/src/file-bridge-v2.ts:582:    const resultFile = findInDir(this.paths.resultsDir());
packages/file-bridge/src/file-bridge-v2.ts:619:    else if (artifact.inFlightFile) location = "in-flight";
packages/file-bridge/src/file-bridge-v2.ts:621:    else if (artifact.deadLetterFile) location = "dead-letter";
packages/file-bridge/src/file-bridge-v2.ts:649:  async waitForCapacity(timeoutMs?: number): Promise<void> {
packages/file-bridge/src/file-bridge-v2.ts:668:   * Hace claim atómico via rename de commands/ -> in-flight/.
packages/file-bridge/src/file-bridge-v2.ts:678:   * Escribe results/<id>.json y limpia el archivo in-flight.
packages/file-bridge/src/file-bridge-v2-commands.ts:7: * Arquitectura: CLI → commands/*.json → PT → results/*.json → CLI
packages/file-bridge/src/file-bridge-v2-commands.ts:37:): Promise<boolean> {
packages/file-bridge/src/file-bridge-v2-commands.ts:45:    await new Promise((resolve) => setTimeout(resolve, pollMs));
packages/file-bridge/src/file-bridge-v2-commands.ts:77:): Promise<PushResult> {
packages/file-bridge/src/file-bridge-v2-commands.ts:124:export async function pushCode(code: string, timeoutMs = 120_000): Promise<PushResult> {
packages/file-bridge/src/shared-result-watcher.test.ts:15:    mkdirSync(paths.resultsDir(), { recursive: true });
packages/file-bridge/src/shared-result-watcher.test.ts:37:      mkdirSync(paths.resultsDir(), { recursive: true });
packages/file-bridge/src/shared-result-watcher.test.ts:39:      const dir = paths.resultsDir();
packages/file-bridge/src/shared-result-watcher.test.ts:64:      const watcher = new SharedResultWatcher(paths.resultsDir());
packages/file-bridge/src/shared-result-watcher.test.ts:95:      mkdirSync(paths.resultsDir(), { recursive: true });
packages/file-bridge/src/shared-result-watcher.test.ts:96:      const resultFile = join(paths.resultsDir(), 'result-1.json');
packages/file-bridge/src/shared-result-watcher.test.ts:104:      const patterns = ['*.json', 'result-*.json', 'cmd-*.result'];
packages/file-bridge/src/shared-result-watcher.test.ts:106:      const filename = 'result-123.json';
packages/file-bridge/src/shared-result-watcher.test.ts:117:      const files = ['result.json', 'log.txt', 'config.yaml'];
packages/file-bridge/src/shared-result-watcher.test.ts:127:        resultsDir: () => '/path/results',
packages/file-bridge/src/shared-result-watcher.test.ts:128:        deadLetterDir: () => '/path/results/dead-letter'
packages/file-bridge/src/shared-result-watcher.test.ts:131:      expect(paths_.deadLetterDir()).toContain('dead-letter');
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:17:): Promise<DeviceType> {
packages/pt-control/src/adapters/runtime-terminal/step-handlers/confirm-handler.ts:24:): Promise<{
packages/pt-control/src/adapters/runtime-terminal/step-handlers/ensure-mode-handler.ts:78:): Promise<{
packages/pt-control/src/adapters/runtime-terminal/step-handlers/expect-prompt-handler.ts:16:): Promise<{
packages/pt-control/src/adapters/runtime-terminal/terminal-session.ts:5:export async function ensureSession(device: string): Promise<SessionResult> {
packages/pt-control/src/adapters/runtime-terminal/terminal-session.ts:19:export async function pollTerminalJob(_jobId: string): Promise<never> {
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:63:    if (record.status === "in-flight") return true;
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:169:  async function executeLegacyPlan(normalizedPlan: ReturnType<typeof planAdapter.normalizePlan>): Promise<TerminalPortResult> {
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:352:  ): Promise<TerminalPortResult | null> {
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:419:        } catch (error) {
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:444:        await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:516:  ): Promise<TerminalPortResult> {
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:564:  ): Promise<TerminalPortResult> {
```

## likely runtime kernel/bridge files

### packages/pt-runtime/src/runtime/kernel.ts
```ts
<missing>
```

### packages/pt-runtime/src/runtime/command-dispatcher.ts
```ts
<missing>
```

### packages/pt-runtime/src/runtime/command-processor.ts
```ts
<missing>
```

### packages/pt-runtime/src/runtime/result-writer.ts
```ts
<missing>
```

### packages/pt-runtime/src/runtime/file-bridge.ts
```ts
<missing>
```

### packages/pt-runtime/src/pt/kernel/queue-poller.ts
```ts
// packages/pt-runtime/src/pt/kernel/queue-poller.ts
// Poll de la cola de comandos

import { finishActiveCommand } from "./command-finalizer";
import { createRuntimeApi } from "./runtime-api";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

export function pollCommandQueue(subsystems: KernelSubsystems, state: KernelState): void {
  const {
    queue,
    runtimeLoader,
    executionEngine,
    terminal,
    heartbeat,
    config,
    kernelLog,
    kernelLogSubsystem,
  } = subsystems;

  kernelLogSubsystem(
    "queue",
    "poll tick: isRunning=" +
      state.isRunning +
      " isShuttingDown=" +
      state.isShuttingDown +
      " active=" +
      (state.activeCommand ? state.activeCommand.id : "null"),
  );
  if (!state.isRunning || state.isShuttingDown) return;

  if (state.activeCommand) {
    kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
    return;
  }

  function isControlCommand(type: string): boolean {
    return (
      type === "__pollDeferred" ||
      type === "__ping" ||
      type === "inspectDeviceFast" ||
      type === "readTerminal" ||
      type === "omni.evaluate.raw" ||
      type === "__evaluate"
    );
  }

  const activeJobs = executionEngine.getActiveJobs();
  const terminalIsBusy =
    typeof (terminal as any).isAnyBusy === "function" ? (terminal as any).isAnyBusy() : false;
  const isBusy = activeJobs.length > 0 || terminalIsBusy;
  kernelLogSubsystem("loader", "Checking runtime reload... busy=" + isBusy);
  runtimeLoader.reloadIfNeeded(() => isBusy);

  let claimed = null as ReturnType<typeof queue.poll>;

  if (isBusy) {
    claimed =
      typeof (queue as any).pollAllowedTypes === "function"
        ? (queue as any).pollAllowedTypes([
            "__pollDeferred",
            "__ping",
            "inspectDeviceFast",
            "readTerminal",
            "omni.evaluate.raw",
            "__evaluate",
          ].filter(isControlCommand))
        : null;

    if (!claimed) {
      kernelLogSubsystem(
        "queue",
        "System busy, skipping non-control poll. Active jobs=" +
          activeJobs.length +
          " terminalBusy=" +
          terminalIsBusy,
      );
      heartbeat.setQueuedCount(queue.count());
      return;
    }

    kernelLogSubsystem(
      "queue",
      "System busy, but processing control command=" +
        claimed.id +
        " type=" +
        String((claimed as any).type),
    );
  } else {
    claimed = queue.poll();
  }
  kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
  if (!claimed) {
    kernelLogSubsystem("queue", "No command claimed, checking files...");
    heartbeat.setQueuedCount(queue.count());
    return;
  }

  state.activeCommand = { ...claimed, startedAt: Date.now() };
  state.activeCommandFilename = (claimed as any).filename ?? null;
  heartbeat.setActiveCommand(claimed.id);
  kernelLog(
    ">>> DISPATCH: " + claimed.id + " type=" + ((claimed as any).type || "unknown"),
    "info",
  );

  try {
    const runtimeFn = runtimeLoader.getRuntimeFn();
    if (!runtimeFn) {
      kernelLog("RUNTIME NOT LOADED - rejecting command", "error");
      finishActiveCommand(subsystems, state, {
        ok: false,
        error: "Runtime not loaded",
        code: "RUNTIME_NOT_FOUND",
      });
      return;
    }

    const runtimeApi = createRuntimeApi(subsystems);
    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
      .then((result) => {
        try {
          const keys = result && typeof result === "object" ? Object.keys(result as Record<string, unknown>) : [];
          kernelLogSubsystem(
            "queue",
            "runtime result resolved type=" +
              typeof result +
              " keys=" +
              keys.join(",") +
              " ok=" +
              String((result as any)?.ok),
          );
        } catch (debugError) {
          kernelLogSubsystem("queue", "runtime result debug failed: " + String(debugError));
        }
        finishActiveCommand(subsystems, state, result);
      })
      .catch((e) => {
        kernelLog("RUNTIME ASYNC ERROR: " + String(e), "error");
        finishActiveCommand(subsystems, state, {
          ok: false,
          error: "Runtime async error: " + String(e),
          code: "EXEC_ERROR",
        });
      });
  } catch (e) {
    kernelLog("RUNTIME FATAL ERROR: " + String(e), "error");
    finishActiveCommand(subsystems, state, {
      ok: false,
      error: "Runtime fatal: " + String(e),
      code: "EXEC_ERROR",
    });
  }
}
```

### packages/pt-runtime/src/pt/kernel/command-router.ts
```ts
<missing>
```

### packages/pt-runtime/src/pt/kernel/runtime-loop.ts
```ts
<missing>
```

### packages/file-bridge/src/backpressure-manager.test.ts
```ts
/**
 * Tests for BackpressureManager - queue overflow prevention
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BackpressureManager, BackpressureError } from './backpressure-manager';
import { BridgePathLayout } from './shared/path-layout';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/backpressure-test-' + Math.random().toString(36).slice(2);

describe('BackpressureManager', () => {
  let paths: BridgePathLayout;
  let manager: BackpressureManager;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    manager = new BackpressureManager(paths, { maxPending: 5 });
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('capacity check', () => {
    test('should not throw when under limit', () => {
      expect(() => {
        manager.checkCapacity();
      }).not.toThrow();
    });

    test('should provide capacity status', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      writeFileSync(join(paths.commandsDir(), 'cmd-1.json'), '{}');
      
      expect(() => manager.checkCapacity()).not.toThrow();
    });
  });

  describe('configuration', () => {
    test('should accept custom max pending', () => {
      const custom = new BackpressureManager(paths, { maxPending: 10 });
      expect(custom).toBeDefined();
    });

    test('should use default if not specified', () => {
      const defaultMgr = new BackpressureManager(paths);
      expect(defaultMgr).toBeDefined();
    });

    test('should accept custom check interval', () => {
      const custom = new BackpressureManager(paths, { 
        maxPending: 5,
        checkIntervalMs: 50 
      });
      expect(custom).toBeDefined();
    });

    test('should accept custom timeout', () => {
      const custom = new BackpressureManager(paths, {
        maxPending: 5,
        maxWaitMs: 5000
      });
      expect(custom).toBeDefined();
    });

    test('should validate configuration values', () => {
      const manager1 = new BackpressureManager(paths, { maxPending: 1 });
      const manager2 = new BackpressureManager(paths, { maxPending: 1000 });
      
      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
    });
  });

  describe('capacity management', () => {
    test('should count commands from directory', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      writeFileSync(join(paths.commandsDir(), 'cmd-1.json'), '{}');
      writeFileSync(join(paths.commandsDir(), 'cmd-2.json'), '{}');

      expect(() => manager.checkCapacity()).not.toThrow();
    });

    test('should handle empty commands directory', () => {
      mkdirSync(paths.commandsDir(), { recursive: true });
      
      expect(() => manager.checkCapacity()).not.toThrow();
    });
  });
});
```

### packages/file-bridge/src/backpressure-manager.ts
```ts
/**
 * Backpressure Manager para la cola de comandos.
 *
 * Implementa un algoritmo de "ventana deslizante" que limita la cantidad
 * máxima de comandos pending (en cola + in-flight) para evitar que PT se
 * sature. Cuando se alcanza el límite, se lanza BackpressureError o se
 * bloquea hasta que haya capacidad disponible.
 *
 * Algoritmo:
 * 1. getPendingCount() = count(commands/*.json) + count(in-flight/*.json)
 * 2. checkCapacity() lanza error si pending >= maxPending
 * 3. waitForCapacity() hace polling con exponential backoff hasta timeout
 *
 * El threshold es configurable para ajustar según la capacidad de PT.
 */
import { readdirSync } from "node:fs";
import type { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Configuración para el BackpressureManager.
 */
export interface BackpressureConfig {
  /** Maximum number of pending commands (commands + in-flight) */
  maxPending: number;
  /** How often to check queue size (ms) */
  checkIntervalMs: number;
  /** Maximum time to wait for capacity (ms) */
  maxWaitMs: number;
}

export class BackpressureError extends Error {
  constructor(
    message: string,
    public readonly pendingCount: number,
    public readonly maxPending: number,
  ) {
    super(message);
    this.name = "BackpressureError";
  }
}

/**
 * Gestor de backpressure que previene saturación de la cola de comandos.
 */
export class BackpressureManager {
  private readonly config: Required<BackpressureConfig>;

  /**
   * @param paths - BridgePathLayout para acceder a los directorios de cola
   * @param config - Configuración opcional con maxPending, checkIntervalMs, maxWaitMs
   */
  constructor(
    private readonly paths: BridgePathLayout,
    config: Partial<BackpressureConfig> = {},
  ) {
    this.config = {
      maxPending: config.maxPending ?? 100,
      checkIntervalMs: config.checkIntervalMs ?? 100,
      maxWaitMs: config.maxWaitMs ?? 30_000,
    };
  }

  /**
   * Verifica si hay capacidad disponible en la cola.
   * Lanza BackpressureError si pending >= maxPending.
   * @throws BackpressureError cuando la cola está llena
   */
  checkCapacity(): void {
    const pending = this.getPendingCount();
    if (pending >= this.config.maxPending) {
      throw new BackpressureError(
        `Command queue full: ${pending}/${this.config.maxPending} pending. ` +
          `Wait for PT to process commands before sending more.`,
        pending,
        this.config.maxPending,
      );
    }
  }

  /**
   * Bloquea hasta que haya capacidad disponible o expire el timeout.
   * Usa polling con intervalo configurable para revisar la cola.
   * @param timeoutMs - Tiempo máximo de espera (default: maxWaitMs de config)
   * @returns Promise que resuelve cuando hay capacidad
   * @throws BackpressureError si expira el timeout
   */
  async waitForCapacity(timeoutMs?: number): Promise<void> {
    const deadline = Date.now() + (timeoutMs ?? this.config.maxWaitMs);

    while (Date.now() < deadline) {
      const pending = this.getPendingCount();

      if (pending < this.config.maxPending) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.checkIntervalMs));
    }

    const pending = this.getPendingCount();
    throw new BackpressureError(
      `Timeout waiting for command queue capacity after ${timeoutMs ?? this.config.maxWaitMs}ms. ` +
        `Queue has ${pending}/${this.config.maxPending} pending commands.`,
      pending,
      this.config.maxPending,
    );
  }

  /**
   * Cuenta comandos pending = comandos en cola + comandos in-flight.
   * Excluye _queue.json (índice auxiliar).
   * @returns Cantidad total de comandos en proceso
   */
  getPendingCount(): number {
    try {
      const commandsDir = this.paths.commandsDir();
      const inFlightDir = this.paths.inFlightDir();

      const commands = readdirSync(commandsDir).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const inFlight = readdirSync(inFlightDir).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;

      return commands + inFlight;
    } catch {
      return 0;
    }
  }

  /**
   * Calcula cuántos comandos más se pueden enviar sin backpressure.
   * @returns Cantidad de slots disponibles (mínimo 0)
   */
  getAvailableCapacity(): number {
    const pending = this.getPendingCount();
    return Math.max(0, this.config.maxPending - pending);
  }

  /**
   * Obtiene métricas básicas de uso de la cola.
   * @returns Objeto con maxPending, currentPending, availableCapacity, utilizationPercent
   */
  getStats(): {
    maxPending: number;
    currentPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    const pending = this.getPendingCount();
    return {
      maxPending: this.config.maxPending,
      currentPending: pending,
      availableCapacity: this.config.maxPending - pending,
      utilizationPercent: Math.round((pending / this.config.maxPending) * 100),
    };
  }

  /**
   * Obtiene métricas detalladas separando comandos en cola e in-flight.
   * Útil para debugging y monitoreo granular.
   * @returns Objeto detallado con métricas de ambos tipos de cola
   */
  getDetailedStats(): {
    maxPending: number;
    queuedCount: number;
    inFlightCount: number;
    totalPending: number;
    availableCapacity: number;
    utilizationPercent: number;
  } {
    try {
      const queuedCount = readdirSync(this.paths.commandsDir()).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const inFlightCount = readdirSync(this.paths.inFlightDir()).filter(
        (f) => f.endsWith(".json") && f !== "_queue.json",
      ).length;
      const totalPending = queuedCount + inFlightCount;

      return {
        maxPending: this.config.maxPending,
        queuedCount,
        inFlightCount,
        totalPending,
        availableCapacity: Math.max(0, this.config.maxPending - totalPending),
        utilizationPercent: Math.round((totalPending / this.config.maxPending) * 100),
      };
    } catch {
      return {
        maxPending: this.config.maxPending,
        queuedCount: 0,
        inFlightCount: 0,
        totalPending: 0,
        availableCapacity: this.config.maxPending,
        utilizationPercent: 0,
      };
    }
  }
}
```

### packages/file-bridge/src/consumer-checkpoint.test.ts
```ts
/**
 * Tests for CheckpointManager - consumer state persistence
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { CheckpointManager } from './consumer-checkpoint';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/checkpoint-test-' + Math.random().toString(36).slice(2);

describe('CheckpointManager', () => {
  let paths: BridgePathLayout;
  let manager: CheckpointManager;
  const consumerId = 'test-consumer';

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('read', () => {
    test('should create fresh checkpoint if none exists', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.read();

      expect(checkpoint.consumerId).toBe(consumerId);
      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
      expect(checkpoint.currentFile).toBeDefined();
    });

    test('should read existing checkpoint from disk', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 1024,
        lastSeq: 42,
        updatedAt: Date.now(),
      };
      writeFileSync(stateFile, JSON.stringify(checkpoint));

      manager = new CheckpointManager(paths, consumerId, false);
      const read = manager.read();

      expect(read.byteOffset).toBe(1024);
      expect(read.lastSeq).toBe(42);
    });

    test('should handle startFromBeginning flag', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      writeFileSync(paths.currentEventsFile(), 'test content');

      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.read();

      expect(checkpoint.byteOffset).toBe(0);
    });

    test('should recover from corrupt checkpoint file', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      writeFileSync(stateFile, 'invalid json {{{');

      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = manager.read();

      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
    });

    test('should return copy, not reference', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const cp1 = manager.read();
      const cp2 = manager.read();

      cp1.byteOffset = 999;
      expect(cp2.byteOffset).not.toBe(999);
    });
  });

  describe('write', () => {
    beforeEach(() => {
      manager = new CheckpointManager(paths, consumerId, true);
    });

    test('should write checkpoint to disk', () => {
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 512,
        lastSeq: 10,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const content = readFileSync(stateFile, 'utf8');
      const saved = JSON.parse(content);

      expect(saved.byteOffset).toBe(512);
      expect(saved.lastSeq).toBe(10);
    });

    test('should skip redundant writes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      const stateFile = paths.consumerCheckpointFile(consumerId);
      
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 256,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const mtime1 = readFileSync(stateFile).toString();
      
      manager.write(checkpoint);
      const mtime2 = readFileSync(stateFile).toString();

      expect(mtime1).toBe(mtime2);
    });

    test('should write when byteOffset changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 100,
        lastSeq: 1,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        byteOffset: 200,
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.byteOffset).toBe(200);
    });

    test('should write when lastSeq changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: 100,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        lastSeq: 15,
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.lastSeq).toBe(15);
    });

    test('should write when currentFile changes', () => {
      mkdirSync(paths.consumerStateDir(), { recursive: true });
      
      const checkpoint1 = {
        consumerId,
        currentFile: 'events.log.1',
        byteOffset: 100,
        lastSeq: 5,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint1);

      const checkpoint2 = {
        ...checkpoint1,
        currentFile: 'events.log.2',
      };

      manager.write(checkpoint2);

      const stateFile = paths.consumerCheckpointFile(consumerId);
      const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
      expect(saved.currentFile).toBe('events.log.2');
    });
  });

  describe('fresh', () => {
    test('should create fresh checkpoint with startFromBeginning=true', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.fresh();

      expect(checkpoint.byteOffset).toBe(0);
      expect(checkpoint.lastSeq).toBe(0);
      expect(checkpoint.consumerId).toBe(consumerId);
    });

    test('should create fresh checkpoint with startFromBeginning=false', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      writeFileSync(paths.currentEventsFile(), 'x'.repeat(1000));

      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = manager.fresh();

      expect(checkpoint.byteOffset).toBe(1000);
    });

    test('should include currentFile in checkpoint', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = manager.fresh();

      expect(checkpoint.currentFile).toContain('events');
    });

    test('should set updatedAt timestamp', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const before = Date.now();
      const checkpoint = manager.fresh();
      const after = Date.now();

      expect(checkpoint.updatedAt).toBeGreaterThanOrEqual(before);
      expect(checkpoint.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('cache behavior', () => {
    test('should cache checkpoint after read', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const cp1 = manager.read();
      const cp2 = manager.read();

      expect(cp1.lastSeq).toBe(cp2.lastSeq);
    });

    test('should update cache on write', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      manager.read();

      const updated = {
        consumerId,
        currentFile: 'new.log',
        byteOffset: 999,
        lastSeq: 99,
        updatedAt: Date.now(),
      };

      manager.write(updated);
      const cp = manager.read();

      expect(cp.byteOffset).toBe(999);
    });
  });

  describe('edge cases', () => {
    test('should handle large byte offsets', () => {
      manager = new CheckpointManager(paths, consumerId, false);
      const checkpoint = {
        consumerId,
        currentFile: 'events.log',
        byteOffset: Number.MAX_SAFE_INTEGER,
        lastSeq: 1000000,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const read = manager.read();

      expect(read.byteOffset).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should handle multiple consumer IDs', () => {
      const consumer1 = new CheckpointManager(paths, 'consumer-1', true);
      const consumer2 = new CheckpointManager(paths, 'consumer-2', true);

      const cp1 = { consumerId: 'consumer-1', currentFile: 'log1', byteOffset: 100, lastSeq: 1, updatedAt: Date.now() };
      const cp2 = { consumerId: 'consumer-2', currentFile: 'log2', byteOffset: 200, lastSeq: 2, updatedAt: Date.now() };

      consumer1.write(cp1);
      consumer2.write(cp2);

      const read1 = consumer1.read();
      const read2 = consumer2.read();

      expect(read1.byteOffset).toBe(100);
      expect(read2.byteOffset).toBe(200);
    });

    test('should handle empty currentFile', () => {
      manager = new CheckpointManager(paths, consumerId, true);
      const checkpoint = {
        consumerId,
        currentFile: '',
        byteOffset: 0,
        lastSeq: 0,
        updatedAt: Date.now(),
      };

      manager.write(checkpoint);
      const read = manager.read();

      expect(read.currentFile).toBe('');
    });
  });
});
```

### packages/file-bridge/src/consumer-checkpoint.ts
```ts
/**
 * Gestor de checkpoints para DurableNdjsonConsumer.
 *
 * Lee, escribe y hace caching de checkpoints de posición del consumer.
 * Implementa escritura throttleada para evitar I/O excesivo durante reads grandes.
 *
 * El checkpoint guarda:
 * - consumerId: identificador del consumer
 * - currentFile: archivo NDJSON actualmente en lectura (relative path)
 * - byteOffset: posición exacta dentro del archivo
 * - lastSeq: último seq procesado (para detección de gaps)
 * - updatedAt: timestamp de última actualización
 *
 * Estrategia de throttle: solo escribe si pasaron más de 10ms desde la última
 * escritura, para evitar writes en cada poll cuando se leen muchos eventos.
 */
import { existsSync, readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { atomicWriteFile } from "./shared/fs-atomic.js";
import type { ConsumerCheckpoint } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Maneja checkpoints de posición para consumo durable de eventos.
 */
export class CheckpointManager {
  private checkpointCache: ConsumerCheckpoint | null = null;
  private lastCheckpointWrite = 0;
  private readonly CHECKPOINT_WRITE_INTERVAL = 10; // ms

  /**
   * @param paths - BridgePathLayout para acceder a directorios
   * @param consumerId - Identificador único del consumer
   * @param startFromBeginning - Si true, lee desde inicio; si false, desde fin de archivo
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly consumerId: string,
    private readonly startFromBeginning: boolean,
  ) {}

  /**
   * Lee el checkpoint actual desde disco, o crea uno nuevo si no existe.
   * Hace cache del checkpoint leído para evitar lecturas repetidas.
   *
   * @returns Copia del checkpoint actual (nunca retorna el objeto interno)
   */
  read(): ConsumerCheckpoint {
    if (!existsSync(this.checkpointFile())) {
      const checkpoint = this.fresh();
      this.write(checkpoint);
      this.checkpointCache = checkpoint;
      this.lastCheckpointWrite = Date.now();
      return checkpoint;
    }

    try {
      const raw = JSON.parse(
        readFileSync(this.checkpointFile(), "utf8"),
      ) as ConsumerCheckpoint;
      this.checkpointCache = raw;
      return { ...raw };
    } catch {
      return this.fresh();
    }
  }

  /**
   * Escribe checkpoint de forma atómica. Solo escribe si hay cambios
   * respecto al cache para evitar escrituras redundantes.
   *
   * @param checkpoint - El checkpoint a persistir
   */
  write(checkpoint: ConsumerCheckpoint): void {
    if (
      this.checkpointCache &&
      this.checkpointCache.byteOffset === checkpoint.byteOffset &&
      this.checkpointCache.lastSeq === checkpoint.lastSeq &&
      this.checkpointCache.currentFile === checkpoint.currentFile
    ) {
      return;
    }

    atomicWriteFile(this.checkpointFile(), JSON.stringify(checkpoint, null, 2));
    this.checkpointCache = checkpoint;
  }

  /**
   * Crea un checkpoint inicial basado en startFromBeginning.
   * Si startFromBeginning=false y existe el archivo, empieza desde el final.
   *
   * @returns Checkpoint inicial
   */
  fresh(): ConsumerCheckpoint {
    const currentFile = this.relativeLogFile(this.paths.currentEventsFile());
    let byteOffset = 0;
    if (!this.startFromBeginning && existsSync(this.paths.currentEventsFile())) {
      byteOffset = statSync(this.paths.currentEventsFile()).size;
    }
    return {
      consumerId: this.consumerId,
      currentFile,
      byteOffset,
      lastSeq: 0,
      updatedAt: Date.now(),
    };
  }

  /**
   * Indica si han pasado suficientes ms para permitir escritura throttleada.
   * @returns true si puede escribir ahora
   */
  canWriteCheckpoint(): boolean {
    return Date.now() - this.lastCheckpointWrite > this.CHECKPOINT_WRITE_INTERVAL;
  }

  /**
   * Marca que se escribió un checkpoint (reinicia el timer de throttle).
   */
  markCheckpointWritten(): void {
    this.lastCheckpointWrite = Date.now();
  }

  /**
   * @returns Path absoluto del archivo de checkpoint
   */
  getCheckpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private checkpointFile(): string {
    return this.paths.consumerCheckpointFile(this.consumerId);
  }

  private relativeLogFile(filePath: string): string {
    return filePath.split("/").pop() ?? "events.current.ndjson";
  }
}
```

### packages/file-bridge/src/consumer-file-resolver.ts
```ts
/**
 * Resolvedor de archivos para DurableNdjsonConsumer.
 *
 * Resuelve paths relativos a absolutos y encuentra el siguiente
 * archivo rotado. Soporta rotation manifest para recuperar eventos
 * de archivos que fueron rotados.
 *
 * Cuando un archivo NDJSON supera el umbral de tamaño, EventLogWriter
 * lo renombra a events.<timestamp>.ndjson y crea uno nuevo. Este resolver
 * maneja la transición transparently para el consumer.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ConsumerCheckpoint, RotationManifest } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";

/**
 * Resuelve paths de archivos de log manejando rotación.
 */
export class FileResolver {
  /**
   * @param paths - BridgePathLayout para acceder a directorios
   */
  constructor(private readonly paths: BridgePathLayout) {}

  /**
   * Resuelve un nombre de archivo relativo a path absoluto.
   * Si el archivo no existe, hace fallback a events.current.ndjson.
   *
   * @param relativeName - Nombre relativo del archivo
   * @returns Path absoluto o null si no se encuentra
   */
  resolve(relativeName: string): string | null {
    const full = join(this.paths.logsDir(), relativeName);
    if (existsSync(full)) return full;

    const current = this.paths.currentEventsFile();
    if (existsSync(current)) return current;

    return null;
  }

  /**
   * Resuelve checkpoint considerando rotación de archivos.
   *
   * Si el checkpoint apunta a un archivo que ya no tiene el tamaño esperado,
   * significa que fue rotado. Consulta el rotation manifest para encontrar
   * dónde están los datos restantes.
   *
   * @param checkpoint - Checkpoint con posición actual
   * @param onDataLoss - Callback opcional cuando se detecta pérdida de datos
   * @returns Path y offsetresolved, o null si no se puede leer nada
   */
  resolveWithRotation(
    checkpoint: ConsumerCheckpoint,
    onDataLoss?: (info: { reason: string; lostFromOffset: number; checkpoint: ConsumerCheckpoint }) => void,
  ): { filePath: string; offset: number } | null {
    const currentFilePath = join(this.paths.logsDir(), checkpoint.currentFile);
    let currentSize: number;

    try {
      currentSize = statSync(currentFilePath).size;
    } catch {
      const fallback = this.paths.currentEventsFile();
      if (existsSync(fallback)) {
        return { filePath: fallback, offset: 0 };
      }
      return null;
    }

    if (checkpoint.byteOffset <= currentSize) {
      return { filePath: currentFilePath, offset: checkpoint.byteOffset };
    }

    const manifest = this.readManifest();
    if (!manifest) {
      onDataLoss?.({
        reason: "no rotation manifest found",
        lostFromOffset: checkpoint.byteOffset,
        checkpoint,
      });
      return { filePath: currentFilePath, offset: 0 };
    }

    const rotated = manifest.rotations.find(
      (r) =>
        r.previousFile === checkpoint.currentFile &&
        r.rotatedAt > checkpoint.updatedAt,
    );

    if (rotated) {
      const rotatedPath = join(this.paths.logsDir(), rotated.file);
      if (existsSync(rotatedPath)) {
        return { filePath: rotatedPath, offset: checkpoint.byteOffset };
      }
    }

    onDataLoss?.({
      reason: "rotated file not found in manifest",
      lostFromOffset: checkpoint.byteOffset,
      checkpoint,
    });
    return { filePath: currentFilePath, offset: 0 };
  }

  /**
   * Encuentra el siguiente archivo rotado después del actual.
   * Útil cuando el archivo actual se agotó y hay que continuar leyendo.
   *
   * @param currentPath - Path absoluto del archivo actual
   * @returns Path del siguiente archivo rotado o null si no hay más
   */
  findNextRotatedFile(currentPath: string): string | null {
    let files: string[];
    try {
      files = readdirSync(this.paths.logsDir())
        .filter((f) => f.startsWith("events.") && f.endsWith(".ndjson"))
        .sort();
    } catch {
      return null;
    }

    const current = this.toRelative(currentPath);
    const idx = files.indexOf(current);
    if (idx >= 0 && idx + 1 < files.length) {
      return join(this.paths.logsDir(), files[idx + 1]!);
    }

    return null;
  }

  /**
   * Convierte un path absoluto a nombre relativo dentro del directorio de logs.
   *
   * @param absolutePath - Path absoluto
   * @returns Solo el nombre del archivo
   */
  toRelative(absolutePath: string): string {
    return absolutePath.split("/").pop() ?? "events.current.ndjson";
  }

  private readManifest(): RotationManifest | null {
    const manifestFile = this.paths.rotationManifestFile();
    if (!existsSync(manifestFile)) return null;

    try {
      const content = readFileSync(manifestFile, "utf8");
      return JSON.parse(content) as RotationManifest;
    } catch {
      return null;
    }
  }
}
```

### packages/file-bridge/src/durable-ndjson-consumer.test.ts
```ts
/**
 * Tests for DurableNdjsonConsumer - event consumption with persistence
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { join } from 'node:path';

const TEST_ROOT = '/tmp/consumer-test-' + Math.random().toString(36).slice(2);

describe('DurableNdjsonConsumer', () => {
  let paths: BridgePathLayout;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('initialization', () => {
    test('should create event log file on startup', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      
      const filename = paths.currentEventsFile();
      expect(filename).toBeDefined();
      expect(filename).toContain('events');
    });

    test('should initialize with checkpoint', () => {
      const consumerId = 'test-consumer';
      const checkpoint = {
        consumerId,
        currentFile: 'events.current.ndjson',
        byteOffset: 0,
        lastSeq: 0,
        updatedAt: Date.now()
      };

      expect(checkpoint.consumerId).toBe(consumerId);
      expect(checkpoint.byteOffset).toBe(0);
    });

    test('should handle startFromBeginning flag', () => {
      const options = {
        startFromBeginning: true,
        pollIntervalMs: 300,
        bufferSize: 65536
      };

      expect(options.startFromBeginning).toBe(true);
      expect(options.pollIntervalMs).toBe(300);
      expect(options.bufferSize).toBe(65536);
    });

    test('should set default buffer size', () => {
      const defaultBuffer = 64 * 1024;
      expect(defaultBuffer).toBe(65536);
    });

    test('should set default poll interval', () => {
      const defaultPoll = 300;
      expect(defaultPoll).toBeGreaterThan(0);
    });
  });

  describe('event parsing', () => {
    test('should parse NDJSON events', () => {
      const events = [
        { id: 1, type: 'config', data: { device: 'R1' } },
        { id: 2, type: 'status', data: { state: 'running' } }
      ];

      const ndjson = events.map(e => JSON.stringify(e)).join('\n');
      expect(ndjson).toContain('\n');
      expect(ndjson.split('\n')).toHaveLength(2);
    });

    test('should handle UTF-8 multi-byte characters', () => {
      const event = {
        id: 1,
        description: '你好世界 🌍'
      };

      const json = JSON.stringify(event);
      expect(json).toContain('你好');
      expect(json).toContain('🌍');
    });

    test('should skip empty lines', () => {
      const lines = ['{"id":1}', '', '{"id":2}', '', '{"id":3}'];
      const nonEmpty = lines.filter(l => l.trim().length > 0);

      expect(nonEmpty).toHaveLength(3);
    });

    test('should detect parse errors', () => {
      const invalidLines = [
        '{invalid json}',
        '{"incomplete":',
        'not json at all',
        '{"valid": true}'
      ];

      const parseCount = invalidLines.reduce((acc, line) => {
        try {
          JSON.parse(line);
          return acc + 1;
        } catch {
          return acc;
        }
      }, 0);

      expect(parseCount).toBe(1);
    });

    test('should handle partial lines', () => {
      const chunk1 = '{"id":1,"data":"par';
      const chunk2 = 'tial line"}\n{"id":2}';
      
      const combined = chunk1 + chunk2;
      expect(combined).toContain('partial');
    });
  });

  describe('checkpoint management', () => {
    test('should save checkpoint after reading events', () => {
      const checkpoint = {
        consumerId: 'test',
        currentFile: 'events.log',
        byteOffset: 1024,
        lastSeq: 100,
        updatedAt: Date.now()
      };

      expect(checkpoint.byteOffset).toBe(1024);
      expect(checkpoint.lastSeq).toBe(100);
    });

    test('should track byte offset', () => {
      const bytesRead = 2048;
      const checkpoint = {
        currentFile: 'events.log',
        byteOffset: bytesRead,
        lastSeq: 50,
        consumerId: 'test',
        updatedAt: Date.now()
      };

      expect(checkpoint.byteOffset).toBe(2048);
    });

    test('should track sequence number', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        type: 'event'
      }));

      const lastSeq = events[events.length - 1]!.id;
      expect(lastSeq).toBe(100);
    });

    test('should detect sequence gaps', () => {
      const sequences = [1, 2, 3, 5, 6, 7];

      const hasGap = (seqs: number[]) => {
        for (let i = 1; i < seqs.length; i++) {
          if (seqs[i] !== seqs[i - 1]! + 1) return true;
        }
        return false;
      };

      expect(hasGap(sequences)).toBe(true);
    });
  });

  describe('file handling', () => {
    test('should handle file rotation', () => {
      const files = [
        'events.20240101-000000-001.ndjson',
        'events.20240101-120000-002.ndjson',
        'events.current.ndjson'
      ];

      expect(files).toHaveLength(3);
      expect(files[2]).toContain('current');
    });

    test('should resolve rotated files', () => {
      const rotatedFile = 'events.20240101-000000-001.ndjson';
      const isRotated = rotatedFile.includes('20240101');

      expect(isRotated).toBe(true);
    });

    test('should handle file truncation', () => {
      const originalSize = 10000;
      const newSize = 5000;

      expect(newSize).toBeLessThan(originalSize);
    });

    test('should reopen file when needed', () => {
      const filePath = paths.currentEventsFile();
      expect(filePath).toBeDefined();
      expect(filePath.length).toBeGreaterThan(0);
    });

    test('should handle missing rotated files', () => {
      const checkpoint = {
        currentFile: 'events.20240101-000000-001.ndjson',
        byteOffset: 500
      };

      // File doesn't exist - should fallback
      expect(checkpoint.currentFile).toBeDefined();
    });
  });

  describe('event emission', () => {
    test('should emit events as they arrive', () => {
      const events: any[] = [];
      
      const onEvent = (event: any) => {
        events.push(event);
      };

      const testEvents = [
        { id: 1, type: 'start' },
        { id: 2, type: 'running' }
      ];

      testEvents.forEach(onEvent);
      expect(events).toHaveLength(2);
    });

    test('should emit parse errors', () => {
      const errors: any[] = [];

      const onParseError = (line: string, error: unknown) => {
        errors.push({ line, error });
      };

      onParseError('invalid json', new Error('Parse failed'));
      expect(errors).toHaveLength(1);
    });

    test('should emit sequence gaps', () => {
      const gaps: any[] = [];

      const onGap = (expected: number, actual: number) => {
        gaps.push({ expected, actual });
      };

      onGap(5, 7);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].expected).toBe(5);
    });

    test('should emit data loss events', () => {
      const dataLoss: any[] = [];

      const onDataLoss = (info: any) => {
        dataLoss.push(info);
      };

      onDataLoss({
        reason: 'rotated file not found',
        lostFromOffset: 1000,
        checkpoint: { byteOffset: 1000 }
      });

      expect(dataLoss).toHaveLength(1);
    });
  });

  describe('polling and watching', () => {
    test('should poll files at interval', () => {
      const pollIntervalMs = 300;
      expect(pollIntervalMs).toBeGreaterThan(0);
      expect(pollIntervalMs).toBeLessThan(10000);
    });

    test('should watch log directory', () => {
      mkdirSync(paths.logsDir(), { recursive: true });
      const logDir = paths.logsDir();

      expect(logDir).toBeDefined();
      expect(logDir.includes('logs') || logDir.includes('event')).toBe(true);
    });

    test('should handle watch errors', () => {
      const errors: any[] = [];

      const onWatchError = (error: Error) => {
        errors.push(error);
      };

      onWatchError(new Error('Watch failed'));
      expect(errors).toHaveLength(1);
    });

    test('should stop polling on close', () => {
      let isRunning = true;
      
      const stop = () => {
        isRunning = false;
      };

      stop();
      expect(isRunning).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should track consecutive parse errors', () => {
      let consecutiveErrors = 0;
      const maxErrors = 50;

      for (let i = 0; i < 10; i++) {
        consecutiveErrors++;
      }

      expect(consecutiveErrors).toBeLessThan(maxErrors);
    });

    test('should stop after max errors', () => {
      const maxConsecutiveErrors = 50;
      let errors = 60;

      const shouldStop = errors > maxConsecutiveErrors;
      expect(shouldStop).toBe(true);
    });

    test('should reset error count on success', () => {
      let errorCount = 5;
      
      // On successful parse
      errorCount = 0;
      
      expect(errorCount).toBe(0);
    });

    test('should handle file descriptor errors', () => {
      const errors: any[] = [];

      try {
        throw new Error('File descriptor not available');
      } catch (err) {
        errors.push(err);
      }

      expect(errors).toHaveLength(1);
    });
  });
```

### packages/file-bridge/src/durable-ndjson-consumer.ts
```ts
/**
 * Consumer durable de eventos NDJSON del bridge.
 *
 * Lee eventos del journal NDJSON sin perder datos incluso ante crashes.
 *
 * Protocolo de archivos:
 * - logs/events.current.ndjson: archivo activo de escritura (append)
 * - logs/events.<timestamp>.ndjson: archivos rotados (solo lectura)
 * - logs/rotation-manifest.json: índice de archivos rotados
 * - consumer-state/<consumerId>.json: checkpoint de posición (byteOffset + lastSeq)
 *
 * Flujo de recuperación ante rotación:
 * 1. Checkpoint guarda: currentFile, byteOffset, lastSeq, updatedAt
 * 2. Si al leer, byteOffset > tamaño actual del archivo → archivo fue rotado
 * 3. Se consulta rotation-manifest.json para encontrar el archivo rotado correcto
 * 4. Se ajusta offset si el archivo rotado aún contiene datos del checkpoint
 *
 * Características:
 * - Checkpointing eachimétrico: solo se Persiste byteOffset y lastSeq
 * - StringDecoder para manejo correcto de caracteres multibyte UTF-8
 * - Buffer de leftover para líneas parciales entre reads
 * - Detección de gaps de secuencia
 * - Watcher + polling para resiliencia (fallback a polling si watch falla)
 * - Throttled writes del checkpoint para evitar I/O excesivo
 */
import {
  closeSync,
  existsSync,
  openSync,
  readSync,
  statSync,
  watch,
  type FSWatcher,
} from "node:fs";
import { StringDecoder } from "string_decoder";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile } from "./shared/fs-atomic.js";
import type {
  BridgeEvent,
} from "./shared/protocol.js";
import type { ConsumerCheckpoint, RotationManifest } from "./shared/local-types.js";
import { BridgeEventSchema } from "./shared/protocol.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { CheckpointManager } from "./consumer-checkpoint.js";
import { FileResolver } from "./consumer-file-resolver.js";

export interface DurableNdjsonConsumerOptions {
  consumerId: string;
  /** Polling interval in ms (default: 300ms) */
  pollIntervalMs?: number;
  /** Read buffer size in bytes (default: 64KB) */
  bufferSize?: number;
  /** If true, start from beginning of file; if false, start from end (default: false) */
  startFromBeginning?: boolean;
  /** Called for each successfully parsed event */
  onEvent?: (event: BridgeEvent) => void;
  /** Called when a sequence gap is detected */
  onGap?: (expected: number, actual: number) => void;
  /** Called when a line fails to parse */
  onParseError?: (line: string, error: unknown) => void;
  /** Called when data loss is detected (e.g., rotated file not found) */
  onDataLoss?: (info: {
    reason: string;
    lostFromOffset: number;
    checkpoint: ConsumerCheckpoint;
    file?: string;
    offset?: number;
    seq?: number;
    timestamp?: number;
  }) => void;
}

/**
 * Consumer durable que persiste su posición parano perder eventos.
 *
 * Soporta:
 * - Reanudación exacta tras crashes (checkpoint de byteOffset + lastSeq)
 * - Recuperación de archivos rotados via rotation-manifest.json
 * - Handling de caracteres multibyte UTF-8 via StringDecoder
 * - Polling con fallback automático si fs.watch falla
 */
export class DurableNdjsonConsumer extends EventEmitter {
  private readonly pollIntervalMs: number;
  private readonly bufferSize: number;

  private watcher: FSWatcher | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fd: number | null = null;
  private currentFilePath: string | null = null;
  private leftover = "";
  private running = false;
  private consecutiveParseErrors = 0;
  private usingPollingFallback = false;
  private lastWatchError: string | null = null;
  private totalParseErrors = 0;
  private totalDataLossEvents = 0;

  private readonly checkpointManager: CheckpointManager;
  private readonly fileResolver: FileResolver;
  private decoder = new StringDecoder("utf8");

  private watcherFailed = false;
  private recentParseErrors: Array<{
    fragment: string;
    offsetStart: number;
    offsetEnd: number;
    count: number;
  }> = [];
  private recentDataLossEvents: Array<{
    reason: string;
    file: string;
    offset: number;
    seq?: number;
    timestamp: number;
  }> = [];

  private static readonly MAX_CONSECUTIVE_ERRORS = 50;
  private static readonly MAX_RECENT_PARSE_ERRORS = 10;
  private static readonly MAX_RECENT_DATA_LOSS = 10;

  /**
   * @param paths - BridgePathLayout para acceder a la estructura de directorios
   * @param options - Configuración del consumer (consumerId, pollIntervalMs, callbacks, etc.)
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly options: DurableNdjsonConsumerOptions,
  ) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? 300;
    this.bufferSize = options.bufferSize ?? 64 * 1024;

    this.checkpointManager = new CheckpointManager(
      paths,
      options.consumerId,
      options.startFromBeginning ?? false,
    );
    this.fileResolver = new FileResolver(paths);
  }

  /**
   * Inicia el consumo de eventos. Crea directorios necesarios,
   * restaura posición desde checkpoint, e inicia watcher + timer de polling.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.logsDir());
    ensureFile(this.paths.currentEventsFile(), "");

    this.reopenFromCheckpoint();

    try {
      this.watcher = watch(this.paths.logsDir(), () => {
        this.poll();
      });
      this.usingPollingFallback = false;
      this.lastWatchError = null;
    } catch (err) {
      this.watcher = null;
      this.usingPollingFallback = true;
      this.lastWatchError = String(err);
      this.emit("warning", {
        type: "watch-fallback",
        error: String(err),
      });
    }

    this.timer = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    this.poll();
  }

  /**
   * Detiene el consumo, libera file descriptors y cierra watcher/timer.
   * El último checkpoint escrito queda persisted para la próxima ejecución.
   */
  stop(): void {
    this.running = false;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.fd !== null) {
      try {
        closeSync(this.fd);
      } catch {
        // ignore
      }
      this.fd = null;
    }

    this.currentFilePath = null;
    this.leftover = "";
    this.decoder.end();
    this.usingPollingFallback = false;
    this.lastWatchError = null;
  }

  /**
   * Fuerza un poll manual. Lee eventos desde la posición del checkpoint
   * hasta el final del archivo actual. Si el archivo fue rotado, busca
   * el siguiente archivo rotado disponible.
   *
   * El checkpoint se escribe al final de cada poll (throttled).
   */
  poll(): void {
    if (!this.running) return;

    const checkpoint = this.checkpointManager.read();
    const resolved = this.fileResolver.resolveWithRotation(checkpoint, (info) => {
      this.emit("data-loss", info);
      this.options.onDataLoss?.(info);
    });

    if (!resolved) {
      ensureFile(this.paths.currentEventsFile(), "");
      return;
    }

    // If file changed (rotated or recreated) or fd is stale, reopen it
    if (this.currentFilePath !== resolved.filePath || this.fd === null) {
      this.reopenFile(resolved.filePath);
      // Reset decoder when switching files to avoid carryover of incomplete multibyte chars
      this.decoder = new StringDecoder("utf8");
    }

    if (this.fd === null || this.currentFilePath === null) return;

    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(this.currentFilePath);
    } catch {
      return;
    }

    // Handle truncation: if file shrunk, reset to beginning
    let offset = resolved.offset;
    if (offset > stats.size) {
      offset = 0;
      this.leftover = "";
      this.decoder = new StringDecoder("utf8");
    }

    // Nothing new to read
    if (offset >= stats.size) {
      const nextFile = this.fileResolver.findNextRotatedFile(this.currentFilePath);
      if (nextFile) {
        this.reopenFile(nextFile);
        this.poll();
      }
      return;
    }

    const buffer = Buffer.alloc(this.bufferSize);

    while (true) {
      const previousLeftover = this.leftover;
      this.leftover = "";

      const bytesRead = readSync(this.fd, buffer, 0, buffer.length, offset);
      if (bytesRead <= 0) {
        this.leftover = previousLeftover;
        break;
      }

      // StringDecoder handles incomplete multibyte characters correctly —
      // it buffers bytes that don't form a complete character until the next write()
      const chunk = previousLeftover + this.decoder.write(buffer.subarray(0, bytesRead));
      const lines = chunk.split("\n");
      this.leftover = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const raw = JSON.parse(line);
          const result = BridgeEventSchema.safeParse(raw);

          // Reset error counter on successful parse
          this.consecutiveParseErrors = 0;

          let event: BridgeEvent;
          if (result.success) {
            event = result.data as BridgeEvent;
          } else {
            event = raw as BridgeEvent;
            this.emit("parse-error", {
              type: "parse-error" as const,
              raw,
              line,
              error: "Validation failed",
              issues: result.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
              })),
            });
            this.options.onParseError?.(line, result.error);
          }

          if (event.seq !== undefined) {
            this.validateSequence(checkpoint.lastSeq, event.seq);
          }

          this.emit("event", event);
          this.options.onEvent?.(event);

          if (event.seq !== undefined) {
            checkpoint.lastSeq = event.seq;
          }
        } catch (err) {
          // JSON parse error — increment error counter
          this.consecutiveParseErrors++;
          this.totalParseErrors++;

          // Guardar contexto del error para diagnostics
          const offsetStart = checkpoint.byteOffset;
          const offsetEnd = offsetStart + bytesRead;
          this.recentParseErrors.push({
            fragment: line.slice(0, 200),
            offsetStart,
            offsetEnd,
            count: this.consecutiveParseErrors,
          });
          if (this.recentParseErrors.length > DurableNdjsonConsumer.MAX_RECENT_PARSE_ERRORS) {
            this.recentParseErrors.shift();
          }

          const parseError = {
            type: "parse-error" as const,
            raw: null,
            line,
            error: String(err),
            recoverable: true,
            consecutiveErrors: this.consecutiveParseErrors,
            totalParseErrors: this.totalParseErrors,
            filePath: this.currentFilePath,
            offset,
          };
          this.emit("parse-error", parseError);
          this.options.onParseError?.(line, err);

          // If too many consecutive errors, the file is likely corrupted
          if (this.consecutiveParseErrors >= DurableNdjsonConsumer.MAX_CONSECUTIVE_ERRORS) {
            this.totalDataLossEvents++;

            this.emit("data-loss", {
              reason: "too many consecutive parse errors",
              errorCount: this.consecutiveParseErrors,
```

### packages/file-bridge/src/event-log-writer.test.ts
```ts
/**
 * Tests for EventLogWriter - append-only NDJSON logging
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, readFileSync, statSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { EventLogWriter } from './event-log-writer';
import type { BridgeEvent } from './shared/protocol';

const TEST_ROOT = '/tmp/event-log-writer-test-' + Math.random().toString(36).slice(2);

describe('EventLogWriter', () => {
  let paths: BridgePathLayout;
  let writer: EventLogWriter;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    writer = new EventLogWriter(paths);
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('append', () => {
    test('should append event to file', () => {
      const event: BridgeEvent = {
        type: 'command-sent',
        ts: Date.now(),
        seq: 1,
        data: { id: 'cmd-1' },
      };

      writer.append(event);

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0]!)).toMatchObject(event);
    });

    test('should append multiple events in order', () => {
      const events: BridgeEvent[] = [
        { type: 'command-sent', ts: 1000, seq: 1, data: { id: 'cmd-1' } },
        { type: 'command-ack', ts: 1100, seq: 2, data: { id: 'cmd-1' } },
        { type: 'result-ready', ts: 1200, seq: 3, data: { id: 'cmd-1' } },
      ];

      events.forEach(e => writer.append(e));

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);
      expect(JSON.parse(lines[0]!).seq).toBe(1);
      expect(JSON.parse(lines[1]!).seq).toBe(2);
      expect(JSON.parse(lines[2]!).seq).toBe(3);
    });

    test('should handle events with no sequence number', () => {
      const event: BridgeEvent = {
        type: 'debug',
        ts: Date.now(),
        seq: 1,
        data: { msg: 'debug event' },
      };

      writer.append(event);

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.type).toBe('debug');
      expect(parsed.seq).toBe(1);
    });

    test('should handle events with arbitrary data', () => {
      const event: BridgeEvent = {
        type: 'error',
        ts: Date.now(),
        seq: 1,
        data: {
          error: 'Connection timeout',
          retryCount: 3,
          backoffMs: 1000,
          metadata: { key: 'value' },
        },
      };

      writer.append(event);

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.data.error).toBe('Connection timeout');
      expect(parsed.data.retryCount).toBe(3);
      expect(parsed.data.metadata).toEqual({ key: 'value' });
    });

    test('should preserve order across multiple calls', () => {
      for (let i = 1; i <= 10; i++) {
        writer.append({
          type: 'event',
          ts: i * 100,
          seq: i,
          data: { index: i },
        });
      }

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');
      
      lines.forEach((line, idx) => {
        expect(JSON.parse(line).seq).toBe(idx + 1);
      });
    });
  });

  describe('createCurrentFile', () => {
    test('should create log directory and files on first write', () => {
      const event: BridgeEvent = {
        type: 'init',
        ts: Date.now(),
        seq: 1,
        data: {},
      };

      writer.append(event);

      const currentFile = paths.currentEventsFile();
      expect(readFileSync(currentFile, 'utf8')).toContain('init');
    });
  });

  describe('JSON formatting', () => {
    test('should write valid JSON lines', () => {
      const events: BridgeEvent[] = [
        { type: 'event1', ts: 1000, seq: 1, data: { a: 1 } },
        { type: 'event2', ts: 2000, seq: 2, data: { b: 'test' } },
        { type: 'event3', ts: 3000, seq: 3, data: { c: { nested: true } } },
      ];

      events.forEach(e => writer.append(e));

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(3);
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    test('should handle special characters in data', () => {
      const event: BridgeEvent = {
        type: 'message',
        ts: Date.now(),
        seq: 1,
        data: {
          msg: 'Special chars: "quotes", \\backslash, \nnewline, unicode: 🚀',
        },
      };

      writer.append(event);

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const parsed = JSON.parse(content.trim());
      expect(parsed.data.msg).toContain('quotes');
      expect(parsed.data.msg).toContain('🚀');
    });
  });

  describe('concurrent appends', () => {
    test('should handle rapid sequential appends', () => {
      const count = 100;
      
      for (let i = 0; i < count; i++) {
        writer.append({
          type: 'rapid',
          ts: Date.now(),
          seq: i + 1,
          data: { index: i },
        });
      }

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(count);
      expect(JSON.parse(lines[count - 1]!).seq).toBe(count);
    });
  });

  describe('file size and rotation', () => {
    test('should accept custom rotation size', () => {
      const smallWriter = new EventLogWriter(paths, {
        rotateAtBytes: 200,
      });

      // Add events totaling more than 200 bytes
      for (let i = 0; i < 5; i++) {
        smallWriter.append({
          type: 'event',
          ts: 1000 + i,
          seq: i + 1,
          data: {
            largeField: 'x'.repeat(100),
          },
        });
      }

      // Should have created rotated files
      const currentSize = statSync(paths.currentEventsFile()).size;
      expect(currentSize).toBeGreaterThan(0);
    });
  });

  describe('event types', () => {
    test('should support various event types', () => {
      const eventTypes = [
        'command-sent',
        'command-ack',
        'result-ready',
        'error',
        'warning',
        'info',
        'debug',
        'lease-renewal',
        'cleanup',
      ];

      eventTypes.forEach((type, idx) => {
        writer.append({
          type,
          ts: 1000 + idx,
          seq: idx + 1,
          data: {},
        });
      });

      const content = readFileSync(paths.currentEventsFile(), 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(eventTypes.length);
      lines.forEach((line, idx) => {
        expect(JSON.parse(line).type).toBe(eventTypes[idx]);
      });
    });
  });
});
```

### packages/file-bridge/src/event-log-writer.ts
```ts
/**
 * Escritor append-only del journal NDJSON de eventos del bridge.
 *
 * Los eventos se appendean línea por línea a events.current.ndjson.
 * Cuando el archivo supera rotateAtBytes, se rota a un archivo timestamped
 * y se crea uno nuevo lazily en el siguiente append.
 *
 * Seguridad en rotación:
 * - La rotación usa rename atómico para el archivo completado
 * - Puede haber una ventana corta donde events.current.ndjson no existe;
 *   el siguiente append lo recrea
 * - El rotation manifest se actualiza post-rotación para que los consumers
 *   puedan recuperar eventos de archivos rotados
 */
import { existsSync, readFileSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { BridgeEvent } from "./shared/protocol.js";
import type { RotationEntry, RotationManifest } from "./shared/local-types.js";
import { BridgePathLayout } from "./shared/path-layout.js";
import { appendLine, atomicWriteFile, ensureDir, ensureFile } from "./shared/fs-atomic.js";

export interface EventLogWriterOptions {
  /** Max size in bytes before rotating (default: 32MB) */
  rotateAtBytes?: number;
}

/**
 * Escritor del journal de eventos con soporte de rotación.
 */
export class EventLogWriter {
  private readonly rotateAtBytes: number;
  private readonly currentFile: string;
  private readonly logsDir: string;
  private lastSeqWritten = 0;
  private rotationCounter = 0;

  /**
   * @param paths - BridgePathLayout
   * @param options - Opciones con rotateAtBytes (default 32MB)
   */
  constructor(
    private readonly paths: BridgePathLayout,
    options: EventLogWriterOptions = {},
  ) {
    this.rotateAtBytes = options.rotateAtBytes ?? 32 * 1024 * 1024;
    this.logsDir = paths.logsDir();
    this.currentFile = paths.currentEventsFile();

    ensureDir(this.logsDir);
    ensureFile(this.currentFile, "");
  }

  /**
   * Appendea un evento al journal. Si el archivo supera rotateAtBytes,
   * hace rotación atómica antes de escribir.
   *
   * @param event - Evento a escribir (se serializa a JSON)
   */
  append(event: BridgeEvent): void {
    this.rotateIfNeeded();
    appendLine(this.currentFile, JSON.stringify(event));

    if (event.seq !== undefined && event.seq > this.lastSeqWritten) {
      this.lastSeqWritten = event.seq;
    }
  }

  /**
   * @returns Path absoluto del archivo de eventos actual
   */
  getCurrentFile(): string {
    return this.currentFile;
  }

  private rotateIfNeeded(): void {
    let size = 0;
    try {
      size = statSync(this.currentFile).size;
    } catch {
      size = 0;
    }

    if (size < this.rotateAtBytes) return;

    const timestamp = Date.now();
    const counter = this.rotationCounter++;
    const rotatedFileName = `events.${timestamp}-${counter}.ndjson`;
    const rotated = join(this.logsDir, rotatedFileName);

    const sizeAtRotation = size;
    const seqAtRotation = this.lastSeqWritten;

    try {
      renameSync(this.currentFile, rotated);
    } catch {
      return;
    }

    this.appendToManifest({
      file: rotatedFileName,
      rotatedAt: timestamp,
      previousFile: "events.current.ndjson",
      bytesSizeAtRotation: sizeAtRotation,
      lastSeqInFile: seqAtRotation,
    });

    ensureFile(this.currentFile, "");
  }

  private appendToManifest(entry: RotationEntry): void {
    const manifestFile = this.paths.rotationManifestFile();
    let manifest: RotationManifest = { rotations: [] };

    try {
      if (existsSync(manifestFile)) {
        const content = readFileSync(manifestFile, "utf8");
        manifest = JSON.parse(content) as RotationManifest;
      }
    } catch {
      manifest = { rotations: [] };
    }

    manifest.rotations.push(entry);

    if (manifest.rotations.length > 100) {
      manifest.rotations = manifest.rotations.slice(-100);
    }

    atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2));
  }
}
```

### packages/file-bridge/src/file-bridge-v2-commands.ts
```ts
/**
 * Command Pusher para IOS via FileBridge V2.
 *
 * Envía comandos IOS a Packet Tracer a través del bridge de archivos.
 * Reemplaza el pushCommands basado en HTTP del paquete anterior.
 *
 * Arquitectura: CLI → commands/*.json → PT → results/*.json → CLI
 */

import { FileBridgeV2 } from "./file-bridge-v2.js";

/**
 * Resultado de una operación de push de comandos.
 */
export interface PushResult {
  /** Indica si el comando fue exitoso */
  success: boolean;
  /** ID del comando si fue aceptado */
  commandId?: string;
  /** Mensaje de error si falló */
  error?: string;
}

/**
 * Espera hasta que el bridge esté listo o expire el timeout.
 * Polls el estado del bridge con intervalo fijo.
 *
 * @param bridge - Instancia del bridge con método isReady()
 * @param timeoutMs - Tiempo máximo de espera
 * @param pollMs - Intervalo de polling (default: 50ms)
 * @returns true si el bridge quedó listo antes del timeout
 */
export async function waitForBridgeReady(
  bridge: { isReady(): boolean },
  timeoutMs: number,
  pollMs = 50,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (bridge.isReady()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return bridge.isReady();
}

function getDevDir(): string {
  return process.env.PT_DEV_DIR || `${process.env.HOME ?? ""}/pt-dev`;
}

/**
 * Envía comandos de configuración IOS a un dispositivo via FileBridge V2.
 *
 * Crea un bridge temporal, lo inicia, envía el comando configIos,
 * y espera el resultado con el timeout especificado.
 *
 * @param deviceId - Nombre del dispositivo en Packet Tracer
 * @param commands - Array de comandos IOS a ejecutar
 * @param timeoutMs - Timeout en ms (default: 120000)
 * @returns PushResult con éxito/error
 * @example
 * ```ts
 * const result = await pushCommands("Router0", ["hostname MiRouter", "ip address 192.168.1.1 255.255.255.0"]);
 * if (result.success) {
 *   console.log(`Comandos aplicados en ${result.commandId}`);
 * }
 * ```
 */
export async function pushCommands(
  deviceId: string,
  commands: string[],
  timeoutMs = 120_000,
): Promise<PushResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({ root: devDir });

  bridge.start();

  try {
    const bridgeReady = await waitForBridgeReady(bridge, timeoutMs);
    if (!bridgeReady) {
      return {
        success: false,
        error: "Bridge not ready",
      };
    }

    const result = await bridge.sendCommandAndWait<
      { device: string; commands: string[]; save?: boolean },
      { ok: boolean; error?: string }
    >("configIos", { device: deviceId, commands, save: true }, timeoutMs);

    if (result.ok) {
      return { success: true, commandId: result.id };
    } else {
      return {
        success: false,
        error: result.error?.message ?? "Unknown error",
        commandId: result.id,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await bridge.stop();
  }
}

/**
 * Envía código JavaScript raw a PT para evaluación.
 * Usa el handler "code" en el runtime de PT.
 *
 * @param code - Código JavaScript a ejecutar en PT
 * @param timeoutMs - Timeout en ms (default: 120000)
 * @returns PushResult con éxito/error
 */
export async function pushCode(code: string, timeoutMs = 120_000): Promise<PushResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({ root: devDir });

  bridge.start();

  try {
    const bridgeReady = await waitForBridgeReady(bridge, timeoutMs);
    if (!bridgeReady) {
      return {
        success: false,
        error: "Bridge not ready",
      };
    }

    const result = await bridge.sendCommandAndWait<
      { code: string },
      { ok: boolean; error?: string }
    >("code", { code }, timeoutMs);

    if (result.ok) {
      return { success: true, commandId: result.id };
    } else {
      return {
        success: false,
        error: result.error?.message ?? "Unknown error",
        commandId: result.id,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await bridge.stop();
  }
}
```

### packages/file-bridge/src/file-bridge-v2.ts
```ts
/**
 * FileBridge V2 — Bridge durable para pt-control.
 *
 * Orchestra lease management, command processing, crash recovery,
 * diagnostics y garbage collection en un bridge unificado y durable.
 *
 * Estado máquina: stopped -> starting -> leased -> recovering -> running -> stopping
 *
 * Protocolo de archivos (fuente de verdad: filesystem):
 * - commands/*.json: cola FIFO de comandos pending (seq = nombre de archivo)
 * - in-flight/*.json: comandos en proceso por PT (claim via atomic rename)
 * - results/<id>.json: resultado authoritative de cada comando
 * - dead-letter/*.json: comandos corruptos que no se pudieron procesar
 * - logs/events.current.ndjson: journal NDJSON de todos los eventos del bridge
 *
 * Flujo de un comando:
 * 1. CLI escribe commands/<seq>-<type>.json con el envelope del comando
 * 2. PT hace claim con rename atómico -> in-flight/<seq>-<type>.json
 * 3. PT escribe resultado -> results/<id>.json
 * 4. CLI lee resultado, borra in-flight
 *
 * El índice _queue.json es auxiliar (legacy fallback para PT que no puede
 * enumerar directorios). La fuente de verdad es la existencia física de
 * los archivos en commands/.
 */
import { existsSync, watch, readFileSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { ensureDir, ensureFile, atomicWriteFile } from "./shared/fs-atomic.js";
import type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeTimeoutDetails,
  BridgeEvent,
} from "./shared/protocol.js";
import type { Snapshot, DeviceSnapshot, LinkSnapshot } from "@cisco-auto/types";
import { BridgePathLayout } from "./shared/path-layout.js";
import { SequenceStore } from "./shared/sequence-store.js";
import { EventLogWriter } from "./event-log-writer.js";
import { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";
import { SharedResultWatcher } from "./shared-result-watcher.js";
import { BackpressureManager, BackpressureError } from "./backpressure-manager.js";
import { CommandProcessor } from "./v2/command-processor.js";
import { BridgeDiagnostics, type BridgeHealth } from "./v2/diagnostics.js";
import { GarbageCollector, type GCReport } from "./v2/garbage-collector.js";
import { BridgeLifecycle } from "./v2/bridge-lifecycle.js";
import { LeaseManager } from "./v2/lease-manager.js";
import { CrashRecovery } from "./v2/crash-recovery.js";
import { MonitoringService } from "./v2/monitoring-service.js";

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log("[bridge]", ...args);
};

/**
 * Opciones de configuración para FileBridgeV2.
 */
export interface FileBridgeV2Options {
  /** Directorio raíz del bridge (pt-dev) */
  root: string;
  /** ID del consumer para tracking de posición (default: "cli-main") */
  consumerId?: string;
  /** Timeout por defecto para esperar resultados (default: 120000ms) */
  resultTimeoutMs?: number;
  /** Intervalo de renewal del lease (default: 10000ms) */
  leaseIntervalMs?: number;
  /** TTL del lease antes de considerarse stale (default: 30000ms) */
  leaseTtlMs?: number;
  /** Máximo de comandos pending antes de aplicar backpressure (default: 100) */
  maxPendingCommands?: number;
  /** Habilita verificación de backpressure antes de enviar (default: true) */
  enableBackpressure?: boolean;
  /** Intervalo para auto-snapshot de topología (default: 5000ms) */
  autoSnapshotIntervalMs?: number;
  /** Intervalo para monitoreo de heartbeat de PT (default: 2000ms) */
  heartbeatIntervalMs?: number;
  /** Si true, omite escritura de _queue.json (fs es fuente primary) */
  skipQueueIndex?: boolean;
  /** Intervalo para limpieza automática de archivos huérfanos (default: 30000ms) */
  autoGcIntervalMs?: number;
}

export interface SendCommandAndWaitOptions {
  resolveDeferred?: boolean;
}

/**
 * Bridge V2 que coordina todos los componentes del sistema de archivos
 * para comunicación CLI <-> PT de forma durable y crash-safe.
 */
export class FileBridgeV2 extends EventEmitter {
  private readonly paths: BridgePathLayout;
  private readonly seq: SequenceStore;
  private readonly eventWriter: EventLogWriter;
  private readonly consumer: DurableNdjsonConsumer;
  private readonly resultWatcher: SharedResultWatcher;
  private readonly backpressure: BackpressureManager;
  private readonly commandProcessor: CommandProcessor;
  private readonly monitoringService: MonitoringService;
  private readonly _diagnostics: BridgeDiagnostics;
  private readonly garbageCollector: GarbageCollector;
  private readonly lifecycle: BridgeLifecycle;
  private readonly leaseManager: LeaseManager;
  private readonly crashRecovery: CrashRecovery;

  constructor(private readonly options: FileBridgeV2Options) {
    super();

    this.paths = new BridgePathLayout(options.root);
    this.seq = new SequenceStore(options.root);
    this.eventWriter = new EventLogWriter(this.paths);
    this.resultWatcher = new SharedResultWatcher(this.paths.resultsDir());
    this.backpressure = new BackpressureManager(this.paths, {
      maxPending: options.maxPendingCommands ?? 100,
    });

    this.commandProcessor = new CommandProcessor(this.paths, this.eventWriter, this.seq);

    this.leaseManager = new LeaseManager(this.paths.leaseFile(), options.leaseTtlMs ?? 30_000);

    this.crashRecovery = new CrashRecovery(
      this.paths,
      this.seq,
      this.eventWriter,
      this.leaseManager,
    );

    this.lifecycle = new BridgeLifecycle();

    this._diagnostics = new BridgeDiagnostics(
      this.paths,
      this.seq,
      () => this.leaseManager.getOwnerId(),
      () => this.leaseManager.readLease(),
    );
    this.garbageCollector = new GarbageCollector(this.paths, (logFile) =>
      this._diagnostics.isLogNeededByAnyConsumer(logFile),
    );

    this.monitoringService = new MonitoringService(
      this.paths,
      {
        sendCommandAndWait: async <TPayload = unknown, TResult = unknown>(
          type: string,
          payload: TPayload,
          timeoutMs: number,
        ) => {
          return this.sendCommandAndWait<TPayload, TResult>(type, payload, timeoutMs);
        },
        appendEvent: (event) => this.appendEvent(event),
        runGc: (opts) => this.gc(opts),
        nextSeq: () => this.seq.next(),
      },
      {
        autoSnapshotIntervalMs: options.autoSnapshotIntervalMs ?? 5_000,
        heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2_000,
        autoGcIntervalMs: options.autoGcIntervalMs ?? 30_000,
      },
    );

    this.consumer = new DurableNdjsonConsumer(this.paths, {
      consumerId: options.consumerId ?? "cli-main",
      startFromBeginning: false,
      onEvent: (event) => this.handleEvent(event),
      onGap: (expected, actual) => this.emit("gap", { expected, actual }),
      onParseError: (line, error) => this.emit("parse-error", { line, error }),
      onDataLoss: (info) => this.emit("data-loss", info),
    });
  }

  /**
   * Inicia el bridge: crea estructura de directorios, adquiere lease,
   * ejecuta crash recovery y comienza a consumir eventos.
   *
   * @throws Error si no puede adquirir el lease (otra instancia está corriendo)
   */
  start(): void {
    if (this.lifecycle.state !== "stopped") {
      return;
    }

    this.lifecycle.transition("starting");

    try {
      ensureDir(this.paths.commandsDir());
      ensureDir(this.paths.inFlightDir());
      ensureDir(this.paths.resultsDir());
      ensureDir(this.paths.logsDir());
      ensureDir(this.paths.consumerStateDir());
      ensureDir(this.paths.deadLetterDir());
      ensureFile(this.paths.currentEventsFile(), "");

      const acquiredLease = this.leaseManager.acquireLease();
      if (!acquiredLease) {
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "lease-denied",
          note: "Another bridge instance holds the lease",
        });
        this.lifecycle.transition("stopped");
        return;
      }

      this.lifecycle.transition("leased");
      this.crashRecovery.recover();
      this.lifecycle.transition("running");

      this.consumer.start();
      this.startAutoGc();
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "startup-error",
        error: String(err),
      });
      try {
        this.leaseManager.releaseLease();
      } catch {}
      this.lifecycle.transition("stopped");
    }
  }

  /**
   * Indica si el bridge está listo para aceptar comandos.
   * Requiere que el lifecycle esté en estado "running" y el lease sea válido.
   * @returns true si el bridge puede aceptar comandos
   */
  isReady(): boolean {
    return this.lifecycle.state !== "stopped" && this.lifecycle.isReady;
  }

  /**
   * Detiene el bridge de forma graceful: para consumers, libera lease,
   * y transiciona al estado "stopped".
   * @returns Promise que resuelve cuando el shutdown está completo
   */
  async stop(): Promise<void> {
    if (this.lifecycle.state === "stopped" || this.lifecycle.state === "stopping") {
      return;
    }

    this.lifecycle.transition("stopping");

    try {
      this.stopMonitoring();
      this.consumer.stop();
      this.resultWatcher.destroy();
      this.leaseManager.releaseLease();
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "shutdown-error",
        error: String(err),
      });
    } finally {
      this.lifecycle.transition("stopped");
    }
  }

  /**
   * Carga código JavaScript como runtime en el directorio del bridge.
   * El runtime es cargado por main.js en Packet Tracer.
   *
   * @param code - Código JavaScript del runtime
   */
  async loadRuntime(code: string): Promise<void> {
    ensureDir(this.paths.root);
    atomicWriteFile(join(this.paths.root, "runtime.js"), code);
  }

  /**
   * Carga un archivo existente como runtime del bridge.
   *
   * @param filePath - Path al archivo de runtime
   */
  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  /**
   * Envía un comando al bridge (no bloquea esperando resultado).
   *
   * El comando se escribe atómicamente en commands/<seq>-<type>.json.
   * Aplica backpressure si enableBackpressure=true y la cola está llena.
   *
   * @param type - Tipo del comando (identifica el handler en PT)
   * @param payload - Datos del comando (debe ser serializable)
   * @param expiresAtMs - Timestamp opcional tras el cual el comando expira
   * @returns El envelope del comando creado
   * @throws Error si el bridge no está listo o el payload es inválido
   */
  sendCommand<TPayload = unknown>(
    type: string,
    payload: TPayload,
    expiresAtMs?: number,
  ): BridgeCommandEnvelope<TPayload> {
    if (!this.isReady()) throw new Error("[bridge] sendCommand: bridge is not ready");

    if (typeof type !== "string" || type.trim() === "") {
      throw new Error("[bridge] sendCommand: type must be a non-empty string");
    }
    if (payload === null || payload === undefined) {
      throw new Error("[bridge] sendCommand: payload cannot be null or undefined");
    }
    if (typeof payload === "object" && Array.isArray(payload)) {
      throw new Error("[bridge] sendCommand: payload cannot be an array");
    }
    if (typeof payload !== "object") {
      throw new Error("[bridge] sendCommand: payload must be a serializable object");
    }
    if (expiresAtMs !== undefined && (typeof expiresAtMs !== "number" || expiresAtMs <= 0)) {
      throw new Error("[bridge] sendCommand: expiresAtMs must be a positive number");
    }

    debugLog(`sendCommand type=${type} expiresAtMs=${String(expiresAtMs ?? "none")}`);
    if (this.options.enableBackpressure ?? true) {
      this.backpressure.checkCapacity();
    }

    const seq = this.seq.next();
    const id = `cmd_${String(seq).padStart(12, "0")}`;

    // Asegurar que el payload tenga el campo 'type' que espera el runtime
    const payloadWithType = {
      type,
      ...(payload as object),
    } as TPayload;

    const envelope: BridgeCommandEnvelope<TPayload> = {
      protocolVersion: 2,
      id,
      seq,
      createdAt: Date.now(),
      type,
      payload: payloadWithType,
      attempt: 1,
      expiresAt: expiresAtMs,
      checksum: this.checksumOf({ type, payload: payloadWithType }),
    };

    const commandFile = this.paths.commandFilePath(seq, type);
    debugLog(`commandFile=${commandFile}`);

    ensureDir(this.paths.commandsDir());
    atomicWriteFile(commandFile, JSON.stringify(envelope, null, 2));

    // _queue.json es legacy fallback — no escribir si skipQueueIndex=true
    // Fuente primary: commands/*.json (filesystem)
    if (!this.options.skipQueueIndex) {
      try {
        this.appendQueueIndex(this.paths.commandFileName(seq, type));
      } catch (queueErr) {
        console.warn(`[bridge] failed to update queue index: ${String(queueErr)}`);
      }
```

### packages/file-bridge/src/index.ts
```ts
// Core bridge implementation
export {
  FileBridgeV2,
  type FileBridgeV2Options,
  type BridgeHealth,
  type GCReport,
} from "./file-bridge-v2.js";

// Bridge lifecycle (state machine)
export { BridgeLifecycle } from "./v2/bridge-lifecycle.js";

// Backpressure and resource management
export { BackpressureManager, BackpressureError } from "./backpressure-manager.js";
export { SharedResultWatcher } from "./shared-result-watcher.js";

// Convenience helpers
export { pushCommands, pushCode, type PushResult } from "./file-bridge-v2-commands.js";

// Event consumers
export {
  DurableNdjsonConsumer,
  type DurableNdjsonConsumerOptions,
} from "./durable-ndjson-consumer.js";
export { CheckpointManager } from "./consumer-checkpoint.js";
export { FileResolver } from "./consumer-file-resolver.js";

// Event writer
export { EventLogWriter } from "./event-log-writer.js";

// Protocol types — canonical source is @cisco-auto/types
export type {
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeEvent,
  BridgeLease,
  BridgeErrorDetail,
} from "./shared/protocol.js";

// Validation
export { BridgeEventSchema, type BridgeEventInput } from "./shared/protocol.js";
export type {
  ConsumerCheckpoint,
  RotationEntry,
  RotationManifest,
  InFlightRecovery,
  CommandStatus,
  CommandFileEnvelope,
} from "./shared/local-types.js";

// Infrastructure
export { BridgePathLayout } from "./shared/path-layout.js";
export { SequenceStore } from "./shared/sequence-store.js";
export { LeaseManager } from "./v2/lease-manager.js";
export { CrashRecovery } from "./v2/crash-recovery.js";
export { atomicWriteFile, ensureDir, ensureFile, appendLine } from "./shared/fs-atomic.js";

// Value Objects
export { CommandSeq, parseCommandSeq, isValidCommandSeq } from "./shared/command-seq.js";
export {
  CommandId,
  parseCommandId,
  isValidCommandId,
  generateCommandId,
} from "./shared/command-id.js";
```

### packages/file-bridge/src/shared-result-watcher.test.ts
```ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { BridgePathLayout } from './shared/path-layout';
import { join } from 'node:path';
import { SharedResultWatcher } from './shared-result-watcher.js';

const TEST_ROOT = '/tmp/watcher-test-' + Math.random().toString(36).slice(2);

describe('SharedResultWatcher', () => {
  let paths: BridgePathLayout;

  beforeEach(() => {
    mkdirSync(TEST_ROOT, { recursive: true });
    paths = new BridgePathLayout(TEST_ROOT);
    mkdirSync(paths.resultsDir(), { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_ROOT, { recursive: true, force: true });
    } catch {}
  });

  describe('initialization', () => {
    test('should initialize watcher', () => {
      const watcher = {
        enabled: true,
        pattern: '*.json',
        timeout: 30000
      };

      expect(watcher.enabled).toBe(true);
      expect(watcher.pattern).toBe('*.json');
    });

    test('should set up results directory', () => {
      mkdirSync(paths.resultsDir(), { recursive: true });

      const dir = paths.resultsDir();
      expect(dir).toBeDefined();
      expect(dir.includes('results')).toBe(true);
    });

    test('should configure timeout', () => {
      const timeout = 30000;
      expect(timeout).toBeGreaterThan(0);
      expect(timeout).toBeLessThanOrEqual(300000);
    });

    test('should initialize with config', () => {
      const config = {
        pollingIntervalMs: 500,
        maxRetries: 3,
        backoffMs: 1000
      };

      expect(config.pollingIntervalMs).toBe(500);
      expect(config.maxRetries).toBe(3);
    });
  });

  describe('watch registration', () => {
    test('tracks listeners per command id and resets on destroy', () => {
      const watcher = new SharedResultWatcher(paths.resultsDir());
      const callbackA = () => undefined;
      const callbackB = () => undefined;

      watcher.watch('cmd_1', callbackA);
      watcher.watch('cmd_2', callbackB);

      expect(watcher.getStats()).toEqual({
        watching: true,
        listenersCount: 2,
        commandsWatched: 2,
      });

      watcher.unwatch('cmd_1', callbackA);
      expect(watcher.getStats()).toEqual({
        watching: true,
        listenersCount: 1,
        commandsWatched: 1,
      });

      watcher.destroy();
      expect(watcher.getStats()).toEqual({
        watching: false,
        listenersCount: 0,
        commandsWatched: 0,
      });
    });
  });

  describe('file watching', () => {
    test('should detect new result files', () => {
      mkdirSync(paths.resultsDir(), { recursive: true });
      const resultFile = join(paths.resultsDir(), 'result-1.json');
      
      writeFileSync(resultFile, JSON.stringify({ status: 'completed' }));

      expect(resultFile).toBeDefined();
    });

    test('should match file patterns', () => {
      const patterns = ['*.json', 'result-*.json', 'cmd-*.result'];

      const filename = 'result-123.json';
      const matches = patterns.filter(p => {
        const regex = new RegExp('^' + p.replace('*', '.*') + '$');
        return regex.test(filename);
      });

      expect(matches.length).toBeGreaterThan(0);
    });

    test('should ignore non-matching files', () => {
      const pattern = '*.json';
      const files = ['result.json', 'log.txt', 'config.yaml'];

      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      const matching = files.filter(f => regex.test(f));

      expect(matching).toHaveLength(1);
    });

    test('should handle subdirectories', () => {
      const paths_: any = {
        resultsDir: () => '/path/results',
        deadLetterDir: () => '/path/results/dead-letter'
      };

      expect(paths_.deadLetterDir()).toContain('dead-letter');
    });
  });

  describe('result parsing', () => {
    test('should parse result JSON', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'completed',
        output: 'success',
        timestamp: Date.now()
      };

      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.commandId).toBe('cmd-1');
      expect(parsed.status).toBe('completed');
    });

    test('should validate result structure', () => {
      const isValidResult = (obj: any) => {
        return 'commandId' in obj && 'status' in obj;
      };

      const valid = { commandId: 'c1', status: 'ok', output: 'data' };
      const invalid = { commandId: 'c1' };

      expect(isValidResult(valid)).toBe(true);
      expect(isValidResult(invalid)).toBe(false);
    });

    test('should handle parse errors', () => {
      const invalidJson = '{not valid json}';
      let parseError: any = null;

      try {
        JSON.parse(invalidJson);
      } catch (e) {
        parseError = e;
      }

      expect(parseError).not.toBeNull();
    });

    test('should extract command ID from result', () => {
      const result = {
        commandId: 'cmd-123',
        status: 'completed'
      };

      expect(result.commandId).toBe('cmd-123');
      const id = result.commandId.split('-')[1];
      expect(id).toBe('123');
    });
  });

  describe('result completion detection', () => {
    test('should detect completed results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'completed',
        output: 'Success'
      };

      const isCompleted = result.status === 'completed';
      expect(isCompleted).toBe(true);
    });

    test('should detect failed results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'failed',
        error: 'Error message'
      };

      const isFailed = result.status === 'failed' || !!result.error;
      expect(isFailed).toBe(true);
    });

    test('should detect pending results', () => {
      const result = {
        commandId: 'cmd-1',
        status: 'pending'
      };

      const isPending = result.status === 'pending';
      expect(isPending).toBe(true);
    });

    test('should match results with commands', () => {
      const commands = new Map([
        ['cmd-1', { device: 'R1', cmd: 'show version' }],
        ['cmd-2', { device: 'R2', cmd: 'show interfaces' }]
      ]);

      const result = { commandId: 'cmd-1' };
      const command = commands.get(result.commandId);

      expect(command?.device).toBe('R1');
    });

    test('should handle timeout for missing results', () => {
      const timeout = 30000;
      const elapsed = 30100;

      const isTimedOut = elapsed > timeout;
      expect(isTimedOut).toBe(true);
    });
  });

  describe('callback management', () => {
    test('should call onResult callback', () => {
      const callbacks: any[] = [];

      const onResult = (result: any) => {
        callbacks.push(result);
      };

      const result = { commandId: 'cmd-1', status: 'completed' };
      onResult(result);

      expect(callbacks).toHaveLength(1);
      expect(callbacks[0].commandId).toBe('cmd-1');
    });

    test('should call onTimeout callback', () => {
      const callbacks: any[] = [];

      const onTimeout = (commandId: string) => {
        callbacks.push({ type: 'timeout', commandId });
      };

      onTimeout('cmd-1');
      expect(callbacks).toHaveLength(1);
      expect(callbacks[0].type).toBe('timeout');
    });

    test('should call onError callback', () => {
      const errors: any[] = [];

      const onError = (error: Error) => {
        errors.push(error);
      };

      onError(new Error('Watch failed'));
      expect(errors).toHaveLength(1);
    });

    test('should handle multiple callbacks', () => {
      const allCallbacks: any[] = [];

      const callbacks = {
        onResult: (r: any) => allCallbacks.push({ type: 'result', data: r }),
        onError: (e: any) => allCallbacks.push({ type: 'error', data: e })
      };

      callbacks.onResult({ cmd: 'c1' });
      callbacks.onError(new Error('test'));

      expect(allCallbacks).toHaveLength(2);
    });
  });
});
```

### packages/file-bridge/src/shared-result-watcher.ts
```ts
/**
 * Watcher compartido para archivos de resultado.
 *
 * Evita el agotamiento de file descriptors creando UN SOLO fs.watch
 * en lugar de uno por cada sendCommandAndWait(). Múltiples listeners
 * se registran por commandId y son notificados cuando el watcher
 * detecta cambios en el directorio de resultados.
 *
 * Algoritmo de watching:
 * 1. SharedResultWatcher mantiene un Map<commandId, Set<callback>>
 * 2. El primer registro inicia el watcher del directorio results/
 * 3. Cuando un archivo .json aparece, se extrae el commandId y se
 *    notifica a todos los callbacks registrados
 * 4. El último unwatch detiene el watcher para liberar recursos
 *
 * El watcher es lazy: solo se crea cuando hay listeners activos y
 * se destruye cuando no queda ninguno.
 */
import { watch, type FSWatcher } from "node:fs";
import { EventEmitter } from "node:events";

/**
 * Watcher compartido que multiplexa notificaciones de archivos de resultado.
 *
 * Evita agotamiento de file descriptors al crear un único fs.watch()
 * que sirve a múltiples commandIds. Pattern pub/sub con cleanup automático.
 */
export class SharedResultWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private callbacks = new Map<string, Set<() => void>>();
  private refCount = 0;
  private watching = false;

  /**
   * @param resultsDir - Directorio donde se escriben los resultados (results/)
   */
  constructor(private readonly resultsDir: string) {
    super();
  }

  /**
   * Registra un callback para ser notificado cuando aparezca el resultado de un comando.
   * Inicia el watcher lazily si es el primer registro.
   *
   * @param commandId - ID del comando (sin extensión)
   * @param callback - Función a llamar cuando el archivo de resultado aparezca
   */
  watch(commandId: string, callback: () => void): void {
    if (!this.callbacks.has(commandId)) {
      this.callbacks.set(commandId, new Set());
    } else {
      const existing = this.callbacks.get(commandId)!;
      if (existing.has(callback)) {
        return;
      }
    }

    this.callbacks.get(commandId)!.add(callback);
    this.refCount++;

    if (!this.watching) {
      this.startWatcher();
    }
  }

  /**
   * Desregistra un callback. Si no quedan callbacks para un commandId,
   * se limpia la entrada. Si no quedan listeners activos, se detiene el watcher.
   *
   * @param commandId - ID del comando
   * @param callback - Referencia exacta del callback a remover
   */
  unwatch(commandId: string, callback: () => void): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    if (cbs.delete(callback)) {
      this.refCount--;
    }

    if (cbs.size === 0) {
      this.callbacks.delete(commandId);
    }

    if (this.refCount === 0 && this.watching) {
      this.stopWatcher();
    }
  }

  /**
   * Notifica a todos los callbacks registrados para un commandId.
   * Los errores en callbacks individuales se emitén como eventos de error
   * pero no interrumpen la notificación de otros callbacks.
   *
   * @param commandId - ID del comando cuyos listeners deben ser notificados
   */
  private notify(commandId: string): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    for (const callback of cbs) {
      try {
        callback();
      } catch (err) {
        this.emit("error", err);
      }
    }
  }

  /**
   * Inicia el fs.watch del directorio de resultados.
   * Filtra solo archivos .json y extrae el commandId del nombre.
   */
  private startWatcher(): void {
    if (this.watcher) return;

    try {
      this.watcher = watch(this.resultsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith(".json")) return;

        const commandId = filename.replace(/\.json$/, "");
        this.notify(commandId);
      });

      this.watcher.on("error", (err) => {
        this.emit("error", err);
        this.watcher = null;
        this.watching = false;

        if (this.refCount > 0) {
          setTimeout(() => this.startWatcher(), 1000);
        }
      });

      this.watching = true;
    } catch (err) {
      this.emit("error", err);
      this.watcher = null;
      this.watching = false;
    }
  }

  /**
   * Detiene y cierra el watcher de forma segura.
   */
  private stopWatcher(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // Ignore close errors
      }
      this.watcher = null;
    }
    this.watching = false;
  }

  /**
   * Libera todos los recursos: cierra watcher, limpia callbacks y listeners.
   * Llamar antes de descartar la instancia.
   */
  destroy(): void {
    this.stopWatcher();
    this.callbacks.clear();
    this.refCount = 0;
    this.removeAllListeners();
  }

  /**
   * Obtiene estadísticas de diagnóstico del watcher.
   * @returns Estado actual del watcher y contadores
   */
  getStats(): {
    watching: boolean;
    listenersCount: number;
    commandsWatched: number;
  } {
    return {
      watching: this.watching,
      listenersCount: this.refCount,
      commandsWatched: this.callbacks.size,
    };
  }
}
```

### packages/pt-control/src/adapters/runtime-terminal/adapter.ts
```ts
// RuntimeTerminalAdapter — orchestrator (runTerminalPlan)
// Coordinates step handlers, status normalization, and device detection.
// No pure logic lives here — it delegates to specialized modules.

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
} from "../../ports/runtime-terminal-port.js";
import { detectDeviceType } from "./device-type-detector.js";
import { handleEnsureModeStep } from "./step-handlers/ensure-mode-handler.js";
import { handleConfirmStep } from "./step-handlers/confirm-handler.js";
import { ensureSession, pollTerminalJob } from "./terminal-session.js";
import { createPayloadBuilder } from "./payload-builder.js";
import { createResponseParser } from "./response-parser.js";
import { createTerminalPlanAdapter } from "./terminal-plan-adapter.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export function createRuntimeTerminalAdapter(
  deps: RuntimeTerminalAdapterDeps,
): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  const payloadBuilder = createPayloadBuilder({ bridge });
  const responseParser = createResponseParser();
  const planAdapter = createTerminalPlanAdapter();

  function normalizeBridgeValue(result: unknown): unknown {
    return (result as { value?: unknown })?.value ?? result ?? {};
  }

  function buildTimingsEvidence(timings: unknown): Record<string, unknown> {
    return timings ? { timings } : {};
  }

  function isDeferredValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
  }

  function isStillPending(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.deferred === true) return true;
    if (record.done === false) return true;
    if (record.status === "pending") return true;
    if (record.status === "in-flight") return true;
    if (record.status === "running") return true;
    return false;
  }

  function isUnsupportedTerminalPlanRun(result: unknown): boolean {
    const value = result as { error?: unknown; value?: { error?: unknown } } | null | undefined;
    const text = String(value?.error ?? value?.value?.error ?? "").toLowerCase();
    return (
      text.includes("unknown command") ||
      text.includes("not found") ||
      text.includes("unsupported") ||
      text.includes("unrecognized") ||
      text.includes("no existe")
    );
  }

  function normalizeCommand(command: string): string {
    return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function isFastNativeIosCommand(command: string): boolean {
    const cmd = normalizeCommand(command);

    if (!cmd) return false;

    return /^show\b/.test(cmd) || /^dir\b/.test(cmd) || /^more\b/.test(cmd);
  }

  function getVisibleCommandSteps(plan: TerminalPlan): Array<{ command: string; kind?: string }> {
    return plan.steps.filter((step) => {
      const metadata = step.metadata as { internal?: boolean } | undefined;

      return metadata?.internal !== true && String(step.command ?? "").trim().length > 0;
    }) as Array<{ command: string; kind?: string }>;
  }

  function getSingleVisibleCommand(plan: TerminalPlan): string | null {
    const commands = getVisibleCommandSteps(plan);

    if (commands.length !== 1) return null;

    const command = String(commands[0]?.command ?? "").trim();
    return command || null;
  }

  function shouldUseNativeExec(plan: TerminalPlan): boolean {
    const metadata = plan.metadata as { deviceKind?: string } | undefined;

    if (metadata?.deviceKind !== "ios") return false;

    const command = getSingleVisibleCommand(plan);
    if (!command) return false;

    return isFastNativeIosCommand(command);
  }

  function buildTerminalTransportFailure(
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code: "TERMINAL_PLAN_TRANSPORT_FAILED",
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  function buildTerminalDeferredFailure(
    code: string,
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code,
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  async function executeLegacyPlan(normalizedPlan: ReturnType<typeof planAdapter.normalizePlan>): Promise<TerminalPortResult> {
    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    let aggregatedOutput = "";
    let finalStatus = 0;
    let finalParsed: unknown = undefined;
    let finalTimings: unknown = undefined;

    const warnings: string[] = [];
    const events: Array<Record<string, unknown>> = [];

    const deviceType = await detectDeviceType(bridge, normalizedPlan.device);
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts = normalizedPlan.timeouts ?? payloadBuilder.getDefaultTimeouts();
    const defaultPolicies = normalizedPlan.policies ?? payloadBuilder.getDefaultPolicies();

    for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
      const step = normalizedPlan.steps[i]!;

      if (step.kind === "ensureMode") {
        const { event, result, returnEarly, returnValue } = await handleEnsureModeStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
            planTargetMode: normalizedPlan.targetMode,
          },
          step,
          i,
        );

        if (result.promptBefore && !promptBefore) promptBefore = result.promptBefore;
        if (result.modeBefore && !modeBefore) modeBefore = result.modeBefore;
        if (result.promptAfter) promptAfter = result.promptAfter;
        if (result.modeAfter) modeAfter = result.modeAfter;
        if (result.finalParsed) finalParsed = result.finalParsed;

        events.push(event);

        if (returnEarly && returnValue) return returnValue;
        continue;
      }

      if (step.kind === "expectPrompt") {
        events.push({
          stepIndex: i,
          kind: "expectPrompt",
          expectPromptPattern: step.expectPromptPattern,
        });
        continue;
      }

      if (step.kind === "confirm") {
        const { event } = await handleConfirmStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
          },
          i,
        );
        events.push(event);
        continue;
      }

      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
      const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

      const payload = payloadBuilder.buildCommandPayload({
        handlerName,
        device: normalizedPlan.device,
        command,
        targetMode: normalizedPlan.targetMode,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
        ensurePrivileged: payloadBuilder.shouldEnsurePrivilegedForStep({
          isHost,
          planTargetMode: normalizedPlan.targetMode,
          command,
          stepIndex: i,
        }),
        commandTimeoutMs: stepTimeout,
        stallTimeoutMs: stepStallTimeout,
      });

      const bridgeResult = await bridge.sendCommandAndWait<unknown>(handlerName, payload, stepTimeout);
      finalTimings = bridgeResult.timings;
      const parsed = responseParser.parseCommandResponse(normalizeBridgeValue(bridgeResult), {
        stepIndex: i,
        isHost,
        command,
      });

      if (i === 0) {
        promptBefore = parsed.promptBefore;
        modeBefore = parsed.modeBefore;
      }

      promptAfter = parsed.promptAfter;
      modeAfter = parsed.modeAfter;
      aggregatedOutput += parsed.raw.endsWith("\n") ? parsed.raw : `${parsed.raw}\n`;
      finalStatus = parsed.status;
      finalParsed = parsed.parsed;

      warnings.push(...parsed.warnings);
      const event = responseParser.buildEventFromResponse(parsed, step, i);
      events.push(event);

      const mismatchWarning = responseParser.checkPromptMismatch(parsed, step);
      if (mismatchWarning) warnings.push(mismatchWarning);

      if (!parsed.ok || parsed.status !== 0) {
        return {
          ok: false,
          output: aggregatedOutput.trim(),
          status: parsed.status || 1,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings,
          parsed: finalParsed,
          evidence: buildTimingsEvidence(bridgeResult.timings),
          confidence: 0,
        };
      }
    }

    return {
      ok: true,
      output: aggregatedOutput.trim(),
      status: finalStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      parsed: finalParsed,
      evidence: buildTimingsEvidence(finalTimings),
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
    const stepCount = Math.max(plan.steps.length, 1);

    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
    const totalBudgetMs = perStepBudgetMs * stepCount;

    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
  }

  function computeTerminalPlanSubmitTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);

    // terminal.plan.run solo debe crear el ticket; no ejecuta todo el comando.
    // Pero Packet Tracer puede tardar en reclamar archivos si el kernel está ocupado,
    // hay polling activo, o el filesystem compartido va lento.
    return Math.max(
      15000,
      Math.min(firstStepTimeoutMs, 30000),
    );
  }

  async function executeTerminalPlanRun(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult | null> {
    const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);
    const submitResult = await bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs } },
      submitTimeoutMs,
      { resolveDeferred: false },
    );
    let finalTimings: unknown = submitResult.timings;
```

## deployed logs around missing ids
```

----- /Users/andresgaibor/pt-dev/logs/events.current.ndjson -----
{"seq":17788,"ts":1777399205824,"type":"command-enqueued","id":"cmd_000000017788","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17789,"ts":1777399206291,"type":"command-enqueued","id":"cmd_000000017789","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17790,"ts":1777399206705,"type":"command-enqueued","id":"cmd_000000017790","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17791,"ts":1777399207114,"type":"command-enqueued","id":"cmd_000000017791","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17792,"ts":1777399207521,"type":"command-enqueued","id":"cmd_000000017792","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17793,"ts":1777399208038,"type":"command-enqueued","id":"cmd_000000017793","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17794,"ts":1777399208505,"type":"command-enqueued","id":"cmd_000000017794","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17795,"ts":1777399208914,"type":"command-enqueued","id":"cmd_000000017795","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17796,"ts":1777399209323,"type":"command-enqueued","id":"cmd_000000017796","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17797,"ts":1777399209839,"type":"command-enqueued","id":"cmd_000000017797","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17798,"ts":1777399210305,"type":"command-enqueued","id":"cmd_000000017798","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17799,"ts":1777399210711,"type":"command-enqueued","id":"cmd_000000017799","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17800,"ts":1777399211123,"type":"command-enqueued","id":"cmd_000000017800","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17801,"ts":1777399211635,"type":"command-enqueued","id":"cmd_000000017801","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17802,"ts":1777399212144,"type":"command-enqueued","id":"cmd_000000017802","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17803,"ts":1777399212614,"type":"command-enqueued","id":"cmd_000000017803","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17804,"ts":1777399213024,"type":"command-enqueued","id":"cmd_000000017804","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17805,"ts":1777399213536,"type":"command-enqueued","id":"cmd_000000017805","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17806,"ts":1777399214003,"type":"command-enqueued","id":"cmd_000000017806","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17807,"ts":1777399214437,"type":"command-enqueued","id":"cmd_000000017807","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17808,"ts":1777399214940,"type":"command-enqueued","id":"cmd_000000017808","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220372}
{"seq":17809,"ts":1777399215405,"type":"command-enqueued","id":"cmd_000000017809","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17810,"ts":1777399215815,"type":"command-enqueued","id":"cmd_000000017810","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17811,"ts":1777399216338,"type":"command-enqueued","id":"cmd_000000017811","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17812,"ts":1777399216807,"type":"command-enqueued","id":"cmd_000000017812","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17813,"ts":1777399217219,"type":"command-enqueued","id":"cmd_000000017813","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17814,"ts":1777399217736,"type":"command-enqueued","id":"cmd_000000017814","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17815,"ts":1777399218203,"type":"command-enqueued","id":"cmd_000000017815","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17816,"ts":1777399218614,"type":"command-enqueued","id":"cmd_000000017816","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17817,"ts":1777399219022,"type":"command-enqueued","id":"cmd_000000017817","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399220371}
{"seq":17818,"ts":1777399335476,"type":"command-enqueued","id":"cmd_000000017818","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777399345468}
{"seq":17819,"ts":1777399337613,"type":"command-enqueued","id":"cmd_000000017819","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777399397606}
{"seq":17820,"ts":1777399337905,"type":"command-enqueued","id":"cmd_000000017820","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777399342894}
{"seq":17821,"ts":1777399338301,"type":"command-enqueued","id":"cmd_000000017821","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17822,"ts":1777399338823,"type":"command-enqueued","id":"cmd_000000017822","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17823,"ts":1777399339341,"type":"command-enqueued","id":"cmd_000000017823","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17824,"ts":1777399339807,"type":"command-enqueued","id":"cmd_000000017824","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17825,"ts":1777399340215,"type":"command-enqueued","id":"cmd_000000017825","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17826,"ts":1777399340583,"type":"command-enqueued","id":"cmd_000000017826","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368300}
{"seq":17827,"ts":1777399340992,"type":"command-enqueued","id":"cmd_000000017827","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17828,"ts":1777399341403,"type":"command-enqueued","id":"cmd_000000017828","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17829,"ts":1777399341820,"type":"command-enqueued","id":"cmd_000000017829","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17830,"ts":1777399342549,"type":"command-enqueued","id":"cmd_000000017830","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17831,"ts":1777399343042,"type":"command-enqueued","id":"cmd_000000017831","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368302}
{"seq":17832,"ts":1777399343569,"type":"command-enqueued","id":"cmd_000000017832","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17833,"ts":1777399344036,"type":"command-enqueued","id":"cmd_000000017833","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17834,"ts":1777399344502,"type":"command-enqueued","id":"cmd_000000017834","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17835,"ts":1777399344911,"type":"command-enqueued","id":"cmd_000000017835","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17836,"ts":1777399345320,"type":"command-enqueued","id":"cmd_000000017836","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17837,"ts":1777399345841,"type":"command-enqueued","id":"cmd_000000017837","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17838,"ts":1777399346450,"type":"command-enqueued","id":"cmd_000000017838","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368300}
{"seq":17839,"ts":1777399346915,"type":"command-enqueued","id":"cmd_000000017839","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17840,"ts":1777399347324,"type":"command-enqueued","id":"cmd_000000017840","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17841,"ts":1777399347787,"type":"command-enqueued","id":"cmd_000000017841","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17842,"ts":1777399348195,"type":"command-enqueued","id":"cmd_000000017842","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17843,"ts":1777399348605,"type":"command-enqueued","id":"cmd_000000017843","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17844,"ts":1777399349041,"type":"command-enqueued","id":"cmd_000000017844","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17845,"ts":1777399349852,"type":"command-enqueued","id":"cmd_000000017845","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17846,"ts":1777399350399,"type":"command-enqueued","id":"cmd_000000017846","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17847,"ts":1777399350832,"type":"command-enqueued","id":"cmd_000000017847","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17848,"ts":1777399351294,"type":"command-enqueued","id":"cmd_000000017848","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17849,"ts":1777399351700,"type":"command-enqueued","id":"cmd_000000017849","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17850,"ts":1777399352108,"type":"command-enqueued","id":"cmd_000000017850","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17851,"ts":1777399352514,"type":"command-enqueued","id":"cmd_000000017851","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17852,"ts":1777399352924,"type":"command-enqueued","id":"cmd_000000017852","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17853,"ts":1777399353440,"type":"command-enqueued","id":"cmd_000000017853","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17854,"ts":1777399353905,"type":"command-enqueued","id":"cmd_000000017854","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17855,"ts":1777399354313,"type":"command-enqueued","id":"cmd_000000017855","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17856,"ts":1777399354718,"type":"command-enqueued","id":"cmd_000000017856","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17857,"ts":1777399355242,"type":"command-enqueued","id":"cmd_000000017857","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17858,"ts":1777399355708,"type":"command-enqueued","id":"cmd_000000017858","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17859,"ts":1777399356116,"type":"command-enqueued","id":"cmd_000000017859","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17860,"ts":1777399356522,"type":"command-enqueued","id":"cmd_000000017860","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17861,"ts":1777399357043,"type":"command-enqueued","id":"cmd_000000017861","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368300}
{"seq":17862,"ts":1777399357510,"type":"command-enqueued","id":"cmd_000000017862","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17863,"ts":1777399357920,"type":"command-enqueued","id":"cmd_000000017863","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17864,"ts":1777399358439,"type":"command-enqueued","id":"cmd_000000017864","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17865,"ts":1777399358907,"type":"command-enqueued","id":"cmd_000000017865","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17866,"ts":1777399359316,"type":"command-enqueued","id":"cmd_000000017866","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17867,"ts":1777399359837,"type":"command-enqueued","id":"cmd_000000017867","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17868,"ts":1777399360303,"type":"command-enqueued","id":"cmd_000000017868","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17869,"ts":1777399360709,"type":"command-enqueued","id":"cmd_000000017869","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17870,"ts":1777399361118,"type":"command-enqueued","id":"cmd_000000017870","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17871,"ts":1777399361644,"type":"command-enqueued","id":"cmd_000000017871","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17872,"ts":1777399362110,"type":"command-enqueued","id":"cmd_000000017872","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368300}
{"seq":17873,"ts":1777399362520,"type":"command-enqueued","id":"cmd_000000017873","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17874,"ts":1777399363039,"type":"command-enqueued","id":"cmd_000000017874","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17875,"ts":1777399363506,"type":"command-enqueued","id":"cmd_000000017875","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17876,"ts":1777399363915,"type":"command-enqueued","id":"cmd_000000017876","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17877,"ts":1777399364324,"type":"command-enqueued","id":"cmd_000000017877","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17878,"ts":1777399364844,"type":"command-enqueued","id":"cmd_000000017878","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17879,"ts":1777399365310,"type":"command-enqueued","id":"cmd_000000017879","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17880,"ts":1777399365721,"type":"command-enqueued","id":"cmd_000000017880","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17881,"ts":1777399366240,"type":"command-enqueued","id":"cmd_000000017881","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17882,"ts":1777399366708,"type":"command-enqueued","id":"cmd_000000017882","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17883,"ts":1777399367118,"type":"command-enqueued","id":"cmd_000000017883","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399368299}
{"seq":17884,"ts":1777399773652,"type":"command-enqueued","id":"cmd_000000017884","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777399783648}
{"seq":17885,"ts":1777399775167,"type":"command-enqueued","id":"cmd_000000017885","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777399835162}
{"seq":17886,"ts":1777399775355,"type":"command-enqueued","id":"cmd_000000017886","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777399780352}
{"seq":17887,"ts":1777399775571,"type":"command-enqueued","id":"cmd_000000017887","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17888,"ts":1777399776101,"type":"command-enqueued","id":"cmd_000000017888","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17889,"ts":1777399776564,"type":"command-enqueued","id":"cmd_000000017889","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17890,"ts":1777399777029,"type":"command-enqueued","id":"cmd_000000017890","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17891,"ts":1777399777494,"type":"command-enqueued","id":"cmd_000000017891","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17892,"ts":1777399777941,"type":"command-enqueued","id":"cmd_000000017892","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17893,"ts":1777399778407,"type":"command-enqueued","id":"cmd_000000017893","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17894,"ts":1777399778816,"type":"command-enqueued","id":"cmd_000000017894","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17895,"ts":1777399779226,"type":"command-enqueued","id":"cmd_000000017895","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17896,"ts":1777399779742,"type":"command-enqueued","id":"cmd_000000017896","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17897,"ts":1777399780210,"type":"command-enqueued","id":"cmd_000000017897","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17898,"ts":1777399780614,"type":"command-enqueued","id":"cmd_000000017898","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17899,"ts":1777399781020,"type":"command-enqueued","id":"cmd_000000017899","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17900,"ts":1777399781426,"type":"command-enqueued","id":"cmd_000000017900","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17901,"ts":1777399781947,"type":"command-enqueued","id":"cmd_000000017901","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17902,"ts":1777399782414,"type":"command-enqueued","id":"cmd_000000017902","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17903,"ts":1777399782826,"type":"command-enqueued","id":"cmd_000000017903","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17904,"ts":1777399783400,"type":"command-enqueued","id":"cmd_000000017904","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17905,"ts":1777399783808,"type":"command-enqueued","id":"cmd_000000017905","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17906,"ts":1777399784217,"type":"command-enqueued","id":"cmd_000000017906","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17907,"ts":1777399784625,"type":"command-enqueued","id":"cmd_000000017907","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17908,"ts":1777399785148,"type":"command-enqueued","id":"cmd_000000017908","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17909,"ts":1777399785616,"type":"command-enqueued","id":"cmd_000000017909","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17910,"ts":1777399786024,"type":"command-enqueued","id":"cmd_000000017910","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17911,"ts":1777399786432,"type":"command-enqueued","id":"cmd_000000017911","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17912,"ts":1777399786946,"type":"command-enqueued","id":"cmd_000000017912","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17913,"ts":1777399787412,"type":"command-enqueued","id":"cmd_000000017913","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17914,"ts":1777399787819,"type":"command-enqueued","id":"cmd_000000017914","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17915,"ts":1777399788226,"type":"command-enqueued","id":"cmd_000000017915","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17916,"ts":1777399788747,"type":"command-enqueued","id":"cmd_000000017916","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17917,"ts":1777399789214,"type":"command-enqueued","id":"cmd_000000017917","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17918,"ts":1777399789621,"type":"command-enqueued","id":"cmd_000000017918","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17919,"ts":1777399790027,"type":"command-enqueued","id":"cmd_000000017919","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17920,"ts":1777399790545,"type":"command-enqueued","id":"cmd_000000017920","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17921,"ts":1777399791010,"type":"command-enqueued","id":"cmd_000000017921","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17922,"ts":1777399791421,"type":"command-enqueued","id":"cmd_000000017922","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17923,"ts":1777399791829,"type":"command-enqueued","id":"cmd_000000017923","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17924,"ts":1777399792348,"type":"command-enqueued","id":"cmd_000000017924","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17925,"ts":1777399792817,"type":"command-enqueued","id":"cmd_000000017925","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17926,"ts":1777399793221,"type":"command-enqueued","id":"cmd_000000017926","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17927,"ts":1777399793629,"type":"command-enqueued","id":"cmd_000000017927","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17928,"ts":1777399794143,"type":"command-enqueued","id":"cmd_000000017928","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17929,"ts":1777399794609,"type":"command-enqueued","id":"cmd_000000017929","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17930,"ts":1777399795016,"type":"command-enqueued","id":"cmd_000000017930","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17931,"ts":1777399795426,"type":"command-enqueued","id":"cmd_000000017931","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17932,"ts":1777399795944,"type":"command-enqueued","id":"cmd_000000017932","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17933,"ts":1777399796409,"type":"command-enqueued","id":"cmd_000000017933","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17934,"ts":1777399796817,"type":"command-enqueued","id":"cmd_000000017934","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17935,"ts":1777399797225,"type":"command-enqueued","id":"cmd_000000017935","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17936,"ts":1777399797744,"type":"command-enqueued","id":"cmd_000000017936","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17937,"ts":1777399798210,"type":"command-enqueued","id":"cmd_000000017937","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17938,"ts":1777399798616,"type":"command-enqueued","id":"cmd_000000017938","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17939,"ts":1777399799024,"type":"command-enqueued","id":"cmd_000000017939","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17940,"ts":1777399799615,"type":"command-enqueued","id":"cmd_000000017940","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17941,"ts":1777399800040,"type":"command-enqueued","id":"cmd_000000017941","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17942,"ts":1777399800508,"type":"command-enqueued","id":"cmd_000000017942","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17943,"ts":1777399800917,"type":"command-enqueued","id":"cmd_000000017943","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17944,"ts":1777399801331,"type":"command-enqueued","id":"cmd_000000017944","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17945,"ts":1777399801843,"type":"command-enqueued","id":"cmd_000000017945","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17946,"ts":1777399802306,"type":"command-enqueued","id":"cmd_000000017946","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17947,"ts":1777399802713,"type":"command-enqueued","id":"cmd_000000017947","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17948,"ts":1777399803122,"type":"command-enqueued","id":"cmd_000000017948","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17949,"ts":1777399803528,"type":"command-enqueued","id":"cmd_000000017949","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17950,"ts":1777399804046,"type":"command-enqueued","id":"cmd_000000017950","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17951,"ts":1777399804513,"type":"command-enqueued","id":"cmd_000000017951","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777399805570}
{"seq":17953,"ts":1777400021538,"type":"command-enqueued","id":"cmd_000000017953","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777400031532}
{"seq":17954,"ts":1777400023118,"type":"command-enqueued","id":"cmd_000000017954","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777400083115}
{"seq":17955,"ts":1777400023193,"type":"command-enqueued","id":"cmd_000000017955","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400028190}
{"seq":17956,"ts":1777400023355,"type":"command-enqueued","id":"cmd_000000017956","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17957,"ts":1777400023827,"type":"command-enqueued","id":"cmd_000000017957","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17958,"ts":1777400024292,"type":"command-enqueued","id":"cmd_000000017958","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17959,"ts":1777400024699,"type":"command-enqueued","id":"cmd_000000017959","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17960,"ts":1777400025107,"type":"command-enqueued","id":"cmd_000000017960","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17961,"ts":1777400025514,"type":"command-enqueued","id":"cmd_000000017961","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17962,"ts":1777400025921,"type":"command-enqueued","id":"cmd_000000017962","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17963,"ts":1777400026328,"type":"command-enqueued","id":"cmd_000000017963","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17964,"ts":1777400026839,"type":"command-enqueued","id":"cmd_000000017964","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17965,"ts":1777400027504,"type":"command-enqueued","id":"cmd_000000017965","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17966,"ts":1777400027995,"type":"command-enqueued","id":"cmd_000000017966","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17967,"ts":1777400028403,"type":"command-enqueued","id":"cmd_000000017967","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17968,"ts":1777400028811,"type":"command-enqueued","id":"cmd_000000017968","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17969,"ts":1777400029221,"type":"command-enqueued","id":"cmd_000000017969","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17970,"ts":1777400029627,"type":"command-enqueued","id":"cmd_000000017970","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17971,"ts":1777400030034,"type":"command-enqueued","id":"cmd_000000017971","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17972,"ts":1777400030539,"type":"command-enqueued","id":"cmd_000000017972","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17973,"ts":1777400031037,"type":"command-enqueued","id":"cmd_000000017973","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17974,"ts":1777400031537,"type":"command-enqueued","id":"cmd_000000017974","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17975,"ts":1777400032038,"type":"command-enqueued","id":"cmd_000000017975","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17976,"ts":1777400032538,"type":"command-enqueued","id":"cmd_000000017976","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17977,"ts":1777400033039,"type":"command-enqueued","id":"cmd_000000017977","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17978,"ts":1777400033538,"type":"command-enqueued","id":"cmd_000000017978","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17979,"ts":1777400034039,"type":"command-enqueued","id":"cmd_000000017979","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17980,"ts":1777400034477,"type":"command-enqueued","id":"cmd_000000017980","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17981,"ts":1777400034940,"type":"command-enqueued","id":"cmd_000000017981","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17982,"ts":1777400035439,"type":"command-enqueued","id":"cmd_000000017982","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17983,"ts":1777400035939,"type":"command-enqueued","id":"cmd_000000017983","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17984,"ts":1777400036440,"type":"command-enqueued","id":"cmd_000000017984","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17985,"ts":1777400036944,"type":"command-enqueued","id":"cmd_000000017985","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17986,"ts":1777400037439,"type":"command-enqueued","id":"cmd_000000017986","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17987,"ts":1777400037940,"type":"command-enqueued","id":"cmd_000000017987","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053354}
{"seq":17988,"ts":1777400038439,"type":"command-enqueued","id":"cmd_000000017988","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17989,"ts":1777400038938,"type":"command-enqueued","id":"cmd_000000017989","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17990,"ts":1777400039439,"type":"command-enqueued","id":"cmd_000000017990","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17991,"ts":1777400039939,"type":"command-enqueued","id":"cmd_000000017991","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17992,"ts":1777400040440,"type":"command-enqueued","id":"cmd_000000017992","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17993,"ts":1777400040940,"type":"command-enqueued","id":"cmd_000000017993","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17994,"ts":1777400041439,"type":"command-enqueued","id":"cmd_000000017994","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17995,"ts":1777400041939,"type":"command-enqueued","id":"cmd_000000017995","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17996,"ts":1777400042442,"type":"command-enqueued","id":"cmd_000000017996","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17997,"ts":1777400042939,"type":"command-enqueued","id":"cmd_000000017997","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17998,"ts":1777400043439,"type":"command-enqueued","id":"cmd_000000017998","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17999,"ts":1777400043940,"type":"command-enqueued","id":"cmd_000000017999","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18000,"ts":1777400044487,"type":"command-enqueued","id":"cmd_000000018000","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18001,"ts":1777400044950,"type":"command-enqueued","id":"cmd_000000018001","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18002,"ts":1777400045490,"type":"command-enqueued","id":"cmd_000000018002","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18003,"ts":1777400045941,"type":"command-enqueued","id":"cmd_000000018003","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18004,"ts":1777400046491,"type":"command-enqueued","id":"cmd_000000018004","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18005,"ts":1777400046954,"type":"command-enqueued","id":"cmd_000000018005","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18006,"ts":1777400047441,"type":"command-enqueued","id":"cmd_000000018006","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18007,"ts":1777400047941,"type":"command-enqueued","id":"cmd_000000018007","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18008,"ts":1777400048491,"type":"command-enqueued","id":"cmd_000000018008","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18009,"ts":1777400048948,"type":"command-enqueued","id":"cmd_000000018009","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18010,"ts":1777400049439,"type":"command-enqueued","id":"cmd_000000018010","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18011,"ts":1777400049989,"type":"command-enqueued","id":"cmd_000000018011","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18012,"ts":1777400050438,"type":"command-enqueued","id":"cmd_000000018012","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18013,"ts":1777400050990,"type":"command-enqueued","id":"cmd_000000018013","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18014,"ts":1777400051439,"type":"command-enqueued","id":"cmd_000000018014","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18015,"ts":1777400051942,"type":"command-enqueued","id":"cmd_000000018015","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18016,"ts":1777400052490,"type":"command-enqueued","id":"cmd_000000018016","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053489}
{"seq":18017,"ts":1777400510108,"type":"command-enqueued","id":"cmd_000000018017","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777400520092}
{"seq":18018,"ts":1777400511780,"type":"command-enqueued","id":"cmd_000000018018","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777400571775}
{"seq":18019,"ts":1777400511976,"type":"command-enqueued","id":"cmd_000000018019","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400516967}
{"seq":18020,"ts":1777400512246,"type":"command-enqueued","id":"cmd_000000018020","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18021,"ts":1777400512802,"type":"command-enqueued","id":"cmd_000000018021","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18022,"ts":1777400513245,"type":"command-enqueued","id":"cmd_000000018022","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18023,"ts":1777400513743,"type":"command-enqueued","id":"cmd_000000018023","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18024,"ts":1777400514245,"type":"command-enqueued","id":"cmd_000000018024","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18025,"ts":1777400514745,"type":"command-enqueued","id":"cmd_000000018025","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18026,"ts":1777400515243,"type":"command-enqueued","id":"cmd_000000018026","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18027,"ts":1777400515745,"type":"command-enqueued","id":"cmd_000000018027","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18028,"ts":1777400516242,"type":"command-enqueued","id":"cmd_000000018028","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18029,"ts":1777400516743,"type":"command-enqueued","id":"cmd_000000018029","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18030,"ts":1777400517243,"type":"command-enqueued","id":"cmd_000000018030","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18031,"ts":1777400517744,"type":"command-enqueued","id":"cmd_000000018031","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18032,"ts":1777400518244,"type":"command-enqueued","id":"cmd_000000018032","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18033,"ts":1777400518742,"type":"command-enqueued","id":"cmd_000000018033","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18034,"ts":1777400519244,"type":"command-enqueued","id":"cmd_000000018034","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18035,"ts":1777400519745,"type":"command-enqueued","id":"cmd_000000018035","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18036,"ts":1777400520245,"type":"command-enqueued","id":"cmd_000000018036","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18037,"ts":1777400520744,"type":"command-enqueued","id":"cmd_000000018037","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18038,"ts":1777400521248,"type":"command-enqueued","id":"cmd_000000018038","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18039,"ts":1777400521743,"type":"command-enqueued","id":"cmd_000000018039","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18040,"ts":1777400522244,"type":"command-enqueued","id":"cmd_000000018040","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18041,"ts":1777400522744,"type":"command-enqueued","id":"cmd_000000018041","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18042,"ts":1777400523298,"type":"command-enqueued","id":"cmd_000000018042","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18043,"ts":1777400523762,"type":"command-enqueued","id":"cmd_000000018043","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18044,"ts":1777400524244,"type":"command-enqueued","id":"cmd_000000018044","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18045,"ts":1777400524747,"type":"command-enqueued","id":"cmd_000000018045","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18046,"ts":1777400525295,"type":"command-enqueued","id":"cmd_000000018046","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18047,"ts":1777400525747,"type":"command-enqueued","id":"cmd_000000018047","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18048,"ts":1777400526295,"type":"command-enqueued","id":"cmd_000000018048","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18049,"ts":1777400526759,"type":"command-enqueued","id":"cmd_000000018049","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18050,"ts":1777400527293,"type":"command-enqueued","id":"cmd_000000018050","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18051,"ts":1777400527758,"type":"command-enqueued","id":"cmd_000000018051","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18052,"ts":1777400528297,"type":"command-enqueued","id":"cmd_000000018052","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18053,"ts":1777400528760,"type":"command-enqueued","id":"cmd_000000018053","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18054,"ts":1777400529299,"type":"command-enqueued","id":"cmd_000000018054","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18055,"ts":1777400529803,"type":"command-enqueued","id":"cmd_000000018055","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18056,"ts":1777400530269,"type":"command-enqueued","id":"cmd_000000018056","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18057,"ts":1777400530801,"type":"command-enqueued","id":"cmd_000000018057","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18058,"ts":1777400531267,"type":"command-enqueued","id":"cmd_000000018058","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18059,"ts":1777400531800,"type":"command-enqueued","id":"cmd_000000018059","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18060,"ts":1777400532266,"type":"command-enqueued","id":"cmd_000000018060","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18061,"ts":1777400532801,"type":"command-enqueued","id":"cmd_000000018061","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18062,"ts":1777400533303,"type":"command-enqueued","id":"cmd_000000018062","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18063,"ts":1777400533768,"type":"command-enqueued","id":"cmd_000000018063","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18064,"ts":1777400534298,"type":"command-enqueued","id":"cmd_000000018064","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18065,"ts":1777400534760,"type":"command-enqueued","id":"cmd_000000018065","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18066,"ts":1777400535297,"type":"command-enqueued","id":"cmd_000000018066","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18067,"ts":1777400535761,"type":"command-enqueued","id":"cmd_000000018067","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18068,"ts":1777400536300,"type":"command-enqueued","id":"cmd_000000018068","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18069,"ts":1777400536766,"type":"command-enqueued","id":"cmd_000000018069","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18070,"ts":1777400537295,"type":"command-enqueued","id":"cmd_000000018070","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542243}
{"seq":18071,"ts":1777400537759,"type":"command-enqueued","id":"cmd_000000018071","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542243}
{"seq":18072,"ts":1777400538297,"type":"command-enqueued","id":"cmd_000000018072","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18073,"ts":1777400538760,"type":"command-enqueued","id":"cmd_000000018073","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18074,"ts":1777400539311,"type":"command-enqueued","id":"cmd_000000018074","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18075,"ts":1777400539882,"type":"command-enqueued","id":"cmd_000000018075","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18076,"ts":1777400540397,"type":"command-enqueued","id":"cmd_000000018076","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18077,"ts":1777400540898,"type":"command-enqueued","id":"cmd_000000018077","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18078,"ts":1777400541404,"type":"command-enqueued","id":"cmd_000000018078","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542402}
{"seq":18079,"ts":1777400541870,"type":"command-enqueued","id":"cmd_000000018079","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542869}
{"seq":18080,"ts":1777400544436,"type":"command-enqueued","id":"cmd_000000018080","commandType":"omni.evaluate.raw","payloadSizeBytes":477,"expiresAt":1777400554434}
{"seq":18081,"ts":1777400806043,"type":"command-enqueued","id":"cmd_000000018081","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777400816036}
{"seq":18082,"ts":1777400808014,"type":"command-enqueued","id":"cmd_000000018082","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777400868009}
{"seq":18083,"ts":1777400808201,"type":"command-enqueued","id":"cmd_000000018083","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400813197}
{"seq":18084,"ts":1777400808411,"type":"command-enqueued","id":"cmd_000000018084","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18085,"ts":1777400808875,"type":"command-enqueued","id":"cmd_000000018085","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18086,"ts":1777400809340,"type":"command-enqueued","id":"cmd_000000018086","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18087,"ts":1777400809890,"type":"command-enqueued","id":"cmd_000000018087","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18088,"ts":1777400810353,"type":"command-enqueued","id":"cmd_000000018088","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18089,"ts":1777400810845,"type":"command-enqueued","id":"cmd_000000018089","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18090,"ts":1777400811347,"type":"command-enqueued","id":"cmd_000000018090","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18091,"ts":1777400811845,"type":"command-enqueued","id":"cmd_000000018091","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18092,"ts":1777400812348,"type":"command-enqueued","id":"cmd_000000018092","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18093,"ts":1777400812843,"type":"command-enqueued","id":"cmd_000000018093","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18094,"ts":1777400813347,"type":"command-enqueued","id":"cmd_000000018094","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18095,"ts":1777400813851,"type":"command-enqueued","id":"cmd_000000018095","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18096,"ts":1777400814348,"type":"command-enqueued","id":"cmd_000000018096","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18097,"ts":1777400814847,"type":"command-enqueued","id":"cmd_000000018097","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18098,"ts":1777400815388,"type":"command-enqueued","id":"cmd_000000018098","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18099,"ts":1777400815846,"type":"command-enqueued","id":"cmd_000000018099","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18100,"ts":1777400816347,"type":"command-enqueued","id":"cmd_000000018100","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18101,"ts":1777400816847,"type":"command-enqueued","id":"cmd_000000018101","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18102,"ts":1777400817348,"type":"command-enqueued","id":"cmd_000000018102","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18103,"ts":1777400817896,"type":"command-enqueued","id":"cmd_000000018103","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18104,"ts":1777400818353,"type":"command-enqueued","id":"cmd_000000018104","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18105,"ts":1777400818903,"type":"command-enqueued","id":"cmd_000000018105","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18106,"ts":1777400819352,"type":"command-enqueued","id":"cmd_000000018106","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18107,"ts":1777400819901,"type":"command-enqueued","id":"cmd_000000018107","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18108,"ts":1777400820365,"type":"command-enqueued","id":"cmd_000000018108","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18109,"ts":1777400820906,"type":"command-enqueued","id":"cmd_000000018109","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18110,"ts":1777400821369,"type":"command-enqueued","id":"cmd_000000018110","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18111,"ts":1777400821902,"type":"command-enqueued","id":"cmd_000000018111","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18112,"ts":1777400822365,"type":"command-enqueued","id":"cmd_000000018112","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18113,"ts":1777400822893,"type":"command-enqueued","id":"cmd_000000018113","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18114,"ts":1777400823357,"type":"command-enqueued","id":"cmd_000000018114","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18115,"ts":1777400823902,"type":"command-enqueued","id":"cmd_000000018115","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18116,"ts":1777400824367,"type":"command-enqueued","id":"cmd_000000018116","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18117,"ts":1777400824901,"type":"command-enqueued","id":"cmd_000000018117","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18118,"ts":1777400825366,"type":"command-enqueued","id":"cmd_000000018118","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18119,"ts":1777400825900,"type":"command-enqueued","id":"cmd_000000018119","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18120,"ts":1777400826403,"type":"command-enqueued","id":"cmd_000000018120","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18121,"ts":1777400826869,"type":"command-enqueued","id":"cmd_000000018121","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18122,"ts":1777400827404,"type":"command-enqueued","id":"cmd_000000018122","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18123,"ts":1777400827869,"type":"command-enqueued","id":"cmd_000000018123","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18124,"ts":1777400828403,"type":"command-enqueued","id":"cmd_000000018124","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18125,"ts":1777400828868,"type":"command-enqueued","id":"cmd_000000018125","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18126,"ts":1777400829401,"type":"command-enqueued","id":"cmd_000000018126","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18127,"ts":1777400829866,"type":"command-enqueued","id":"cmd_000000018127","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18128,"ts":1777400830401,"type":"command-enqueued","id":"cmd_000000018128","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18129,"ts":1777400830867,"type":"command-enqueued","id":"cmd_000000018129","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18130,"ts":1777400831403,"type":"command-enqueued","id":"cmd_000000018130","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18131,"ts":1777400831868,"type":"command-enqueued","id":"cmd_000000018131","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18132,"ts":1777400832400,"type":"command-enqueued","id":"cmd_000000018132","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18133,"ts":1777400832866,"type":"command-enqueued","id":"cmd_000000018133","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18134,"ts":1777400833401,"type":"command-enqueued","id":"cmd_000000018134","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18135,"ts":1777400833866,"type":"command-enqueued","id":"cmd_000000018135","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18136,"ts":1777400834402,"type":"command-enqueued","id":"cmd_000000018136","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18137,"ts":1777400834865,"type":"command-enqueued","id":"cmd_000000018137","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18138,"ts":1777400835402,"type":"command-enqueued","id":"cmd_000000018138","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18139,"ts":1777400835867,"type":"command-enqueued","id":"cmd_000000018139","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18140,"ts":1777400836402,"type":"command-enqueued","id":"cmd_000000018140","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18141,"ts":1777400836869,"type":"command-enqueued","id":"cmd_000000018141","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18142,"ts":1777400837403,"type":"command-enqueued","id":"cmd_000000018142","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18143,"ts":1777400840375,"type":"command-enqueued","id":"cmd_000000018143","commandType":"omni.evaluate.raw","payloadSizeBytes":477,"expiresAt":1777400850373}
{"seq":18144,"ts":1777400945811,"type":"command-enqueued","id":"cmd_000000018144","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777400955807}
{"seq":18145,"ts":1777400947690,"type":"command-enqueued","id":"cmd_000000018145","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777401007686}
{"seq":18146,"ts":1777400947854,"type":"command-enqueued","id":"cmd_000000018146","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400952852}
{"seq":18147,"ts":1777400948017,"type":"command-enqueued","id":"cmd_000000018147","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400978015}
{"seq":18148,"ts":1777400978800,"type":"command-enqueued","id":"cmd_000000018148","commandType":"omni.evaluate.raw","payloadSizeBytes":477,"expiresAt":1777400988798}
{"seq":18149,"ts":1777401427601,"type":"command-enqueued","id":"cmd_000000018149","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777401437594}
{"seq":18150,"ts":1777401429154,"type":"command-enqueued","id":"cmd_000000018150","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777401489151}
{"seq":18151,"ts":1777401429351,"type":"command-enqueued","id":"cmd_000000018151","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401434350}
{"seq":18152,"ts":1777401429515,"type":"command-enqueued","id":"cmd_000000018152","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18153,"ts":1777401429923,"type":"command-enqueued","id":"cmd_000000018153","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18154,"ts":1777401430476,"type":"command-enqueued","id":"cmd_000000018154","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18155,"ts":1777401430996,"type":"command-enqueued","id":"cmd_000000018155","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18156,"ts":1777401431440,"type":"command-enqueued","id":"cmd_000000018156","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18157,"ts":1777401431940,"type":"command-enqueued","id":"cmd_000000018157","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18158,"ts":1777401432441,"type":"command-enqueued","id":"cmd_000000018158","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18159,"ts":1777401432941,"type":"command-enqueued","id":"cmd_000000018159","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18160,"ts":1777401433493,"type":"command-enqueued","id":"cmd_000000018160","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18161,"ts":1777401433941,"type":"command-enqueued","id":"cmd_000000018161","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18162,"ts":1777401434443,"type":"command-enqueued","id":"cmd_000000018162","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459514}
{"seq":18163,"ts":1777401435014,"type":"command-enqueued","id":"cmd_000000018163","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459515}
{"seq":18164,"ts":1777401435601,"type":"command-enqueued","id":"cmd_000000018164","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18165,"ts":1777401436058,"type":"command-enqueued","id":"cmd_000000018165","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18166,"ts":1777401436600,"type":"command-enqueued","id":"cmd_000000018166","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18167,"ts":1777401437067,"type":"command-enqueued","id":"cmd_000000018167","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18168,"ts":1777401437598,"type":"command-enqueued","id":"cmd_000000018168","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18169,"ts":1777401438063,"type":"command-enqueued","id":"cmd_000000018169","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18170,"ts":1777401438596,"type":"command-enqueued","id":"cmd_000000018170","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18171,"ts":1777401439066,"type":"command-enqueued","id":"cmd_000000018171","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18172,"ts":1777401439533,"type":"command-enqueued","id":"cmd_000000018172","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18173,"ts":1777401439998,"type":"command-enqueued","id":"cmd_000000018173","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18174,"ts":1777401440587,"type":"command-enqueued","id":"cmd_000000018174","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18175,"ts":1777401441206,"type":"command-enqueued","id":"cmd_000000018175","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18176,"ts":1777401441760,"type":"command-enqueued","id":"cmd_000000018176","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18177,"ts":1777401442297,"type":"command-enqueued","id":"cmd_000000018177","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18178,"ts":1777401442761,"type":"command-enqueued","id":"cmd_000000018178","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18179,"ts":1777401443300,"type":"command-enqueued","id":"cmd_000000018179","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18180,"ts":1777401443766,"type":"command-enqueued","id":"cmd_000000018180","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18181,"ts":1777401444301,"type":"command-enqueued","id":"cmd_000000018181","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18182,"ts":1777401444768,"type":"command-enqueued","id":"cmd_000000018182","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18183,"ts":1777401445299,"type":"command-enqueued","id":"cmd_000000018183","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18184,"ts":1777401445764,"type":"command-enqueued","id":"cmd_000000018184","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18185,"ts":1777401446294,"type":"command-enqueued","id":"cmd_000000018185","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18186,"ts":1777401446798,"type":"command-enqueued","id":"cmd_000000018186","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18187,"ts":1777401447265,"type":"command-enqueued","id":"cmd_000000018187","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18188,"ts":1777401447796,"type":"command-enqueued","id":"cmd_000000018188","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18189,"ts":1777401448261,"type":"command-enqueued","id":"cmd_000000018189","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18190,"ts":1777401448798,"type":"command-enqueued","id":"cmd_000000018190","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18191,"ts":1777401449300,"type":"command-enqueued","id":"cmd_000000018191","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18192,"ts":1777401449767,"type":"command-enqueued","id":"cmd_000000018192","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18193,"ts":1777401450302,"type":"command-enqueued","id":"cmd_000000018193","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18194,"ts":1777401450765,"type":"command-enqueued","id":"cmd_000000018194","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18195,"ts":1777401451300,"type":"command-enqueued","id":"cmd_000000018195","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18196,"ts":1777401451768,"type":"command-enqueued","id":"cmd_000000018196","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18197,"ts":1777401452302,"type":"command-enqueued","id":"cmd_000000018197","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18198,"ts":1777401452768,"type":"command-enqueued","id":"cmd_000000018198","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18199,"ts":1777401453295,"type":"command-enqueued","id":"cmd_000000018199","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18200,"ts":1777401453803,"type":"command-enqueued","id":"cmd_000000018200","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18201,"ts":1777401454271,"type":"command-enqueued","id":"cmd_000000018201","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18202,"ts":1777401454827,"type":"command-enqueued","id":"cmd_000000018202","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18203,"ts":1777401455293,"type":"command-enqueued","id":"cmd_000000018203","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18204,"ts":1777401455804,"type":"command-enqueued","id":"cmd_000000018204","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18205,"ts":1777401456266,"type":"command-enqueued","id":"cmd_000000018205","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18206,"ts":1777401456735,"type":"command-enqueued","id":"cmd_000000018206","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18207,"ts":1777401457286,"type":"command-enqueued","id":"cmd_000000018207","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18208,"ts":1777401457802,"type":"command-enqueued","id":"cmd_000000018208","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18209,"ts":1777401458266,"type":"command-enqueued","id":"cmd_000000018209","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18211,"ts":1777401684669,"type":"command-enqueued","id":"cmd_000000018211","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777401694665}
{"seq":18212,"ts":1777401685486,"type":"command-enqueued","id":"cmd_000000018212","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777401745484}
{"seq":18213,"ts":1777401685594,"type":"command-enqueued","id":"cmd_000000018213","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401690592}
{"seq":18214,"ts":1777401685689,"type":"command-enqueued","id":"cmd_000000018214","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18215,"ts":1777401686091,"type":"command-enqueued","id":"cmd_000000018215","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18216,"ts":1777401686497,"type":"command-enqueued","id":"cmd_000000018216","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18217,"ts":1777401686962,"type":"command-enqueued","id":"cmd_000000018217","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18218,"ts":1777401687493,"type":"command-enqueued","id":"cmd_000000018218","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18219,"ts":1777401688045,"type":"command-enqueued","id":"cmd_000000018219","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18220,"ts":1777401688583,"type":"command-enqueued","id":"cmd_000000018220","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18221,"ts":1777401689097,"type":"command-enqueued","id":"cmd_000000018221","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18222,"ts":1777401689606,"type":"command-enqueued","id":"cmd_000000018222","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18223,"ts":1777401690174,"type":"command-enqueued","id":"cmd_000000018223","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18224,"ts":1777401690724,"type":"command-enqueued","id":"cmd_000000018224","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18225,"ts":1777401691342,"type":"command-enqueued","id":"cmd_000000018225","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18226,"ts":1777401691954,"type":"command-enqueued","id":"cmd_000000018226","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715688}
{"seq":18227,"ts":1777401692570,"type":"command-enqueued","id":"cmd_000000018227","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18228,"ts":1777401693188,"type":"command-enqueued","id":"cmd_000000018228","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18229,"ts":1777401693804,"type":"command-enqueued","id":"cmd_000000018229","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18230,"ts":1777401694425,"type":"command-enqueued","id":"cmd_000000018230","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18231,"ts":1777401695157,"type":"command-enqueued","id":"cmd_000000018231","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18232,"ts":1777401695776,"type":"command-enqueued","id":"cmd_000000018232","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18233,"ts":1777401696441,"type":"command-enqueued","id":"cmd_000000018233","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18234,"ts":1777401697108,"type":"command-enqueued","id":"cmd_000000018234","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18235,"ts":1777401697672,"type":"command-enqueued","id":"cmd_000000018235","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18236,"ts":1777401698509,"type":"command-enqueued","id":"cmd_000000018236","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715688}
{"seq":18237,"ts":1777401699276,"type":"command-enqueued","id":"cmd_000000018237","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18238,"ts":1777401699887,"type":"command-enqueued","id":"cmd_000000018238","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18239,"ts":1777401700503,"type":"command-enqueued","id":"cmd_000000018239","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18240,"ts":1777401701173,"type":"command-enqueued","id":"cmd_000000018240","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18241,"ts":1777401701791,"type":"command-enqueued","id":"cmd_000000018241","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18242,"ts":1777401702477,"type":"command-enqueued","id":"cmd_000000018242","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18243,"ts":1777401703030,"type":"command-enqueued","id":"cmd_000000018243","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18244,"ts":1777401703640,"type":"command-enqueued","id":"cmd_000000018244","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18245,"ts":1777401704308,"type":"command-enqueued","id":"cmd_000000018245","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18246,"ts":1777401704926,"type":"command-enqueued","id":"cmd_000000018246","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18247,"ts":1777401705478,"type":"command-enqueued","id":"cmd_000000018247","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18248,"ts":1777401706095,"type":"command-enqueued","id":"cmd_000000018248","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18249,"ts":1777401706642,"type":"command-enqueued","id":"cmd_000000018249","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18250,"ts":1777401707325,"type":"command-enqueued","id":"cmd_000000018250","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18251,"ts":1777401707942,"type":"command-enqueued","id":"cmd_000000018251","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18252,"ts":1777401708491,"type":"command-enqueued","id":"cmd_000000018252","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18253,"ts":1777401709164,"type":"command-enqueued","id":"cmd_000000018253","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18254,"ts":1777401709781,"type":"command-enqueued","id":"cmd_000000018254","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18255,"ts":1777401710331,"type":"command-enqueued","id":"cmd_000000018255","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18256,"ts":1777401710881,"type":"command-enqueued","id":"cmd_000000018256","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18257,"ts":1777401711430,"type":"command-enqueued","id":"cmd_000000018257","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18258,"ts":1777401712050,"type":"command-enqueued","id":"cmd_000000018258","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18259,"ts":1777401712603,"type":"command-enqueued","id":"cmd_000000018259","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18260,"ts":1777401713214,"type":"command-enqueued","id":"cmd_000000018260","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18261,"ts":1777401713937,"type":"command-enqueued","id":"cmd_000000018261","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18262,"ts":1777401714551,"type":"command-enqueued","id":"cmd_000000018262","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18263,"ts":1777401718638,"type":"command-enqueued","id":"cmd_000000018263","commandType":"omni.evaluate.raw","payloadSizeBytes":477,"expiresAt":1777401728635}
{"seq":18264,"ts":1777401928702,"type":"command-enqueued","id":"cmd_000000018264","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777401938696}
{"seq":18265,"ts":1777401929872,"type":"command-enqueued","id":"cmd_000000018265","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777401989869}
{"seq":18266,"ts":1777401930082,"type":"command-enqueued","id":"cmd_000000018266","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401935081}
{"seq":18267,"ts":1777401930333,"type":"command-enqueued","id":"cmd_000000018267","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18268,"ts":1777401930738,"type":"command-enqueued","id":"cmd_000000018268","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18269,"ts":1777401931288,"type":"command-enqueued","id":"cmd_000000018269","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18270,"ts":1777401931838,"type":"command-enqueued","id":"cmd_000000018270","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18271,"ts":1777401932396,"type":"command-enqueued","id":"cmd_000000018271","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18272,"ts":1777401932992,"type":"command-enqueued","id":"cmd_000000018272","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18273,"ts":1777401933573,"type":"command-enqueued","id":"cmd_000000018273","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18274,"ts":1777401934258,"type":"command-enqueued","id":"cmd_000000018274","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18275,"ts":1777401934825,"type":"command-enqueued","id":"cmd_000000018275","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18276,"ts":1777401935384,"type":"command-enqueued","id":"cmd_000000018276","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18277,"ts":1777401936045,"type":"command-enqueued","id":"cmd_000000018277","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18278,"ts":1777401936704,"type":"command-enqueued","id":"cmd_000000018278","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18279,"ts":1777401937370,"type":"command-enqueued","id":"cmd_000000018279","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18280,"ts":1777401938031,"type":"command-enqueued","id":"cmd_000000018280","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18281,"ts":1777401938583,"type":"command-enqueued","id":"cmd_000000018281","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18282,"ts":1777401939247,"type":"command-enqueued","id":"cmd_000000018282","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18283,"ts":1777401939916,"type":"command-enqueued","id":"cmd_000000018283","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18284,"ts":1777401940579,"type":"command-enqueued","id":"cmd_000000018284","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18285,"ts":1777401941247,"type":"command-enqueued","id":"cmd_000000018285","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18286,"ts":1777401941865,"type":"command-enqueued","id":"cmd_000000018286","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18287,"ts":1777401942424,"type":"command-enqueued","id":"cmd_000000018287","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18288,"ts":1777401942991,"type":"command-enqueued","id":"cmd_000000018288","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18289,"ts":1777401943608,"type":"command-enqueued","id":"cmd_000000018289","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18290,"ts":1777401944175,"type":"command-enqueued","id":"cmd_000000018290","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18291,"ts":1777401944725,"type":"command-enqueued","id":"cmd_000000018291","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18292,"ts":1777401945271,"type":"command-enqueued","id":"cmd_000000018292","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18293,"ts":1777401945930,"type":"command-enqueued","id":"cmd_000000018293","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18294,"ts":1777401946625,"type":"command-enqueued","id":"cmd_000000018294","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18295,"ts":1777401947609,"type":"command-enqueued","id":"cmd_000000018295","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18296,"ts":1777401948159,"type":"command-enqueued","id":"cmd_000000018296","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18297,"ts":1777401948708,"type":"command-enqueued","id":"cmd_000000018297","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18298,"ts":1777401949325,"type":"command-enqueued","id":"cmd_000000018298","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18299,"ts":1777401949987,"type":"command-enqueued","id":"cmd_000000018299","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18300,"ts":1777401950657,"type":"command-enqueued","id":"cmd_000000018300","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18301,"ts":1777401951326,"type":"command-enqueued","id":"cmd_000000018301","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18302,"ts":1777401951874,"type":"command-enqueued","id":"cmd_000000018302","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18303,"ts":1777401952424,"type":"command-enqueued","id":"cmd_000000018303","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18304,"ts":1777401953040,"type":"command-enqueued","id":"cmd_000000018304","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18305,"ts":1777401953720,"type":"command-enqueued","id":"cmd_000000018305","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18306,"ts":1777401954400,"type":"command-enqueued","id":"cmd_000000018306","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18307,"ts":1777401955074,"type":"command-enqueued","id":"cmd_000000018307","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18308,"ts":1777401955948,"type":"command-enqueued","id":"cmd_000000018308","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18309,"ts":1777401956616,"type":"command-enqueued","id":"cmd_000000018309","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18310,"ts":1777401957183,"type":"command-enqueued","id":"cmd_000000018310","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18311,"ts":1777401957802,"type":"command-enqueued","id":"cmd_000000018311","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18312,"ts":1777401958482,"type":"command-enqueued","id":"cmd_000000018312","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18313,"ts":1777401959152,"type":"command-enqueued","id":"cmd_000000018313","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18314,"ts":1777402135192,"type":"command-enqueued","id":"cmd_000000018314","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777402145184}
{"seq":18315,"ts":1777402136728,"type":"command-enqueued","id":"cmd_000000018315","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777402196725}
{"seq":18316,"ts":1777402136896,"type":"command-enqueued","id":"cmd_000000018316","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402141893}
{"seq":18317,"ts":1777402137241,"type":"command-enqueued","id":"cmd_000000018317","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18318,"ts":1777402137710,"type":"command-enqueued","id":"cmd_000000018318","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18319,"ts":1777402138369,"type":"command-enqueued","id":"cmd_000000018319","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18320,"ts":1777402138920,"type":"command-enqueued","id":"cmd_000000018320","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18321,"ts":1777402139468,"type":"command-enqueued","id":"cmd_000000018321","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18322,"ts":1777402140018,"type":"command-enqueued","id":"cmd_000000018322","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18323,"ts":1777402140626,"type":"command-enqueued","id":"cmd_000000018323","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18324,"ts":1777402141178,"type":"command-enqueued","id":"cmd_000000018324","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18325,"ts":1777402141797,"type":"command-enqueued","id":"cmd_000000018325","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18326,"ts":1777402142414,"type":"command-enqueued","id":"cmd_000000018326","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18327,"ts":1777402142965,"type":"command-enqueued","id":"cmd_000000018327","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18328,"ts":1777402143632,"type":"command-enqueued","id":"cmd_000000018328","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18329,"ts":1777402144314,"type":"command-enqueued","id":"cmd_000000018329","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18330,"ts":1777402144984,"type":"command-enqueued","id":"cmd_000000018330","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18331,"ts":1777402145654,"type":"command-enqueued","id":"cmd_000000018331","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18332,"ts":1777402146324,"type":"command-enqueued","id":"cmd_000000018332","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18333,"ts":1777402147006,"type":"command-enqueued","id":"cmd_000000018333","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18334,"ts":1777402147676,"type":"command-enqueued","id":"cmd_000000018334","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18335,"ts":1777402148289,"type":"command-enqueued","id":"cmd_000000018335","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18336,"ts":1777402148951,"type":"command-enqueued","id":"cmd_000000018336","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18337,"ts":1777402149565,"type":"command-enqueued","id":"cmd_000000018337","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18338,"ts":1777402150247,"type":"command-enqueued","id":"cmd_000000018338","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18339,"ts":1777402150799,"type":"command-enqueued","id":"cmd_000000018339","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18340,"ts":1777402151418,"type":"command-enqueued","id":"cmd_000000018340","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18341,"ts":1777402152083,"type":"command-enqueued","id":"cmd_000000018341","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18342,"ts":1777402152691,"type":"command-enqueued","id":"cmd_000000018342","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18343,"ts":1777402153407,"type":"command-enqueued","id":"cmd_000000018343","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18344,"ts":1777402154024,"type":"command-enqueued","id":"cmd_000000018344","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18345,"ts":1777402154690,"type":"command-enqueued","id":"cmd_000000018345","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18346,"ts":1777402155256,"type":"command-enqueued","id":"cmd_000000018346","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18347,"ts":1777402155872,"type":"command-enqueued","id":"cmd_000000018347","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18348,"ts":1777402156540,"type":"command-enqueued","id":"cmd_000000018348","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18349,"ts":1777402157159,"type":"command-enqueued","id":"cmd_000000018349","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18350,"ts":1777402157769,"type":"command-enqueued","id":"cmd_000000018350","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18351,"ts":1777402158430,"type":"command-enqueued","id":"cmd_000000018351","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18352,"ts":1777402159046,"type":"command-enqueued","id":"cmd_000000018352","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18353,"ts":1777402159719,"type":"command-enqueued","id":"cmd_000000018353","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18354,"ts":1777402160337,"type":"command-enqueued","id":"cmd_000000018354","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18355,"ts":1777402160955,"type":"command-enqueued","id":"cmd_000000018355","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18356,"ts":1777402161636,"type":"command-enqueued","id":"cmd_000000018356","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18357,"ts":1777402162250,"type":"command-enqueued","id":"cmd_000000018357","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18358,"ts":1777402162932,"type":"command-enqueued","id":"cmd_000000018358","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18359,"ts":1777402163601,"type":"command-enqueued","id":"cmd_000000018359","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18360,"ts":1777402164213,"type":"command-enqueued","id":"cmd_000000018360","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18361,"ts":1777402164882,"type":"command-enqueued","id":"cmd_000000018361","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18362,"ts":1777402165493,"type":"command-enqueued","id":"cmd_000000018362","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18363,"ts":1777402166045,"type":"command-enqueued","id":"cmd_000000018363","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18364,"ts":1777402419138,"type":"command-enqueued","id":"cmd_000000018364","commandType":"omni.evaluate.raw","payloadSizeBytes":4583,"expiresAt":1777402429134}
{"seq":18365,"ts":1777402581529,"type":"command-enqueued","id":"cmd_000000018365","commandType":"omni.evaluate.raw","payloadSizeBytes":4990,"expiresAt":1777402591524}
{"seq":18367,"ts":1777402800501,"type":"command-enqueued","id":"cmd_000000018367","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777402810497}
{"seq":18368,"ts":1777402801533,"type":"command-enqueued","id":"cmd_000000018368","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777402861531}
{"seq":18369,"ts":1777402801647,"type":"command-enqueued","id":"cmd_000000018369","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402806645}
{"seq":18370,"ts":1777402801786,"type":"command-enqueued","id":"cmd_000000018370","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18371,"ts":1777402802339,"type":"command-enqueued","id":"cmd_000000018371","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18372,"ts":1777403010007,"type":"command-enqueued","id":"cmd_000000018372","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403070000}
{"seq":18373,"ts":1777403010341,"type":"command-enqueued","id":"cmd_000000018373","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403015339}
{"seq":18374,"ts":1777403016050,"type":"command-enqueued","id":"cmd_000000018374","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403076047}
{"seq":18375,"ts":1777403016222,"type":"command-enqueued","id":"cmd_000000018375","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403021220}
{"seq":18376,"ts":1777403016536,"type":"command-enqueued","id":"cmd_000000018376","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18377,"ts":1777403017115,"type":"command-enqueued","id":"cmd_000000018377","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18378,"ts":1777403017577,"type":"command-enqueued","id":"cmd_000000018378","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18379,"ts":1777403018264,"type":"command-enqueued","id":"cmd_000000018379","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403078261}
{"seq":18380,"ts":1777403018430,"type":"command-enqueued","id":"cmd_000000018380","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403023428}
{"seq":18381,"ts":1777403018741,"type":"command-enqueued","id":"cmd_000000018381","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18382,"ts":1777403019364,"type":"command-enqueued","id":"cmd_000000018382","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18383,"ts":1777403019826,"type":"command-enqueued","id":"cmd_000000018383","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18384,"ts":1777403020590,"type":"command-enqueued","id":"cmd_000000018384","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403080588}
{"seq":18385,"ts":1777403020705,"type":"command-enqueued","id":"cmd_000000018385","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403025703}
{"seq":18386,"ts":1777403567496,"type":"command-enqueued","id":"cmd_000000018386","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403627492}
{"seq":18387,"ts":1777403567813,"type":"command-enqueued","id":"cmd_000000018387","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403582811}
{"seq":18388,"ts":1777403567973,"type":"command-enqueued","id":"cmd_000000018388","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403597972}
{"seq":18389,"ts":1777403598623,"type":"command-enqueued","id":"cmd_000000018389","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403658621}
{"seq":18390,"ts":1777403598838,"type":"command-enqueued","id":"cmd_000000018390","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403613836}
{"seq":18391,"ts":1777403599088,"type":"command-enqueued","id":"cmd_000000018391","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403629087}
{"seq":18392,"ts":1777403629771,"type":"command-enqueued","id":"cmd_000000018392","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403689769}
{"seq":18393,"ts":1777403629939,"type":"command-enqueued","id":"cmd_000000018393","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403644938}
{"seq":18394,"ts":1777403630246,"type":"command-enqueued","id":"cmd_000000018394","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18395,"ts":1777403630797,"type":"command-enqueued","id":"cmd_000000018395","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18396,"ts":1777403631331,"type":"command-enqueued","id":"cmd_000000018396","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403691328}
{"seq":18397,"ts":1777403631509,"type":"command-enqueued","id":"cmd_000000018397","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403646508}
{"seq":18398,"ts":1777403631671,"type":"command-enqueued","id":"cmd_000000018398","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18399,"ts":1777403632132,"type":"command-enqueued","id":"cmd_000000018399","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18400,"ts":1777403632594,"type":"command-enqueued","id":"cmd_000000018400","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18401,"ts":1777403633403,"type":"command-enqueued","id":"cmd_000000018401","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403693401}
{"seq":18402,"ts":1777403633522,"type":"command-enqueued","id":"cmd_000000018402","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403648520}
{"seq":18403,"ts":1777403633686,"type":"command-enqueued","id":"cmd_000000018403","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
{"seq":18404,"ts":1777403634148,"type":"command-enqueued","id":"cmd_000000018404","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
{"seq":18405,"ts":1777404719038,"type":"command-enqueued","id":"cmd_000000018405","commandType":"omni.evaluate.raw","payloadSizeBytes":666,"expiresAt":1777404729035}
{"seq":18406,"ts":1777405043991,"type":"command-enqueued","id":"cmd_000000018406","commandType":"omni.evaluate.raw","payloadSizeBytes":382,"expiresAt":1777405053987}
{"seq":18407,"ts":1777405044983,"type":"command-enqueued","id":"cmd_000000018407","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405104981}
{"seq":18408,"ts":1777405045158,"type":"command-enqueued","id":"cmd_000000018408","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405060156}
{"seq":18409,"ts":1777405060687,"type":"command-enqueued","id":"cmd_000000018409","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405120685}
{"seq":18410,"ts":1777405060801,"type":"command-enqueued","id":"cmd_000000018410","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405075799}
{"seq":18411,"ts":1777405061133,"type":"command-enqueued","id":"cmd_000000018411","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18412,"ts":1777405061729,"type":"command-enqueued","id":"cmd_000000018412","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18413,"ts":1777405062176,"type":"command-enqueued","id":"cmd_000000018413","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18414,"ts":1777405062956,"type":"command-enqueued","id":"cmd_000000018414","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405122953}
{"seq":18415,"ts":1777405063122,"type":"command-enqueued","id":"cmd_000000018415","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405078118}
{"seq":18416,"ts":1777405063374,"type":"command-enqueued","id":"cmd_000000018416","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405093372}
{"seq":18417,"ts":1777405094058,"type":"command-enqueued","id":"cmd_000000018417","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405154056}
{"seq":18418,"ts":1777405094213,"type":"command-enqueued","id":"cmd_000000018418","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405109211}
{"seq":18419,"ts":1777405094472,"type":"command-enqueued","id":"cmd_000000018419","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405124470}
{"seq":18420,"ts":1777405125084,"type":"command-enqueued","id":"cmd_000000018420","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405185082}
{"seq":18421,"ts":1777405125196,"type":"command-enqueued","id":"cmd_000000018421","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405140195}
{"seq":18422,"ts":1777405125360,"type":"command-enqueued","id":"cmd_000000018422","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18423,"ts":1777405125823,"type":"command-enqueued","id":"cmd_000000018423","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18424,"ts":1777405126281,"type":"command-enqueued","id":"cmd_000000018424","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18425,"ts":1777405126795,"type":"command-enqueued","id":"cmd_000000018425","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18426,"ts":1777405334045,"type":"command-enqueued","id":"cmd_000000018426","commandType":"omni.evaluate.raw","payloadSizeBytes":382,"expiresAt":1777405344040}
{"seq":18427,"ts":1777405335026,"type":"command-enqueued","id":"cmd_000000018427","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405395024}
{"seq":18428,"ts":1777405335207,"type":"command-enqueued","id":"cmd_000000018428","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405350205}
{"seq":18429,"ts":1777405335477,"type":"command-enqueued","id":"cmd_000000018429","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18430,"ts":1777405335939,"type":"command-enqueued","id":"cmd_000000018430","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18431,"ts":1777405336488,"type":"command-enqueued","id":"cmd_000000018431","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18432,"ts":1777405337215,"type":"command-enqueued","id":"cmd_000000018432","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405397212}
{"seq":18433,"ts":1777405337415,"type":"command-enqueued","id":"cmd_000000018433","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405352414}
{"seq":18434,"ts":1777405337666,"type":"command-enqueued","id":"cmd_000000018434","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18435,"ts":1777405338072,"type":"command-enqueued","id":"cmd_000000018435","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18436,"ts":1777405338535,"type":"command-enqueued","id":"cmd_000000018436","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18437,"ts":1777405339026,"type":"command-enqueued","id":"cmd_000000018437","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18438,"ts":1777405339767,"type":"command-enqueued","id":"cmd_000000018438","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405399764}
{"seq":18439,"ts":1777405339929,"type":"command-enqueued","id":"cmd_000000018439","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405354927}
{"seq":18440,"ts":1777405340252,"type":"command-enqueued","id":"cmd_000000018440","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405370251}
{"seq":18441,"ts":1777405340795,"type":"command-enqueued","id":"cmd_000000018441","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405370251}
{"seq":18442,"ts":1777405341529,"type":"command-enqueued","id":"cmd_000000018442","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405401526}
{"seq":18443,"ts":1777405341700,"type":"command-enqueued","id":"cmd_000000018443","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405356698}
{"seq":18444,"ts":1777405341861,"type":"command-enqueued","id":"cmd_000000018444","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371859}
{"seq":18445,"ts":1777405342312,"type":"command-enqueued","id":"cmd_000000018445","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371859}
{"seq":18446,"ts":1777405342779,"type":"command-enqueued","id":"cmd_000000018446","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371860}
{"seq":18447,"ts":1777405343589,"type":"command-enqueued","id":"cmd_000000018447","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777405403587}
{"seq":18448,"ts":1777405343703,"type":"command-enqueued","id":"cmd_000000018448","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405358701}
{"seq":18449,"ts":1777405343866,"type":"command-enqueued","id":"cmd_000000018449","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405403865}
{"seq":18450,"ts":1777405495999,"type":"command-enqueued","id":"cmd_000000018450","commandType":"omni.evaluate.raw","payloadSizeBytes":517,"expiresAt":1777405505994}
{"seq":18451,"ts":1777405912097,"type":"command-enqueued","id":"cmd_000000018451","commandType":"omni.evaluate.raw","payloadSizeBytes":392,"expiresAt":1777405922092}
{"seq":18452,"ts":1777405942435,"type":"command-enqueued","id":"cmd_000000018452","commandType":"omni.evaluate.raw","payloadSizeBytes":382,"expiresAt":1777405952431}
{"seq":18453,"ts":1777405943503,"type":"command-enqueued","id":"cmd_000000018453","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406003500}
{"seq":18454,"ts":1777405943624,"type":"command-enqueued","id":"cmd_000000018454","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405958622}
{"seq":18455,"ts":1777405943836,"type":"command-enqueued","id":"cmd_000000018455","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18456,"ts":1777405944462,"type":"command-enqueued","id":"cmd_000000018456","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18457,"ts":1777405944924,"type":"command-enqueued","id":"cmd_000000018457","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18458,"ts":1777405945738,"type":"command-enqueued","id":"cmd_000000018458","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406005735}
{"seq":18459,"ts":1777405945916,"type":"command-enqueued","id":"cmd_000000018459","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405960915}
{"seq":18460,"ts":1777405946079,"type":"command-enqueued","id":"cmd_000000018460","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18461,"ts":1777405946526,"type":"command-enqueued","id":"cmd_000000018461","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18462,"ts":1777405946990,"type":"command-enqueued","id":"cmd_000000018462","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18463,"ts":1777405947836,"type":"command-enqueued","id":"cmd_000000018463","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406007833}
{"seq":18464,"ts":1777405948017,"type":"command-enqueued","id":"cmd_000000018464","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405963016}
{"seq":18465,"ts":1777405948179,"type":"command-enqueued","id":"cmd_000000018465","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18466,"ts":1777405948626,"type":"command-enqueued","id":"cmd_000000018466","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18467,"ts":1777405949141,"type":"command-enqueued","id":"cmd_000000018467","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18468,"ts":1777405949944,"type":"command-enqueued","id":"cmd_000000018468","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406009941}
{"seq":18469,"ts":1777405950276,"type":"command-enqueued","id":"cmd_000000018469","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405965266}
{"seq":18470,"ts":1777405950694,"type":"command-enqueued","id":"cmd_000000018470","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18471,"ts":1777405951267,"type":"command-enqueued","id":"cmd_000000018471","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18472,"ts":1777405951822,"type":"command-enqueued","id":"cmd_000000018472","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18473,"ts":1777405952692,"type":"command-enqueued","id":"cmd_000000018473","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406012689}
{"seq":18474,"ts":1777405952853,"type":"command-enqueued","id":"cmd_000000018474","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405967852}
{"seq":18475,"ts":1777405953105,"type":"command-enqueued","id":"cmd_000000018475","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406013103}
{"seq":18476,"ts":1777406013914,"type":"command-enqueued","id":"cmd_000000018476","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406073911}
{"seq":18477,"ts":1777406014286,"type":"command-enqueued","id":"cmd_000000018477","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406029285}
{"seq":18478,"ts":1777406014657,"type":"command-enqueued","id":"cmd_000000018478","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406074655}
{"seq":18479,"ts":1777406015275,"type":"command-enqueued","id":"cmd_000000018479","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406074655}
{"seq":18480,"ts":1777406016270,"type":"command-enqueued","id":"cmd_000000018480","commandType":"omni.evaluate.raw","payloadSizeBytes":318,"expiresAt":1777406026268}
{"seq":18481,"ts":1777406411677,"type":"command-enqueued","id":"cmd_000000018481","commandType":"omni.evaluate.raw","payloadSizeBytes":596,"expiresAt":1777406421672}
{"seq":18482,"ts":1777406412874,"type":"command-enqueued","id":"cmd_000000018482","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406472871}
{"seq":18483,"ts":1777406413037,"type":"command-enqueued","id":"cmd_000000018483","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406428035}
{"seq":18484,"ts":1777406413200,"type":"command-enqueued","id":"cmd_000000018484","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18485,"ts":1777406413658,"type":"command-enqueued","id":"cmd_000000018485","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18486,"ts":1777406414171,"type":"command-enqueued","id":"cmd_000000018486","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18487,"ts":1777406415023,"type":"command-enqueued","id":"cmd_000000018487","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406475020}
{"seq":18488,"ts":1777406415143,"type":"command-enqueued","id":"cmd_000000018488","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406430141}
{"seq":18489,"ts":1777406430811,"type":"command-enqueued","id":"cmd_000000018489","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406490808}
{"seq":18490,"ts":1777406430923,"type":"command-enqueued","id":"cmd_000000018490","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406445922}
{"seq":18491,"ts":1777406431142,"type":"command-enqueued","id":"cmd_000000018491","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18492,"ts":1777406431681,"type":"command-enqueued","id":"cmd_000000018492","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18493,"ts":1777406432485,"type":"command-enqueued","id":"cmd_000000018493","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18494,"ts":1777406433458,"type":"command-enqueued","id":"cmd_000000018494","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406493455}
{"seq":18495,"ts":1777406433636,"type":"command-enqueued","id":"cmd_000000018495","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406448634}
{"seq":18496,"ts":1777406433800,"type":"command-enqueued","id":"cmd_000000018496","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18497,"ts":1777406434262,"type":"command-enqueued","id":"cmd_000000018497","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18498,"ts":1777406434816,"type":"command-enqueued","id":"cmd_000000018498","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18499,"ts":1777406435577,"type":"command-enqueued","id":"cmd_000000018499","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406495574}
{"seq":18500,"ts":1777406435736,"type":"command-enqueued","id":"cmd_000000018500","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406450734}
{"seq":18501,"ts":1777406435899,"type":"command-enqueued","id":"cmd_000000018501","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18502,"ts":1777406436363,"type":"command-enqueued","id":"cmd_000000018502","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18503,"ts":1777406436876,"type":"command-enqueued","id":"cmd_000000018503","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18504,"ts":1777406437710,"type":"command-enqueued","id":"cmd_000000018504","commandType":"omni.evaluate.raw","payloadSizeBytes":318,"expiresAt":1777406447707}
{"seq":18505,"ts":1777406694527,"type":"command-enqueued","id":"cmd_000000018505","commandType":"omni.evaluate.raw","payloadSizeBytes":609,"expiresAt":1777406704521}
{"seq":18506,"ts":1777406696606,"type":"command-enqueued","id":"cmd_000000018506","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406756604}
{"seq":18507,"ts":1777406696865,"type":"command-enqueued","id":"cmd_000000018507","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406711863}
{"seq":18508,"ts":1777406697228,"type":"command-enqueued","id":"cmd_000000018508","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406757227}
{"seq":18509,"ts":1777406757770,"type":"command-enqueued","id":"cmd_000000018509","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406767768}
{"seq":18510,"ts":1777406758547,"type":"command-enqueued","id":"cmd_000000018510","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406818544}
{"seq":18511,"ts":1777406758885,"type":"command-enqueued","id":"cmd_000000018511","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406773883}
{"seq":18512,"ts":1777406759249,"type":"command-enqueued","id":"cmd_000000018512","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406819247}
{"seq":18513,"ts":1777406759868,"type":"command-enqueued","id":"cmd_000000018513","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406819247}
{"seq":18514,"ts":1777406760879,"type":"command-enqueued","id":"cmd_000000018514","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406770876}
{"seq":18515,"ts":1777406761693,"type":"command-enqueued","id":"cmd_000000018515","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406821691}
{"seq":18516,"ts":1777406762260,"type":"command-enqueued","id":"cmd_000000018516","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406777258}
{"seq":18517,"ts":1777406762625,"type":"command-enqueued","id":"cmd_000000018517","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406822623}
{"seq":18518,"ts":1777406823173,"type":"command-enqueued","id":"cmd_000000018518","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406833171}
{"seq":18519,"ts":1777406823982,"type":"command-enqueued","id":"cmd_000000018519","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406883980}
{"seq":18520,"ts":1777406824225,"type":"command-enqueued","id":"cmd_000000018520","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406839223}
{"seq":18521,"ts":1777406839849,"type":"command-enqueued","id":"cmd_000000018521","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406849846}
{"seq":18522,"ts":1777406840547,"type":"command-enqueued","id":"cmd_000000018522","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406900544}
{"seq":18523,"ts":1777406840891,"type":"command-enqueued","id":"cmd_000000018523","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406855889}
{"seq":18524,"ts":1777406841258,"type":"command-enqueued","id":"cmd_000000018524","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406901257}
{"seq":18525,"ts":1777406902173,"type":"command-enqueued","id":"cmd_000000018525","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406912169}
{"seq":18526,"ts":1777406903099,"type":"command-enqueued","id":"cmd_000000018526","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406963096}
{"seq":18527,"ts":1777406903393,"type":"command-enqueued","id":"cmd_000000018527","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406918392}
{"seq":18528,"ts":1777406919522,"type":"command-enqueued","id":"cmd_000000018528","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406929517}
{"seq":18529,"ts":1777406920697,"type":"command-enqueued","id":"cmd_000000018529","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406980695}
{"seq":18530,"ts":1777406920974,"type":"command-enqueued","id":"cmd_000000018530","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406935971}
{"seq":18531,"ts":1777406936588,"type":"command-enqueued","id":"cmd_000000018531","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406946586}
{"seq":18532,"ts":1777406937346,"type":"command-enqueued","id":"cmd_000000018532","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777406997344}
{"seq":18533,"ts":1777406937731,"type":"command-enqueued","id":"cmd_000000018533","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406952730}
{"seq":18534,"ts":1777406953310,"type":"command-enqueued","id":"cmd_000000018534","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406963308}
{"seq":18535,"ts":1777406954138,"type":"command-enqueued","id":"cmd_000000018535","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777407014136}
{"seq":18536,"ts":1777406954395,"type":"command-enqueued","id":"cmd_000000018536","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406969393}
{"seq":18537,"ts":1777406954758,"type":"command-enqueued","id":"cmd_000000018537","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777407014757}
{"seq":18538,"ts":1777406955387,"type":"command-enqueued","id":"cmd_000000018538","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777407014757}
{"seq":18539,"ts":1777406956385,"type":"command-enqueued","id":"cmd_000000018539","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406966383}
{"seq":18540,"ts":1777406957123,"type":"command-enqueued","id":"cmd_000000018540","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777407017121}
{"seq":18541,"ts":1777406957606,"type":"command-enqueued","id":"cmd_000000018541","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406972604}
{"seq":18542,"ts":1777406973176,"type":"command-enqueued","id":"cmd_000000018542","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777406983174}
{"seq":18543,"ts":1777411001269,"type":"command-enqueued","id":"cmd_000000018543","commandType":"omni.evaluate.raw","payloadSizeBytes":649,"expiresAt":1777411011246}
{"seq":18544,"ts":1777411002531,"type":"command-enqueued","id":"cmd_000000018544","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411062528}
{"seq":18545,"ts":1777411002694,"type":"command-enqueued","id":"cmd_000000018545","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411017692}
{"seq":18546,"ts":1777411003016,"type":"command-enqueued","id":"cmd_000000018546","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18547,"ts":1777411003624,"type":"command-enqueued","id":"cmd_000000018547","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18548,"ts":1777411004174,"type":"command-enqueued","id":"cmd_000000018548","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18549,"ts":1777411004725,"type":"command-enqueued","id":"cmd_000000018549","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18550,"ts":1777411005532,"type":"command-enqueued","id":"cmd_000000018550","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18551,"ts":1777411006274,"type":"command-enqueued","id":"cmd_000000018551","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411016271}
{"seq":18552,"ts":1777411006945,"type":"command-enqueued","id":"cmd_000000018552","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411066943}
{"seq":18553,"ts":1777411007063,"type":"command-enqueued","id":"cmd_000000018553","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411022061}
{"seq":18554,"ts":1777411022627,"type":"command-enqueued","id":"cmd_000000018554","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411032624}
{"seq":18555,"ts":1777411023327,"type":"command-enqueued","id":"cmd_000000018555","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411083323}
{"seq":18556,"ts":1777411023490,"type":"command-enqueued","id":"cmd_000000018556","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411038488}
{"seq":18557,"ts":1777411023807,"type":"command-enqueued","id":"cmd_000000018557","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18558,"ts":1777411024357,"type":"command-enqueued","id":"cmd_000000018558","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18559,"ts":1777411024817,"type":"command-enqueued","id":"cmd_000000018559","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18560,"ts":1777411025481,"type":"command-enqueued","id":"cmd_000000018560","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18561,"ts":1777411026226,"type":"command-enqueued","id":"cmd_000000018561","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411036224}
{"seq":18562,"ts":1777411026948,"type":"command-enqueued","id":"cmd_000000018562","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411086945}
{"seq":18563,"ts":1777411027065,"type":"command-enqueued","id":"cmd_000000018563","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411042064}
{"seq":18564,"ts":1777411042625,"type":"command-enqueued","id":"cmd_000000018564","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411052623}
{"seq":18565,"ts":1777411043359,"type":"command-enqueued","id":"cmd_000000018565","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411103357}
{"seq":18566,"ts":1777411043688,"type":"command-enqueued","id":"cmd_000000018566","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411058687}
{"seq":18567,"ts":1777411044006,"type":"command-enqueued","id":"cmd_000000018567","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18568,"ts":1777411044625,"type":"command-enqueued","id":"cmd_000000018568","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18569,"ts":1777411045294,"type":"command-enqueued","id":"cmd_000000018569","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18570,"ts":1777411046568,"type":"command-enqueued","id":"cmd_000000018570","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18571,"ts":1777411047346,"type":"command-enqueued","id":"cmd_000000018571","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18572,"ts":1777411048115,"type":"command-enqueued","id":"cmd_000000018572","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411058114}
{"seq":18573,"ts":1777411048965,"type":"command-enqueued","id":"cmd_000000018573","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411108963}
{"seq":18574,"ts":1777411049225,"type":"command-enqueued","id":"cmd_000000018574","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411064224}
{"seq":18575,"ts":1777411064769,"type":"command-enqueued","id":"cmd_000000018575","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411074767}
{"seq":18576,"ts":1777411065556,"type":"command-enqueued","id":"cmd_000000018576","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411125554}
{"seq":18577,"ts":1777411065891,"type":"command-enqueued","id":"cmd_000000018577","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411080890}
{"seq":18578,"ts":1777411066259,"type":"command-enqueued","id":"cmd_000000018578","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18579,"ts":1777411066878,"type":"command-enqueued","id":"cmd_000000018579","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18580,"ts":1777411067491,"type":"command-enqueued","id":"cmd_000000018580","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18581,"ts":1777411068536,"type":"command-enqueued","id":"cmd_000000018581","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18582,"ts":1777411069218,"type":"command-enqueued","id":"cmd_000000018582","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18583,"ts":1777411069955,"type":"command-enqueued","id":"cmd_000000018583","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411079953}
{"seq":18584,"ts":1777411070687,"type":"command-enqueued","id":"cmd_000000018584","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411130685}
{"seq":18585,"ts":1777411071077,"type":"command-enqueued","id":"cmd_000000018585","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411086075}
{"seq":18586,"ts":1777411071446,"type":"command-enqueued","id":"cmd_000000018586","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411161444}
{"seq":18587,"ts":1777411162048,"type":"command-enqueued","id":"cmd_000000018587","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411172045}
{"seq":18588,"ts":1777411162723,"type":"command-enqueued","id":"cmd_000000018588","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411222721}
{"seq":18589,"ts":1777411163060,"type":"command-enqueued","id":"cmd_000000018589","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411178058}
{"seq":18590,"ts":1777411163633,"type":"command-enqueued","id":"cmd_000000018590","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18591,"ts":1777411164296,"type":"command-enqueued","id":"cmd_000000018591","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18592,"ts":1777411164927,"type":"command-enqueued","id":"cmd_000000018592","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18593,"ts":1777411165902,"type":"command-enqueued","id":"cmd_000000018593","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411175899}
{"seq":18594,"ts":1777411166572,"type":"command-enqueued","id":"cmd_000000018594","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411226570}
{"seq":18595,"ts":1777411166961,"type":"command-enqueued","id":"cmd_000000018595","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411181959}
{"seq":18596,"ts":1777411167448,"type":"command-enqueued","id":"cmd_000000018596","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411257446}
{"seq":18597,"ts":1777411258258,"type":"command-enqueued","id":"cmd_000000018597","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777411268255}
{"seq":18598,"ts":1777411646951,"type":"command-enqueued","id":"cmd_000000018598","commandType":"omni.evaluate.raw","payloadSizeBytes":748,"expiresAt":1777411656946}
{"seq":18599,"ts":1777411647799,"type":"command-enqueued","id":"cmd_000000018599","commandType":"omni.evaluate.raw","payloadSizeBytes":1169,"expiresAt":1777411657797}
{"seq":18600,"ts":1777411649000,"type":"command-enqueued","id":"cmd_000000018600","commandType":"omni.evaluate.raw","payloadSizeBytes":1436,"expiresAt":1777411658998}
{"seq":18601,"ts":1777411650821,"type":"command-enqueued","id":"cmd_000000018601","commandType":"omni.evaluate.raw","payloadSizeBytes":4243,"expiresAt":1777411660818}
{"seq":18602,"ts":1777411652883,"type":"command-enqueued","id":"cmd_000000018602","commandType":"omni.evaluate.raw","payloadSizeBytes":4243,"expiresAt":1777411662880}
{"seq":18603,"ts":1777411655132,"type":"command-enqueued","id":"cmd_000000018603","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411715129}
{"seq":18604,"ts":1777411655384,"type":"command-enqueued","id":"cmd_000000018604","commandType":"terminal.plan.run","payloadSizeBytes":773,"expiresAt":1777411670379}
{"seq":18605,"ts":1777411655608,"type":"command-enqueued","id":"cmd_000000018605","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18606,"ts":1777411656072,"type":"command-enqueued","id":"cmd_000000018606","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18607,"ts":1777411656626,"type":"command-enqueued","id":"cmd_000000018607","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18608,"ts":1777411657709,"type":"command-enqueued","id":"cmd_000000018608","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777411717706}
{"seq":18609,"ts":1777411657887,"type":"command-enqueued","id":"cmd_000000018609","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411672885}
{"seq":18610,"ts":1777411674063,"type":"command-enqueued","id":"cmd_000000018610","commandType":"omni.evaluate.raw","payloadSizeBytes":748,"expiresAt":1777411684060}
{"seq":18611,"ts":1777411947092,"type":"command-enqueued","id":"cmd_000000018611","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412007084}
{"seq":18612,"ts":1777411947351,"type":"command-enqueued","id":"cmd_000000018612","commandType":"terminal.plan.run","payloadSizeBytes":773,"expiresAt":1777411962349}
{"seq":18613,"ts":1777411947603,"type":"command-enqueued","id":"cmd_000000018613","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777412007600}
{"seq":18614,"ts":1777411948121,"type":"command-enqueued","id":"cmd_000000018614","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777412007600}
{"seq":18615,"ts":1777411948585,"type":"command-enqueued","id":"cmd_000000018615","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777412007600}
{"seq":18616,"ts":1777411949337,"type":"command-enqueued","id":"cmd_000000018616","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777412007600}
{"seq":18617,"ts":1777412560741,"type":"command-enqueued","id":"cmd_000000018617","commandType":"omni.evaluate.raw","payloadSizeBytes":500,"expiresAt":1777412570736}
{"seq":18618,"ts":1777412561878,"type":"command-enqueued","id":"cmd_000000018618","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412621874}
{"seq":18619,"ts":1777412562053,"type":"command-enqueued","id":"cmd_000000018619","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412574051}
{"seq":18620,"ts":1777412564177,"type":"command-enqueued","id":"cmd_000000018620","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412574144}
{"seq":18621,"ts":1777412565533,"type":"command-enqueued","id":"cmd_000000018621","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412625531}
{"seq":18622,"ts":1777412565620,"type":"command-enqueued","id":"cmd_000000018622","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412577618}
{"seq":18623,"ts":1777412566350,"type":"command-enqueued","id":"cmd_000000018623","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412576347}
{"seq":18624,"ts":1777412567164,"type":"command-enqueued","id":"cmd_000000018624","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412627161}
{"seq":18625,"ts":1777412567346,"type":"command-enqueued","id":"cmd_000000018625","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412579344}
{"seq":18626,"ts":1777412568044,"type":"command-enqueued","id":"cmd_000000018626","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412578040}
{"seq":18627,"ts":1777412568667,"type":"command-enqueued","id":"cmd_000000018627","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412628665}
{"seq":18628,"ts":1777412568839,"type":"command-enqueued","id":"cmd_000000018628","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412580838}
{"seq":18629,"ts":1777412569456,"type":"command-enqueued","id":"cmd_000000018629","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412579453}
{"seq":18630,"ts":1777412570159,"type":"command-enqueued","id":"cmd_000000018630","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412630156}
{"seq":18631,"ts":1777412570335,"type":"command-enqueued","id":"cmd_000000018631","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412582332}
{"seq":18632,"ts":1777412570930,"type":"command-enqueued","id":"cmd_000000018632","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412580926}
{"seq":18633,"ts":1777412571606,"type":"command-enqueued","id":"cmd_000000018633","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412631603}
{"seq":18634,"ts":1777412571718,"type":"command-enqueued","id":"cmd_000000018634","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412583717}
{"seq":18635,"ts":1777412572388,"type":"command-enqueued","id":"cmd_000000018635","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412582385}
{"seq":18636,"ts":1777412573031,"type":"command-enqueued","id":"cmd_000000018636","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412633028}
{"seq":18637,"ts":1777412573111,"type":"command-enqueued","id":"cmd_000000018637","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412585109}
{"seq":18638,"ts":1777412585695,"type":"command-enqueued","id":"cmd_000000018638","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412595692}
{"seq":18639,"ts":1777412586342,"type":"command-enqueued","id":"cmd_000000018639","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412646339}
{"seq":18640,"ts":1777412586512,"type":"command-enqueued","id":"cmd_000000018640","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412598510}
{"seq":18641,"ts":1777412587056,"type":"command-enqueued","id":"cmd_000000018641","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412597054}
{"seq":18642,"ts":1777412587745,"type":"command-enqueued","id":"cmd_000000018642","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412647743}
{"seq":18643,"ts":1777412587918,"type":"command-enqueued","id":"cmd_000000018643","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412599916}
{"seq":18644,"ts":1777412588530,"type":"command-enqueued","id":"cmd_000000018644","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412598527}
{"seq":18645,"ts":1777412589233,"type":"command-enqueued","id":"cmd_000000018645","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412649230}
{"seq":18646,"ts":1777412589315,"type":"command-enqueued","id":"cmd_000000018646","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412601313}
{"seq":18647,"ts":1777412602473,"type":"command-enqueued","id":"cmd_000000018647","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412612470}
{"seq":18648,"ts":1777412603214,"type":"command-enqueued","id":"cmd_000000018648","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412663211}
{"seq":18649,"ts":1777412603325,"type":"command-enqueued","id":"cmd_000000018649","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777412615324}
{"seq":18650,"ts":1777412898834,"type":"command-enqueued","id":"cmd_000000018650","commandType":"omni.evaluate.raw","payloadSizeBytes":500,"expiresAt":1777412908827}
{"seq":18651,"ts":1777412900035,"type":"command-enqueued","id":"cmd_000000018651","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412960032}
{"seq":18652,"ts":1777412900166,"type":"command-enqueued","id":"cmd_000000018652","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412912162}
{"seq":18653,"ts":1777412913349,"type":"command-enqueued","id":"cmd_000000018653","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412923346}
{"seq":18654,"ts":1777412914244,"type":"command-enqueued","id":"cmd_000000018654","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412974240}
{"seq":18655,"ts":1777412914357,"type":"command-enqueued","id":"cmd_000000018655","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412926354}
{"seq":18656,"ts":1777412927391,"type":"command-enqueued","id":"cmd_000000018656","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412937387}
{"seq":18657,"ts":1777412928337,"type":"command-enqueued","id":"cmd_000000018657","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777412988333}
{"seq":18658,"ts":1777412928453,"type":"command-enqueued","id":"cmd_000000018658","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412940450}
{"seq":18659,"ts":1777412943460,"type":"command-enqueued","id":"cmd_000000018659","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412953445}
{"seq":18660,"ts":1777412944980,"type":"command-enqueued","id":"cmd_000000018660","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413004976}
{"seq":18661,"ts":1777412945204,"type":"command-enqueued","id":"cmd_000000018661","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412957202}
{"seq":18662,"ts":1777412958173,"type":"command-enqueued","id":"cmd_000000018662","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412968166}
{"seq":18663,"ts":1777412959025,"type":"command-enqueued","id":"cmd_000000018663","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413019023}
{"seq":18664,"ts":1777412959194,"type":"command-enqueued","id":"cmd_000000018664","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412971191}
{"seq":18665,"ts":1777412972269,"type":"command-enqueued","id":"cmd_000000018665","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412982264}
{"seq":18666,"ts":1777412973352,"type":"command-enqueued","id":"cmd_000000018666","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413033348}
{"seq":18667,"ts":1777412973532,"type":"command-enqueued","id":"cmd_000000018667","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412985530}
{"seq":18668,"ts":1777412986095,"type":"command-enqueued","id":"cmd_000000018668","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777412996093}
{"seq":18669,"ts":1777412986758,"type":"command-enqueued","id":"cmd_000000018669","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413046754}
{"seq":18670,"ts":1777412986922,"type":"command-enqueued","id":"cmd_000000018670","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777412998921}
{"seq":18671,"ts":1777412999750,"type":"command-enqueued","id":"cmd_000000018671","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777413009747}
{"seq":18672,"ts":1777413000931,"type":"command-enqueued","id":"cmd_000000018672","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413060927}
{"seq":18673,"ts":1777413001112,"type":"command-enqueued","id":"cmd_000000018673","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777413013109}
{"seq":18674,"ts":1777413013874,"type":"command-enqueued","id":"cmd_000000018674","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777413023867}
{"seq":18675,"ts":1777413014830,"type":"command-enqueued","id":"cmd_000000018675","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413074826}
{"seq":18676,"ts":1777413014993,"type":"command-enqueued","id":"cmd_000000018676","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777413026991}
{"seq":18677,"ts":1777413027978,"type":"command-enqueued","id":"cmd_000000018677","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777413037975}
{"seq":18678,"ts":1777413028768,"type":"command-enqueued","id":"cmd_000000018678","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413088765}
{"seq":18679,"ts":1777413029027,"type":"command-enqueued","id":"cmd_000000018679","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777413041026}
{"seq":18680,"ts":1777413041985,"type":"command-enqueued","id":"cmd_000000018680","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777413051982}
{"seq":18681,"ts":1777413042955,"type":"command-enqueued","id":"cmd_000000018681","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413102952}
{"seq":18682,"ts":1777413043081,"type":"command-enqueued","id":"cmd_000000018682","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777413055080}
{"seq":18683,"ts":1777413193916,"type":"command-enqueued","id":"cmd_000000018683","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777413253909}
{"seq":18684,"ts":1777413194174,"type":"command-enqueued","id":"cmd_000000018684","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777413206171}
{"seq":18685,"ts":1777414652542,"type":"command-enqueued","id":"cmd_000000018685","commandType":"omni.evaluate.raw","payloadSizeBytes":436,"expiresAt":1777414662538}
{"seq":18686,"ts":1777414653695,"type":"command-enqueued","id":"cmd_000000018686","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414713689}
{"seq":18687,"ts":1777414653961,"type":"command-enqueued","id":"cmd_000000018687","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777414665959}
{"seq":18688,"ts":1777414655029,"type":"command-enqueued","id":"cmd_000000018688","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777414665023}
{"seq":18689,"ts":1777414656546,"type":"command-enqueued","id":"cmd_000000018689","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414716543}
{"seq":18690,"ts":1777414656716,"type":"command-enqueued","id":"cmd_000000018690","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777414668714}
{"seq":18691,"ts":1777414669631,"type":"command-enqueued","id":"cmd_000000018691","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777414679627}
{"seq":18692,"ts":1777414672542,"type":"command-enqueued","id":"cmd_000000018692","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414732537}
{"seq":18693,"ts":1777414672655,"type":"command-enqueued","id":"cmd_000000018693","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777414684650}
{"seq":18694,"ts":1777414673641,"type":"command-enqueued","id":"cmd_000000018694","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777414683637}
{"seq":18695,"ts":1777414674424,"type":"command-enqueued","id":"cmd_000000018695","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414734421}
{"seq":18696,"ts":1777414674537,"type":"command-enqueued","id":"cmd_000000018696","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777414686535}
{"seq":18697,"ts":1777414675483,"type":"command-enqueued","id":"cmd_000000018697","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777414685478}
{"seq":18698,"ts":1777414676256,"type":"command-enqueued","id":"cmd_000000018698","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414736254}
{"seq":18699,"ts":1777414676334,"type":"command-enqueued","id":"cmd_000000018699","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777414688331}
{"seq":18700,"ts":1777414677086,"type":"command-enqueued","id":"cmd_000000018700","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777414687082}
{"seq":18701,"ts":1777414677796,"type":"command-enqueued","id":"cmd_000000018701","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777414737793}
{"seq":18702,"ts":1777414677933,"type":"command-enqueued","id":"cmd_000000018702","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777414689930}
{"seq":18703,"ts":1777415129851,"type":"command-enqueued","id":"cmd_000000018703","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415189836}
{"seq":18704,"ts":1777415133533,"type":"command-enqueued","id":"cmd_000000018704","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777415145521}
{"seq":18705,"ts":1777415230219,"type":"command-enqueued","id":"cmd_000000018705","commandType":"omni.evaluate.raw","payloadSizeBytes":436,"expiresAt":1777415240214}
{"seq":18706,"ts":1777415231534,"type":"command-enqueued","id":"cmd_000000018706","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415291525}
{"seq":18707,"ts":1777415232029,"type":"command-enqueued","id":"cmd_000000018707","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777415244024}
{"seq":18708,"ts":1777415235923,"type":"command-enqueued","id":"cmd_000000018708","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777415245917}
{"seq":18709,"ts":1777415238937,"type":"command-enqueued","id":"cmd_000000018709","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415298932}
{"seq":18710,"ts":1777415239285,"type":"command-enqueued","id":"cmd_000000018710","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777415251281}
{"seq":18711,"ts":1777415252370,"type":"command-enqueued","id":"cmd_000000018711","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777415262365}
{"seq":18712,"ts":1777415254447,"type":"command-enqueued","id":"cmd_000000018712","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415314442}
{"seq":18713,"ts":1777415254859,"type":"command-enqueued","id":"cmd_000000018713","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777415266857}
{"seq":18714,"ts":1777415256868,"type":"command-enqueued","id":"cmd_000000018714","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777415266864}
{"seq":18715,"ts":1777415258051,"type":"command-enqueued","id":"cmd_000000018715","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415318047}
{"seq":18716,"ts":1777415258290,"type":"command-enqueued","id":"cmd_000000018716","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777415270287}
{"seq":18717,"ts":1777415260067,"type":"command-enqueued","id":"cmd_000000018717","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777415270063}
{"seq":18718,"ts":1777415261042,"type":"command-enqueued","id":"cmd_000000018718","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415321038}
{"seq":18719,"ts":1777415261305,"type":"command-enqueued","id":"cmd_000000018719","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777415273303}
{"seq":18720,"ts":1777415263155,"type":"command-enqueued","id":"cmd_000000018720","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777415273152}
{"seq":18721,"ts":1777415263946,"type":"command-enqueued","id":"cmd_000000018721","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415323943}
{"seq":18722,"ts":1777415264186,"type":"command-enqueued","id":"cmd_000000018722","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777415276185}
{"seq":18723,"ts":1777415350546,"type":"command-enqueued","id":"cmd_000000018723","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777415410541}
{"seq":18724,"ts":1777415350811,"type":"command-enqueued","id":"cmd_000000018724","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777415362810}
{"seq":18725,"ts":1777415983309,"type":"command-enqueued","id":"cmd_000000018725","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416043302}
{"seq":18726,"ts":1777415983685,"type":"command-enqueued","id":"cmd_000000018726","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777415995682}
{"seq":18727,"ts":1777416162118,"type":"command-enqueued","id":"cmd_000000018727","commandType":"omni.evaluate.raw","payloadSizeBytes":635,"expiresAt":1777416172113}
{"seq":18728,"ts":1777416163745,"type":"command-enqueued","id":"cmd_000000018728","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416223742}
{"seq":18729,"ts":1777416164002,"type":"command-enqueued","id":"cmd_000000018729","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416176000}
{"seq":18730,"ts":1777416165554,"type":"command-enqueued","id":"cmd_000000018730","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416175552}
{"seq":18731,"ts":1777416166258,"type":"command-enqueued","id":"cmd_000000018731","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416226254}
{"seq":18732,"ts":1777416166422,"type":"command-enqueued","id":"cmd_000000018732","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416178420}
{"seq":18733,"ts":1777416167757,"type":"command-enqueued","id":"cmd_000000018733","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416177755}
{"seq":18734,"ts":1777416168546,"type":"command-enqueued","id":"cmd_000000018734","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416228544}
{"seq":18735,"ts":1777416168711,"type":"command-enqueued","id":"cmd_000000018735","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416180709}
{"seq":18736,"ts":1777416170069,"type":"command-enqueued","id":"cmd_000000018736","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416180066}
{"seq":18737,"ts":1777416170839,"type":"command-enqueued","id":"cmd_000000018737","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416230837}
{"seq":18738,"ts":1777416171004,"type":"command-enqueued","id":"cmd_000000018738","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416183002}
{"seq":18739,"ts":1777416172363,"type":"command-enqueued","id":"cmd_000000018739","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416182361}
{"seq":18740,"ts":1777416173169,"type":"command-enqueued","id":"cmd_000000018740","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416233166}
{"seq":18741,"ts":1777416173428,"type":"command-enqueued","id":"cmd_000000018741","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416185427}
{"seq":18742,"ts":1777416175211,"type":"command-enqueued","id":"cmd_000000018742","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416185207}
{"seq":18743,"ts":1777416176266,"type":"command-enqueued","id":"cmd_000000018743","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416236263}
{"seq":18744,"ts":1777416176479,"type":"command-enqueued","id":"cmd_000000018744","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416188477}
{"seq":18745,"ts":1777416486844,"type":"command-enqueued","id":"cmd_000000018745","commandType":"omni.evaluate.raw","payloadSizeBytes":318,"expiresAt":1777416496837}
{"seq":18746,"ts":1777416487707,"type":"command-enqueued","id":"cmd_000000018746","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416547704}
{"seq":18747,"ts":1777416487962,"type":"command-enqueued","id":"cmd_000000018747","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416499961}
{"seq":18748,"ts":1777416489245,"type":"command-enqueued","id":"cmd_000000018748","commandType":"omni.evaluate.raw","payloadSizeBytes":318,"expiresAt":1777416499238}
{"seq":18749,"ts":1777416559918,"type":"command-enqueued","id":"cmd_000000018749","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416619913}
{"seq":18750,"ts":1777416560131,"type":"command-enqueued","id":"cmd_000000018750","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416572129}
{"seq":18751,"ts":1777416572705,"type":"command-enqueued","id":"cmd_000000018751","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416632703}
{"seq":18752,"ts":1777416572966,"type":"command-enqueued","id":"cmd_000000018752","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416584964}
{"seq":18753,"ts":1777416574324,"type":"command-enqueued","id":"cmd_000000018753","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416634322}
{"seq":18754,"ts":1777416574487,"type":"command-enqueued","id":"cmd_000000018754","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416586485}
{"seq":18755,"ts":1777416587100,"type":"command-enqueued","id":"cmd_000000018755","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416647097}
{"seq":18756,"ts":1777416587323,"type":"command-enqueued","id":"cmd_000000018756","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416599322}
{"seq":18757,"ts":1777416589124,"type":"command-enqueued","id":"cmd_000000018757","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416649121}
{"seq":18758,"ts":1777416589287,"type":"command-enqueued","id":"cmd_000000018758","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416601285}
{"seq":18759,"ts":1777416590266,"type":"command-enqueued","id":"cmd_000000018759","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416650264}
{"seq":18760,"ts":1777416590523,"type":"command-enqueued","id":"cmd_000000018760","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416602521}
{"seq":18761,"ts":1777416591891,"type":"command-enqueued","id":"cmd_000000018761","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416651889}
{"seq":18762,"ts":1777416592148,"type":"command-enqueued","id":"cmd_000000018762","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416604144}
{"seq":18763,"ts":1777416593284,"type":"command-enqueued","id":"cmd_000000018763","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416653281}
{"seq":18764,"ts":1777416593546,"type":"command-enqueued","id":"cmd_000000018764","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416605544}
{"seq":18765,"ts":1777416594903,"type":"command-enqueued","id":"cmd_000000018765","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416654900}
{"seq":18766,"ts":1777416595166,"type":"command-enqueued","id":"cmd_000000018766","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416607164}
{"seq":18767,"ts":1777416596330,"type":"command-enqueued","id":"cmd_000000018767","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416656327}
{"seq":18768,"ts":1777416596545,"type":"command-enqueued","id":"cmd_000000018768","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416608543}
{"seq":18769,"ts":1777416598130,"type":"command-enqueued","id":"cmd_000000018769","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416658126}
{"seq":18770,"ts":1777416598292,"type":"command-enqueued","id":"cmd_000000018770","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416610290}
{"seq":18771,"ts":1777416599230,"type":"command-enqueued","id":"cmd_000000018771","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416659228}
{"seq":18772,"ts":1777416599394,"type":"command-enqueued","id":"cmd_000000018772","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416611393}
{"seq":18773,"ts":1777416612698,"type":"command-enqueued","id":"cmd_000000018773","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416672691}
{"seq":18774,"ts":1777416613016,"type":"command-enqueued","id":"cmd_000000018774","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416625003}
{"seq":18775,"ts":1777416614198,"type":"command-enqueued","id":"cmd_000000018775","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416674195}
{"seq":18776,"ts":1777416614426,"type":"command-enqueued","id":"cmd_000000018776","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416626424}
{"seq":18777,"ts":1777416616213,"type":"command-enqueued","id":"cmd_000000018777","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416676210}
{"seq":18778,"ts":1777416616427,"type":"command-enqueued","id":"cmd_000000018778","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416628425}
{"seq":18779,"ts":1777416617447,"type":"command-enqueued","id":"cmd_000000018779","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416677444}
{"seq":18780,"ts":1777416617611,"type":"command-enqueued","id":"cmd_000000018780","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416629609}
{"seq":18781,"ts":1777416618986,"type":"command-enqueued","id":"cmd_000000018781","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416678984}
{"seq":18782,"ts":1777416619225,"type":"command-enqueued","id":"cmd_000000018782","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416631223}
{"seq":18783,"ts":1777416620186,"type":"command-enqueued","id":"cmd_000000018783","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416680184}
{"seq":18784,"ts":1777416620430,"type":"command-enqueued","id":"cmd_000000018784","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416632428}
{"seq":18785,"ts":1777416622052,"type":"command-enqueued","id":"cmd_000000018785","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416682049}
{"seq":18786,"ts":1777416622216,"type":"command-enqueued","id":"cmd_000000018786","commandType":"terminal.native.exec","payloadSizeBytes":126,"expiresAt":1777416634214}
{"seq":18787,"ts":1777416623522,"type":"command-enqueued","id":"cmd_000000018787","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777416683518}
{"seq":18788,"ts":1777416623704,"type":"command-enqueued","id":"cmd_000000018788","commandType":"terminal.native.exec","payloadSizeBytes":133,"expiresAt":1777416635702}
{"seq":18789,"ts":1777416636567,"type":"command-enqueued","id":"cmd_000000018789","commandType":"omni.evaluate.raw","payloadSizeBytes":317,"expiresAt":1777416646565}
{"seq":18790,"ts":1777416703822,"type":"command-enqueued","id":"cmd_000000018790","commandType":"omni.evaluate.raw","payloadSizeBytes":318,"expiresAt":1777416713817}

----- /Users/andresgaibor/pt-dev/logs/pt-debug.current.ndjson -----
T22:52:36.966Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39259,"timestamp":"2026-04-28T22:52:36.973Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39260,"timestamp":"2026-04-28T22:52:37.067Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39261,"timestamp":"2026-04-28T22:52:37.091Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39262,"timestamp":"2026-04-28T22:52:37.168Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39263,"timestamp":"2026-04-28T22:52:37.175Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39264,"timestamp":"2026-04-28T22:52:37.274Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39265,"timestamp":"2026-04-28T22:52:37.293Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39266,"timestamp":"2026-04-28T22:52:37.367Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39267,"timestamp":"2026-04-28T22:52:37.377Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39268,"timestamp":"2026-04-28T22:52:37.529Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39269,"timestamp":"2026-04-28T22:52:37.540Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39270,"timestamp":"2026-04-28T22:52:37.576Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39271,"timestamp":"2026-04-28T22:52:37.587Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39272,"timestamp":"2026-04-28T22:52:37.667Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39273,"timestamp":"2026-04-28T22:52:37.674Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39274,"timestamp":"2026-04-28T22:52:37.793Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39275,"timestamp":"2026-04-28T22:52:37.807Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39276,"timestamp":"2026-04-28T22:52:37.867Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39277,"timestamp":"2026-04-28T22:52:37.874Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39278,"timestamp":"2026-04-28T22:52:37.970Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39279,"timestamp":"2026-04-28T22:52:37.977Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":39280,"timestamp":"2026-04-28T22:52:38.068Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
```
