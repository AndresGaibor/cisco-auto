/**
 * CableTypes.ts
 * Tipos de cable soportados por Packet Tracer
 */

export enum CableType {
  COPPER_STRAIGHT = "eStraightThrough",
  COPPER_CROSS = "eCrossOver",
  FIBER = "eFiber",
  SERIAL_DCE = "eSerialDCE",
  SERIAL_DTE = "eSerialDTE",
  CONSOLE = "eConsole",
  COAXIAL = "eCoaxial"
}

export enum LinkMedium {
  COPPER = "eCopper",
  FIBER = "eFiber",
  SERIAL = "eSerial",
  WIRELESS = "eWireless"
}
