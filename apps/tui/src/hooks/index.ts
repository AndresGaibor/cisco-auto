/**
 * @cisco-auto/tui
 * 
 * Hooks para conectar el TUI con el motor de simulación.
 */

export { useSimulator, type UseSimulatorReturn } from './useSimulator';
export { useDeviceList, type UseDeviceListReturn, type DeviceListItem, type DeviceFilterOptions } from './useDeviceList';
export { useEventLog, type UseEventLogReturn, type FormattedEvent, type EventFilterOptions, type EventCategory } from './useEventLog';
