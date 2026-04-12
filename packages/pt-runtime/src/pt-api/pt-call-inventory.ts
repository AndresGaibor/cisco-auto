export interface PTCallEntry {
  objectType: string;
  method: string;
  sourceFile: string;
  lines: number[];
  defensive: boolean;
}

export const PT_CALL_INVENTORY: PTCallEntry[] = [
  { objectType: "PTIpc", method: "network", sourceFile: "templates/helpers-template.ts", lines: [290], defensive: false },
  { objectType: "PTIpc", method: "appWindow", sourceFile: "templates/helpers-template.ts", lines: [286], defensive: false },
  { objectType: "PTFileManager", method: "getFileContents", sourceFile: "templates/helpers-template.ts", lines: [264], defensive: false },
  { objectType: "PTFileManager", method: "writePlainTextToFile", sourceFile: "templates/helpers-template.ts", lines: [279], defensive: false },
  { objectType: "PTFileManager", method: "fileExists", sourceFile: "templates/helpers-template.ts", lines: [258], defensive: false },
  { objectType: "PTCommandLine", method: "enterCommand", sourceFile: "templates/runtime-assembly.ts", lines: [], defensive: false },
  { objectType: "PTCommandLine", method: "getPrompt", sourceFile: "templates/runtime-assembly.ts", lines: [], defensive: false },
  { objectType: "PTCommandLine", method: "getMode", sourceFile: "templates/runtime-assembly.ts", lines: [], defensive: false },
  { objectType: "PTCommandLine", method: "getCommandInput", sourceFile: "templates/runtime-assembly.ts", lines: [], defensive: true },
  { objectType: "PTCommandLine", method: "enterChar", sourceFile: "templates/runtime-assembly.ts", lines: [], defensive: true },
  { objectType: "PTCommandLine", method: "registerEvent", sourceFile: "templates/runtime-assembly.ts", lines: [200], defensive: true },
  { objectType: "PTCommandLine", method: "unregisterEvent", sourceFile: "templates/runtime-assembly.ts", lines: [252], defensive: true },
  { objectType: "PTIpc", method: "network", sourceFile: "templates/main-kernel-assembly.ts", lines: [], defensive: false },
  { objectType: "PTIpc", method: "systemFileManager", sourceFile: "templates/main-kernel-assembly.ts", lines: [], defensive: false },
  { objectType: "PTFileManager", method: "getFileContents", sourceFile: "templates/main-kernel-assembly.ts", lines: [], defensive: false },
  { objectType: "PTFileManager", method: "writePlainTextToFile", sourceFile: "templates/main-kernel-assembly.ts", lines: [], defensive: false },
  { objectType: "PTFileManager", method: "fileExists", sourceFile: "templates/main-kernel-assembly.ts", lines: [], defensive: false },
  { objectType: "PTLogicalWorkspace", method: "removeDevice", sourceFile: "templates/device-handlers-template.ts", lines: [68], defensive: true },
  { objectType: "PTLogicalWorkspace", method: "deleteDevice", sourceFile: "templates/device-handlers-template.ts", lines: [68], defensive: true },
  { objectType: "PTLogicalWorkspace", method: "removeObject", sourceFile: "templates/device-handlers-template.ts", lines: [68], defensive: true },
  { objectType: "PTLogicalWorkspace", method: "deleteObject", sourceFile: "templates/device-handlers-template.ts", lines: [68], defensive: true },
  { objectType: "PTLogicalWorkspace", method: "createLink", sourceFile: "templates/device-handlers-template.ts", lines: [343], defensive: false },
  { objectType: "PTLogicalWorkspace", method: "deleteLink", sourceFile: "templates/device-handlers-template.ts", lines: [398], defensive: false },
  { objectType: "PTLogicalWorkspace", method: "addDevice", sourceFile: "templates/device-handlers-template.ts", lines: [395], defensive: false },
  { objectType: "PTNetwork", method: "getDevice", sourceFile: "templates/device-handlers-template.ts", lines: [78, 98, 105, 141, 167, 168, 409, 676, 789, 791], defensive: false },
  { objectType: "PTNetwork", method: "getDeviceAt", sourceFile: "templates/device-handlers-template.ts", lines: [83], defensive: false },
  { objectType: "PTNetwork", method: "getDeviceCount", sourceFile: "templates/device-handlers-template.ts", lines: [79], defensive: false },
  { objectType: "PTDevice", method: "getName", sourceFile: "templates/device-handlers-template.ts", lines: [86], defensive: false },
  { objectType: "PTDevice", method: "getModel", sourceFile: "templates/device-handlers-template.ts", lines: [87, 111, 175, 178, 412], defensive: false },
  { objectType: "PTDevice", method: "getType", sourceFile: "templates/device-handlers-template.ts", lines: [88, 206, 217, 226], defensive: false },
  { objectType: "PTDevice", method: "getPower", sourceFile: "templates/device-handlers-template.ts", lines: [125, 147, 227], defensive: true },
  { objectType: "PTDevice", method: "setPower", sourceFile: "templates/device-handlers-template.ts", lines: [127, 133, 149, 155], defensive: false },
  { objectType: "PTDevice", method: "setName", sourceFile: "templates/device-handlers-template.ts", lines: [47, 100], defensive: false },
  { objectType: "PTDevice", method: "skipBoot", sourceFile: "templates/device-handlers-template.ts", lines: [48, 133, 155, 258, 259], defensive: true },
  { objectType: "PTDevice", method: "addModule", sourceFile: "templates/device-handlers-template.ts", lines: [129], defensive: true },
  { objectType: "PTDevice", method: "removeModule", sourceFile: "templates/device-handlers-template.ts", lines: [150], defensive: true },
  { objectType: "PTDevice", method: "setDhcpFlag", sourceFile: "templates/device-handlers-template.ts", lines: [423, 496], defensive: true },
  { objectType: "PTDevice", method: "getDhcpFlag", sourceFile: "templates/device-handlers-template.ts", lines: [426, 508], defensive: true },
  { objectType: "PTDevice", method: "moveToLocation", sourceFile: "templates/device-handlers-template.ts", lines: [799], defensive: true },
  { objectType: "PTDevice", method: "moveToLocationCentered", sourceFile: "templates/device-handlers-template.ts", lines: [804], defensive: true },
  { objectType: "PTPort", method: "setIpSubnetMask", sourceFile: "templates/device-handlers-template.ts", lines: [474], defensive: false },
  { objectType: "PTPort", method: "isPortUp", sourceFile: "templates/device-handlers-template.ts", lines: [714], defensive: false },
  { objectType: "PTPort", method: "isProtocolUp", sourceFile: "templates/device-handlers-template.ts", lines: [715], defensive: false },
];

export function getCallsForFile(sourceFile: string): PTCallEntry[] {
  return PT_CALL_INVENTORY.filter((entry) => entry.sourceFile === sourceFile);
}

export function getMethodsForObjectType(objectType: string): string[] {
  const methods = new Set<string>();
  for (const entry of PT_CALL_INVENTORY) {
    if (entry.objectType === objectType) {
      methods.add(entry.method);
    }
  }
  return Array.from(methods).sort();
}
