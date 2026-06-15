// Índice de métodos PT API (Packet Tracer)
// Mapa de métodos por interfaz para validación y introspection

export const PT_API_METHOD_INDEX: Record<string, string[]> = {
  PTIpc: ["network", "appWindow", "systemFileManager", "simulation", "hardwareFactory", "ipcManager", "multiUserManager", "userAppManager", "commandLog", "options"],
  PTAppWindow: ["getActiveWorkspace", "getVersion", "fileNew", "fileOpen", "fileSave", "fileSaveAs", "fileSaveAsPkz", "getClipboardText", "setClipboardText", "openURL", "getWidth", "getHeight", "getX", "getY", "showNormal", "showMaximized", "showMinimized", "setWindowGeometry"],
  PTWorkspace: ["getLogicalWorkspace", "getGeoView", "getRackView", "zoomIn", "zoomOut", "zoomReset", "getEnvironmentTimeInSeconds", "pauseEnvironmentTime", "resumeEnvironmentTime", "resetEnvironment"],
  PTLogicalWorkspace: ["addDevice", "removeDevice", "removeObject", "deleteObject", "createLink", "autoConnectDevices", "deleteLink", "addCluster", "addNote", "addTextPopup", "addRemoteNetwork", "changeNoteText", "setCanvasItemRealPos", "setDeviceCustomImage", "clearLayer", "drawCircle", "drawLine", "getCanvasRectIds", "getCanvasEllipseIds", "getCanvasItemIds", "getCanvasNoteIds", "getRectItemData", "centerOn", "centerOnComponentByName", "devicesAt"],
  PTNetwork: ["getDevice", "getDeviceAt", "getDeviceCount", "getLinkAt", "getLinkCount"],
  PTDevice: ["getName", "setName", "getModel", "getType", "getPower", "setPower", "skipBoot", "getCommandLine", "getPortCount", "getPortAt", "getPort", "addModule", "removeModule", "setDhcpFlag", "getDhcpFlag", "moveToLocation", "moveToLocationCentered", "getX", "getY", "serializeToXml", "getProcess", "getRootModule", "isBooting", "restoreToDefault", "getUpTime", "getSerialNumber"],
  PTModule: ["getSlotCount", "getSlotTypeAt", "getModuleCount", "getModuleAt", "addModuleAt", "removeModuleAt", "getPortCount", "getPortAt", "getOwnerDevice"],
  PTServer: ["enableCip", "disableCip", "enableOpc", "disableOpc", "enableProfinet", "disableProfinet", "addProgrammingSerialOutputs", "clearProgrammingSerialOutputs", "addUserDesktopApp", "removeUserDesktopApp", "isDesktopAvailable"],
  PTAsa: ["addBookmark", "removeBookmark", "getBookmarkCount", "getWebvpnUserManager", "setHostName", "setEnablePassword", "setEnableSecret"],
  PTCloud: ["addPhoneConnection", "addPortConnection", "addSubLinkConnection", "removePortConnection", "removeAllPortConnection", "isDslConnection"],
  PTMcu: ["analogWrite", "digitalWrite", "analogRead", "digitalRead", "getSlotsCount", "getAnalogSlotsCount", "getDigitalSlotsCount", "getComponentAtSlot", "getComponentByName", "enableIec61850", "disableIec61850", "enableGoosePublisherOnPort", "setSubComponentIndex"],
  PTWirelessRouter: ["addNatEntry", "removeNatEntry", "setDMZEntry", "isRemoteManagementEnable"],
  PTSimulation: ["backward", "forward", "resetSimulation", "setSimulationMode", "isSimulationMode", "createFrameInstance", "getCurrentSimTime"],
  PTOptions: ["setAnimation", "setSound", "setHideDevLabel", "setDeviceModelShown", "setMainToolbarShown", "setCliTabHidden"],
  PTCommandLog: ["getLogCount", "getLogAt", "clearLog"],
  PTCommandLine: ["enterCommand", "getPrompt", "getMode", "getCommandInput", "enterChar", "registerEvent", "unregisterEvent"],
  PTPort: ["getName", "getIpAddress", "getSubnetMask", "setIpSubnetMask", "getDefaultGateway", "setDefaultGateway", "getDnsServerIp", "setDnsServerIp", "setDhcpEnabled", "setDhcpClientFlag", "isDhcpClientOn", "setIpv6Enabled", "getIpv6Enabled", "getIpv6Address", "setIpv6AddressAutoConfig", "setv6DefaultGateway", "getv6DefaultGateway", "setv6ServerIp", "getv6ServerIp", "setIpv6Mtu", "getIpv6Mtu", "isPortUp", "isProtocolUp", "isPowerOn", "setPower", "setInboundFirewallService", "getInboundFirewallService", "setMtu", "getMtu", "setIpMtu", "getIpMtu", "getBia", "isEthernetPort", "isWirelessPort", "getBandwidth", "setBandwidth", "getDelay", "setDelay", "isFullDuplex", "setFullDuplex"],
  PTRouterPort: ["getOspfCost", "setOspfCost", "getOspfPriority", "setOspfPriority", "getOspfHelloInterval", "getOspfDeadInterval", "getOspfAuthKey", "getOspfAuthType", "addOspfMd5Key", "removeOspfMd5Key", "addEntryEigrpPassive", "removeEntryEigrpPassive", "isRipPassive", "setRipPassive", "isRipSplitHorizon", "setRipSplitHorizon", "getIpv6Addresses", "addIpv6Address", "getNatMode", "setNatMode", "getAclInID", "setAclInID", "getAclOutID", "setAclOutID", "setZoneMemberName", "getZoneMemberName", "getClockRate", "setClockRate"],
  PTSwitchPort: ["getAccessVlan", "setAccessVlan", "getNativeVlanId", "setNativeVlanId", "getVoipVlanId", "setVoipVlanId", "addTrunkVlans", "removeTrunkVlans", "isAccessPort", "isAdminModeSet", "isNonegotiate", "setNonegotiateFlag", "getPortSecurity", "getStpStatus"],
  PTRoutedSwitchPort: ["isRoutedPort", "setRoutedPort"],
  PTCloudSerialPort: ["addDlci", "removeDlci", "getDlciCount", "getDlciAt"],
  PTCloudPotsPort: ["getPhoneNumber", "setPhoneNumber"],
};