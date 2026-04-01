import { z } from 'zod';
/**
 * PT Control - Event Schemas
 * For events pushed from Packet Tracer to CLI
 */
export declare const PTEventBaseSchema: z.ZodObject<{
    type: z.ZodString;
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type PTEventBase = z.infer<typeof PTEventBaseSchema>;
export declare const InitEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"init">;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RuntimeLoadedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"runtime-loaded">;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ErrorEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"error">;
    id: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    stack: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ResultEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"result">;
    id: z.ZodString;
    ok: z.ZodBoolean;
    value: z.ZodOptional<z.ZodUnknown>;
    output: z.ZodOptional<z.ZodString>;
    parsed: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export declare const DeviceAddedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"device-added">;
    name: z.ZodString;
    model: z.ZodString;
    uuid: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const DeviceRemovedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"device-removed">;
    name: z.ZodString;
    uuid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const LinkCreatedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"link-created">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
    connType: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const LinkDeletedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"link-deleted">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
}, z.core.$strip>;
export declare const CliCommandEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"cli-command">;
    device: z.ZodString;
    prompt: z.ZodString;
    command: z.ZodString;
    resolvedCommand: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CommandStartedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"command-started">;
    device: z.ZodString;
    command: z.ZodString;
}, z.core.$strip>;
export declare const CommandEndedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"command-ended">;
    device: z.ZodString;
    command: z.ZodString;
    status: z.ZodEnum<{
        ok: "ok";
        ambiguous: "ambiguous";
        invalid: "invalid";
        incomplete: "incomplete";
        "not-implemented": "not-implemented";
    }>;
}, z.core.$strip>;
export declare const OutputWrittenEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"output-written">;
    device: z.ZodString;
    output: z.ZodString;
    isDebug: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const PromptChangedEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"prompt-changed">;
    device: z.ZodString;
    prompt: z.ZodString;
    mode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SnapshotEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"snapshot">;
    devices: z.ZodNumber;
    links: z.ZodNumber;
}, z.core.$strip>;
export declare const LogEventSchema: z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"log">;
    level: z.ZodEnum<{
        error: "error";
        debug: "debug";
        info: "info";
        warn: "warn";
    }>;
    message: z.ZodString;
}, z.core.$strip>;
export declare const PTEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"init">;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"runtime-loaded">;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"error">;
    id: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    stack: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"result">;
    id: z.ZodString;
    ok: z.ZodBoolean;
    value: z.ZodOptional<z.ZodUnknown>;
    output: z.ZodOptional<z.ZodString>;
    parsed: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"device-added">;
    name: z.ZodString;
    model: z.ZodString;
    uuid: z.ZodOptional<z.ZodString>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"device-removed">;
    name: z.ZodString;
    uuid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"link-created">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
    connType: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"link-deleted">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"cli-command">;
    device: z.ZodString;
    prompt: z.ZodString;
    command: z.ZodString;
    resolvedCommand: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"command-started">;
    device: z.ZodString;
    command: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"command-ended">;
    device: z.ZodString;
    command: z.ZodString;
    status: z.ZodEnum<{
        ok: "ok";
        ambiguous: "ambiguous";
        invalid: "invalid";
        incomplete: "incomplete";
        "not-implemented": "not-implemented";
    }>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"output-written">;
    device: z.ZodString;
    output: z.ZodString;
    isDebug: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"prompt-changed">;
    device: z.ZodString;
    prompt: z.ZodString;
    mode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"snapshot">;
    devices: z.ZodNumber;
    links: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    ts: z.ZodNumber;
    seq: z.ZodOptional<z.ZodNumber>;
    type: z.ZodLiteral<"log">;
    level: z.ZodEnum<{
        error: "error";
        debug: "debug";
        info: "info";
        warn: "warn";
    }>;
    message: z.ZodString;
}, z.core.$strip>], "type">;
export type PTEvent = z.infer<typeof PTEventSchema>;
export interface PTEventTypeMap {
    'init': z.infer<typeof InitEventSchema>;
    'runtime-loaded': z.infer<typeof RuntimeLoadedEventSchema>;
    'error': z.infer<typeof ErrorEventSchema>;
    'result': z.infer<typeof ResultEventSchema>;
    'device-added': z.infer<typeof DeviceAddedEventSchema>;
    'device-removed': z.infer<typeof DeviceRemovedEventSchema>;
    'link-created': z.infer<typeof LinkCreatedEventSchema>;
    'link-deleted': z.infer<typeof LinkDeletedEventSchema>;
    'cli-command': z.infer<typeof CliCommandEventSchema>;
    'command-started': z.infer<typeof CommandStartedEventSchema>;
    'command-ended': z.infer<typeof CommandEndedEventSchema>;
    'output-written': z.infer<typeof OutputWrittenEventSchema>;
    'prompt-changed': z.infer<typeof PromptChangedEventSchema>;
    'snapshot': z.infer<typeof SnapshotEventSchema>;
    'log': z.infer<typeof LogEventSchema>;
}
export type PTEventType = keyof PTEventTypeMap;
//# sourceMappingURL=pt-events.d.ts.map