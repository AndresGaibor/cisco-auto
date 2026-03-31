/**
 * PT Control - Event Types
 * 
 * @deprecated Import directly from @cisco-auto/types instead
 * This file is kept for backwards compatibility during migration
 */

// Re-export from @cisco-auto/types for backwards compatibility
export {
  PTEventBaseSchema,
  InitEventSchema,
  RuntimeLoadedEventSchema,
  ErrorEventSchema,
  ResultEventSchema,
  DeviceAddedEventSchema,
  DeviceRemovedEventSchema,
  LinkCreatedEventSchema,
  LinkDeletedEventSchema,
  CliCommandEventSchema,
  CommandStartedEventSchema,
  CommandEndedEventSchema,
  OutputWrittenEventSchema,
  PromptChangedEventSchema,
  SnapshotEventSchema,
  LogEventSchema,
  PTEventSchema,
  type PTEventBase,
  type PTEvent,
  type PTEventTypeMap,
  type PTEventType,
} from '@cisco-auto/types';
