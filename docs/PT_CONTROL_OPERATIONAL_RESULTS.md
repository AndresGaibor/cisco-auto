# PT Control — Operational QA Results Log

> Fuente de verdad para registrar ejecuciones manuales de `bun run pt`.
> 
> Base de referencia: `docs/PT_CONTROL_OPERATIONAL_CHECKLIST.md`
> 
> Convenciones de estado:
> - `PASS` = cumple
> - `WARN` = funciona con degradación o limitación
> - `BLOCKED` = no se puede completar por limitación conocida
> - `N/I` = not implemented
> - `FAIL` = comportamiento incorrecto
> 
> Cada entrada debe incluir, cuando aplique:
> - fecha
> - comando exacto
> - resultado observado
> - causa probable
> - evidencia / captura / log

---

## Baseline conocido

Estos resultados provienen de la sesión QA previa y sirven como referencia histórica.

| Fase | Tests | PASS | FAIL | SKIP / BLOCKED |
|---|---|---:|---:|---:|
| Smoke | 3 | 3 | 0 | 0 |
| Device Lifecycle | 10 | 10 | 0 | 0 |
| Links | 9 | 6 | 0 | 3 |
| Config Host | 5 | 5 | 0 | 0 |
| Config IOS | 8 | 1 | 1 | 6 |
| Show Commands | 7 | 0 | 7 | 0 |
| VLANs | 5 | 2 | 0 | 3 |
| EtherChannel | 3 | 0 | 1 | 2 |
| Routing | 4 | 0 | 1 | 3 |
| Topology | 8 | 2 | 0 | 6 |
| History | 5 | 1 | 0 | 4 |

### Known issues históricas

- `show` commands pueden devolver `raw: ""` por limitación del runtime.
- `device add S1 2960` puede reflejar `2960-24TT` por naming interno de Packet Tracer.
- `link list` / snapshot pueden no reflejar algunos links aunque la creación haya sido exitosa.
- `topology visualize` fue corregido para no exigir argumento obligatorio.

---

## Registro de ejecuciones nuevas

### Formato recomendado por entrada

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | TC-000 | `bun run pt ...` | PASS/WARN/BLOCKED/N/I/FAIL | resumen corto | si aplica | ruta o nota |

---

## Sesión ejecutada 2026-04-12 — Tests de corrección

### Bugs corregidos

| Fecha | ID | Comando | Estado | Observado | Causa probable | Evidencia |
|---|---|---|---|---|---|---|
| 2026-04-12 | TC-CORR-01 | `bun run pt routing ospf add-network --device R1 --network 192.168.10.0/24 --area 0` | PASS | Acepta área 0 correctamente. El parser ahora acepta `0` como entero válido para OSPF. | Bug en parseEnteroObligatorio que rechazaba 0 | salida CLI |
| 2026-04-12 | TC-CORR-02 | `bun run pt results show cmd_000000001979` | PASS | Muestra el resultado correctamente sin error de `join`. | Faltaba importar `join` de `path` en results.ts | salida CLI |
| 2026-04-12 | TC-CORR-03 | `bun run pt device list --json` | PASS | Salida JSON correcta con `--json` global y local. | Conflicto entre flags global/local - ahora accede correctamente al root program | salida CLI |
| 2026-04-12 | TC-CORR-04 | `bun run pt help routing static add` | PASS | Acepta múltiples argumentos posicionales. Muestra "no encontrado" pero sin error de argumentos. | Commander solo aceptaba 2 argumentos - corregido a variádico | salida CLI |

### Cambios realizados

1. **routing.ts**: `parseEnteroObligatorio` cambió `numero <= 0` a `numero < 0` para permitir área 0 en OSPF
2. **results.ts**: Agregó `join` al import de `path`
3. **device/list.ts**: Accede al root program (`device.list.parent.parent`) para obtener flags globales
4. **help.ts**: Cambió argumentos de 2 posicionales fijos a variádicos `[comando...]`

---

## Sesión ejecutada 2026-04-12 — Resumen de resultados

### Resumen de correcciones

| Bug | TC-ID Original | Estado Pre-Corrección | Estado Post-Corrección | Archivo Modificado |
|---|---|---|---|---|
| OSPF area 0 rechazado | TC-072 | FAIL | PASS | `routing.ts` |
| results show ReferenceError | TC-157/158 | FAIL | PASS | `results.ts` |
| device list --json ignorado | TC-159 | FAIL | PASS | `device/list.ts` |
| help con 3 argumentos falla | TC-142/143 | FAIL | PASS | `help.ts` |

### Stats finales

- **Total correcciones**: 4 bugs
- **PASS**: 4
- **FAIL**: 0

---

## Cómo usarlo

1. Ejecuta un caso.
2. Completa la fila correspondiente.
3. Si falla, anota el error exacto en `Observado` y la causa probable.
4. Si está bloqueado o no existe, marca `BLOCKED` o `N/I`.
5. Si quieres, yo puedo ir normalizando tus notas y devolviéndote el resultado en formato limpio.
