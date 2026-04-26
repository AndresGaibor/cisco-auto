# Runtime Handler Registration

El runtime separa handlers en tres grupos:

## Stable

Archivo:

```
handlers/registration/stable-handlers.ts
```

Se registra por defecto. Incluye operaciones normales:

- dispositivos
- enlaces
- IOS
- PC command prompt
- DHCP
- VLANs
- canvas
- snapshot/inspect
- modules

## Experimental

Archivo:

```
handlers/registration/experimental-handlers.ts
```

No se registra por defecto.

Incluye:

- `__evaluate`
- `omni.evaluate.raw`

Debe habilitarse explícitamente:

```ts
registerRuntimeHandlers({ experimental: true });
```

o por global antes de cargar runtime:

```js
PT_ENABLE_EXPERIMENTAL_HANDLERS = true;
```

## Omni

Archivo:

```
handlers/registration/omni-handlers.ts
```

No se registra por defecto.

Incluye capacidades de introspección amplia o manipulación experimental:

- `siphonAllConfigs`
- `exfiltrateHostFile`
- `skipBoot`
- `siphonDesktopApps`
- `kvStore`
- `cryptoUtils`
- etc.

Debe habilitarse explícitamente:

```ts
registerRuntimeHandlers({ omni: true });
```

o por global antes de cargar runtime:

```js
PT_ENABLE_OMNI_HANDLERS = true;
```

## Regla

Nunca agregar handlers unsafe a `stable-handlers.ts`.
