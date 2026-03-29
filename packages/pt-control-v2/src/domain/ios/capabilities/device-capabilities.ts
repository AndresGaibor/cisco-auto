export enum IOSFamily {
  ROUTER = "router",
  SWITCH_L2 = "switch_l2",
  SWITCH_L3 = "switch_l3",
  UNKNOWN = "unknown",
}

export function getIosFamilyFromModel(modelId: string): IOSFamily {
  const device = getDeviceModel(modelId);
  return device.family;
}

export interface IosDeviceModel {
  model: string;
  family: IOSFamily;
  displayName: string;
}

const DEVICE_CATALOG: Record<string, IosDeviceModel> = {
  "1941": { model: "1941", family: IOSFamily.ROUTER, displayName: "CISCO1941" },
  "2901": { model: "2901", family: IOSFamily.ROUTER, displayName: "CISCO2901" },
  "2911": { model: "2911", family: IOSFamily.ROUTER, displayName: "CISCO2911" },
  "2921": { model: "2921", family: IOSFamily.ROUTER, displayName: "CISCO2921" },
  "2950-24": { model: "2950-24", family: IOSFamily.SWITCH_L2, displayName: "CISCO2950-24" },
  "2960-24TT": { model: "2960-24TT", family: IOSFamily.SWITCH_L2, displayName: "CISCO2960-24TT" },
  "2960-24TC-L": { model: "2960-24TC-L", family: IOSFamily.SWITCH_L2, displayName: "CISCO2960-24TC-L" },
  "2960-48TC-L": { model: "2960-48TC-L", family: IOSFamily.SWITCH_L2, displayName: "CISCO2960-48TC-L" },
  "2960-48PST-L": { model: "2960-48PST-L", family: IOSFamily.SWITCH_L2, displayName: "CISCO2960-48PST-L" },
  "3560-24PS": { model: "3560-24PS", family: IOSFamily.SWITCH_L3, displayName: "CISCO3560-24PS" },
  "3560-48PS": { model: "3560-48PS", family: IOSFamily.SWITCH_L3, displayName: "CISCO3560-48PS" },
  "3650-24PS": { model: "3650-24PS", family: IOSFamily.SWITCH_L3, displayName: "CISCO3650-24PS" },
  "3650-48PS": { model: "3650-48PS", family: IOSFamily.SWITCH_L3, displayName: "CISCO3650-48PS" },
  "4451": { model: "4451", family: IOSFamily.ROUTER, displayName: "CISCO4451" },
};

export function getDeviceModel(modelId: string): IosDeviceModel {
  const normalized = modelId.toUpperCase();
  return DEVICE_CATALOG[normalized] ?? {
    model: modelId,
    family: IOSFamily.UNKNOWN,
    displayName: `CISCO${modelId.toUpperCase()}`,
  };
}
