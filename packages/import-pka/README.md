# import-pka

> ⚠️ **DEPRECATED** — Este paquete está en desuso y no se recomienda para nuevos flujos de trabajo.

## Estado actual

El soporte para archivos `.pka` de Packet Tracer sigue disponible para compatibilidad y migraciones, pero **no se recomienda su uso en nuevos proyectos**. Toda la automatización y control en tiempo real debe realizarse usando [pt-control-v2](../pt-control-v2/) y los flujos YAML declarativos.

- El parser y decodificador de `.pka` se mantiene solo para casos heredados o extracción puntual de topologías.
- No se garantiza soporte futuro ni nuevas funcionalidades.

## Alternativa recomendada

Para nuevos desarrollos y automatización avanzada, usa **pt-control-v2**:

- Control en tiempo real de Packet Tracer desde TypeScript/Bun
- Flujos YAML/JSON validados y reproducibles
- Integración directa con la CLI y skills de IA

Consulta la guía rápida: [`docs/PT_CONTROL_QUICKSTART.md`](../../docs/PT_CONTROL_QUICKSTART.md)

---

## AVISO DE DEPRECACIÓN

> ⚠️ **IMPORTANTE:** El soporte para archivos `.pka` es considerado **LEGACY** y solo debe usarse para migraciones o extracción de topologías antiguas. Para cualquier flujo nuevo, **usa exclusivamente pt-control-v2** y los archivos YAML declarativos.

---

## API (LEGACY)

El código fuente y las funciones de parsing siguen disponibles para compatibilidad, pero no se recomienda su uso directo salvo para migraciones.

---

## @deprecated
Este paquete está deprecado. Usa pt-control-v2 para cualquier flujo nuevo.
